import { setCurrentUser } from '../load.js';
import { loadNavMenu } from './navMenu.js';
import { getUserProfiles } from '../nightscout_data/getProfileData.js';
import { closeDB } from '../localDatabase.js';

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
                        <h5 class="modal-title">Autotune User</h5>
                        <!--<button type="button" class="btn-close" data-bs-dismiss="modal"></button>-->
                    </div>
                    <form id="userForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="url" class="form-label">URL</label>
                                <input type="text" placeholder="https://yoursite.com" class="form-control" id="url" required>
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
                            <label for="weight" class="form-label">Weight in kg</label>
                            <input type="number" class="form-control" id="weight" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <p>Click the save button to enable user access to Autotune.</p>
                        <button type="button" class="btn btn-danger" id="deleteBtn" style="display: none;">Delete</button>
                        <!--<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>-->
                        <button type="submit" class="btn btn-primary" id="saveBtn">Save</button>
                    </div>
                </form>
            </div>
        </div>
    `
    document.getElementById('main').innerHTML = htmlCode;

    let users = JSON.parse(localStorage.getItem('autotune_users')) || [];

    $(document).ready(function() {
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

        document.getElementById('add-user').addEventListener('click', () => {
            clearUserForm();
        });

        function clearUserForm() {
            document.getElementById('username').value = '';
            document.getElementById('url').value = '';
            document.getElementById('isf').value = '';
            document.getElementById('icr').value = '';
            document.getElementById('weight').value = '';
            document.getElementById('deleteBtn').style.display = 'none';
        }        
    
    });

    let currentUser = JSON.parse(localStorage.getItem('autotune_currentUser')) || [];

    $('#userTable tbody').on('click', 'tr', async function (event) {
        if ($(event.target).hasClass('details-control')) {
            return;
        } else {
            let tableData = [];
            $(this).children('td').each(function () {
                tableData.push($(this).text());
            });
            localStorage.removeItem('autotune_currentUser');
            await closeDB()
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

// This code defines a function `loadSettings()` that loads the settings page for an application called "Autotune". The settings page allows users to add, edit, and delete user accounts, which consist of a username, URL, ISF, ICR, and weight. It uses the Bootstrap CSS framework and the DataTables.js library (with the Responsive extension) to create and manage a responsive table displaying the user accounts.

// The `loadSettings()` function first sets the `innerHTML` of the element with ID 'main' to the settings page HTML code. It then reads the saved user accounts from the browser's local storage, initializes the DataTables.js library, and populates the table with the saved user accounts.

// Event listeners are added for various interactions on the page, such as adding a new user, selecting a user from the table, and saving or deleting a user. When a user is saved, the user account data is saved to local storage, and the table is updated. When a user is deleted, the user account data is removed from local storage, and the table is updated accordingly.

// The `populateTable()` function takes an array of user accounts and populates the DataTables.js table with the data. The `setCurrentUser()` function is imported from another module and sets the current user in the application.

// Overall, this code provides a functional settings page for managing user accounts in an Autotune application.
