import { setCurrentUser } from '../load.js';
import { loadNavMenu } from './navMenu.js';

export function loadSettings() {
  console.log('Loading settings')
  var htmlCode = /*html*/
  `
        <div class="container mt-4">
            <h1>Settings</h1>
            <!-- Add drop-down menu for selecting Current User -->
            <div class="mb-3">
                <label for="current-user-select" class="form-label">Current User</label>
                <span class="form-control" id="current-user-select">Add or select user below...</span>
                <button id="add-user" type="button" class="btn btn-primary mb-3" data-bs-toggle="modal" data-bs-target="#userModal">Add user</button>
                <div>
                    <table id="userTable" class="table table-striped">
                    <thead>
                        <tr>
                        <th data-priority="1">Username</th>
                        <th data-priority="2">URL</th>
                        <th data-priority="3">ISF</th>
                        <th data-priority="4">ICR</th>
                        <th data-priority="5">Weight</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- User Modal -->
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="userForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="url" class="form-label">URL</label>
                                <input type="text" class="form-control" id="url" required>
                            </div>
                            <div class="mb-3">
                                <label for="isf" class="form-label">ISF</label>
                                <input type="number" class="form-control" id="isf" required>
                            </div>
                            <div class="mb-3">
                                <label for="icr" class="form-label">ICR</label>
                                <input type="number" class="form-control" id="icr" required>
                            </div>
                            <div class="mb-3">
                            <label for="weight" class="form-label">Weight</label>
                            <input type="number" class="form-control" id="weight" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" id="deleteBtn" style="display: none;">Delete</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary" id="saveBtn">Save</button>
                    </div>
                </form>
            </div>
        </div>
    `
    document.getElementById('main').innerHTML = htmlCode;

    let users = JSON.parse(localStorage.getItem('autotune_users')) || [];

    $(document).ready(function() {
    console.log('Initializing DataTables.js (Responsive extension)...')
    $('#userTable').DataTable({
        searching: false,
        lengthChange: false,
        ordering: "asc",
        columnDefs: [
            { targets: 0, visible: true },
            { targets: 1, visible: false },
            { targets: 2, visible: false },
            { targets: 3, visible: false },
            { targets: 4, visible: false }
        ],
        columns: [
            { title: "Select user" }, // specify the title property for the first column
            null, // leave the title property for the remaining columns null
            null,
            null,
            null
        ]
    });
    

    if (users.length > 0) {
        populateTable(users);
    }
    });

    let currentUser = JSON.parse(localStorage.getItem('autotune_currentUser')) || [];

    $('#userTable tbody').on('click', 'tr', function (event) {
        if ($(event.target).hasClass('details-control')) {
            return;
        } else {
            let tableData = [];
            $(this).children('td').each(function () {
                tableData.push($(this).text());
            });

            let usersList = localStorage.getItem('autotune_users');
            let users = usersList ? JSON.parse(usersList) : [];
            
            let username = tableData[0];
            let currentUser = users.find(user => user.username === username);
            localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser));
            
            if (currentUser) {
                tableData[1] = currentUser.url;
                tableData[2] = currentUser.isf;
                tableData[3] = currentUser.icr;
                tableData[4] = currentUser.weight;
            } else {
                console.log('User not found');
            }

            // Save the current user to local storage
            document.getElementById('username').value = currentUser.username;
            document.getElementById('url').value = currentUser.url;
            document.getElementById('isf').value = currentUser.isf;
            document.getElementById('icr').value = currentUser.icr;
            document.getElementById('weight').value = currentUser.weight;
            document.getElementById('deleteBtn').style.display = 'block';
            // localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser));
            userModal.show();
        }
    });

    const userForm = document.getElementById('userForm');
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));

    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const url = document.getElementById('url').value;
        const isf = document.getElementById('isf').value;
        const icr = document.getElementById('icr').value;
        const weight = document.getElementById('weight').value;
        users = users.filter((user) => user.username !== username);

        users.push({ username, url, isf, icr, weight });
        localStorage.setItem('autotune_users', JSON.stringify(users));
        let currentUser = { username, url, isf, icr, weight}
        // console.log('currentUser:', currentUser)
        setCurrentUser(currentUser);
        //   localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser));
        document.getElementById('current-user-select').innerHTML = username;
        userModal.hide();
        populateTable(users);
        loadNavMenu()
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
        document.getElementById('current-user-select').innerHTML = 'Add or select user below...';
        let currentUser = localStorage.getItem('autotune_currentUser');
        currentUser = currentUser ? JSON.parse(currentUser) : [];
        console.log('Deleting user account:', currentUser.username)
        users = users.filter((user) => user.username !== currentUser.username);
        localStorage.setItem('autotune_users', JSON.stringify(users));
        userModal.hide();
        populateTable(users);
        currentUser = null;
        setCurrentUser(currentUser);
    });

    function populateTable(users) {
    const dataTable = $('#userTable').DataTable();
    dataTable.clear().rows.add(users.map(user => [
        user.username,
        user.url,
        user.isf,
        user.icr,
        user.weight
    ])).draw();
    };
};
