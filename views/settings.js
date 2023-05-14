import { setCurrentUser } from '../load.js';

export function loadSettings() {
//   console.log('Loading settings')
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
                        <th data-priority="3">Target BG</th>
                        <th data-priority="4">Low Target BG</th>
                        <th data-priority="5">Weight</th>
                        <th data-priority="6">Adjustment Factor</th>
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
                </div>
                <form id="userForm">
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="username" class="form-label" style="font-weight: bold;">Username</label>
                            <input type="text" class="form-control" id="username" required>
                        </div>
                        <div class="mb-3">
                            <label for="url" class="form-label" style="font-weight: bold;">URL</label>
                            <input type="text" placeholder="https://yoursite.com" class="form-control" id="url" autocorrect="off" autocomplete="off" autocapitalize="none" required>
                        </div>
                        <div class="mb-3">
                            <label for="targetBG" class="form-label" style="font-weight: bold;">Target BG</label>
                            <input type="number" class="form-control" id="targetBG" required>
                        </div>
                        <div class="mb-3">
                            <label for="lowTargetBG" class="form-label" style="font-weight: bold;">Low Target BG</label>
                            <input type="number" class="form-control" id="lowTargetBG" required>
                        </div>
                        <div class="mb-3">
                            <label for="weight" class="form-label" style="font-weight: bold;">Weight in kg</label>
                            <input type="number" class="form-control" id="weight" required>
                        </div>
                        <div class="mb-3">
                            <p>Autotune is programmed using glucose infusion rates for patients in a hospital setting. Below are options to adjust Autotunes recommendations to your indivdual needs. Consider starting with a more conservative selections.</p>
                            <p>The duration of insulin activity (how long delivered insulin will have an impact blood glucose) varies upon the amount of insulin delivered. Choosing the longer options will cause Autotune to recommend less changes to insulin adjustments when calculating basal rates. Insulin to Carb and Insulin Sensitivity Factor calculations are not affected by the settings below.</p>
                            <label for="diaAdjustment" class="form-label" style="font-weight: bold;">Duration of Insulin Activity</label>
                            <select class="form-control" id="diaAdjustment" required>
                                <option value="0.6">Longest</option>
                                <option value="0.7">Longest</option>
                                <option value="0.8" selected>Average</option>
                                <option value="0.9">Shorter</option>
                                <option value="1.0">Shortest</option>
                            </select><br>
                            <p>The "Recommedation Adjustment Factor" allows users adjust how much of Autotune's recommendation should be implemented when calculating basal rates. Selecting "Less" and "Least" will cause Autotune to recommend less insulin adjustments.</p>
                            <label for="adjustmentFactor" class="form-label" style="font-weight: bold;">Recommendation Adjustment Factor</label>
                            <select class="form-control" id="adjustmentFactor" required>
                                <option value="0.4">Least</option>
                                <option value="0.5">Less</option>
                                <option value="0.6" selected>Average</option>
                                <option value="0.75">More</option>
                                <option value="1.0">Most</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="row w-100">
                            <div class="col-12 text-center mb-2">
                                <p>Click the save button to enable user access to Autotune.</p>
                            </div>
                            <div class="col-12 d-flex justify-content-end">
                                <button type="button" class="btn btn-danger me-2" id="deleteBtn" style="display: none;">Delete</button>
                                <button type="submit" class="btn btn-primary" id="saveBtn">Save</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
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
                { targets: 4, visible: false },
                { targets: 5, visible: false },
                { targets: 6, visible: false },
            ],
            columns: [
                { title: "Select user" }, // specify the title property for the first column
                null, // leave the title property for the remaining columns null
                null,
                null,
                null,
                null,
                null,
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
            document.getElementById('targetBG').value = '';
            document.getElementById('lowTargetBG').value = '';
            document.getElementById('weight').value = '';
            document.getElementById('adjustmentFactor').value = '0.5';
            document.getElementById('diaAdjustment').value = '0.55';
            document.getElementById('deleteBtn').style.display = 'none';
        }        
        // Create a new parent container
        const tableControls = document.createElement('div');
        tableControls.className = 'table-controls';

        // Get the #userTable_info and #userTable_paginate elements
        const userTableInfo = document.getElementById('userTable_info');
        const userTablePaginate = document.getElementById('userTable_paginate');

        // Move the elements inside the new parent container
        tableControls.appendChild(userTableInfo);
        tableControls.appendChild(userTablePaginate);

        // Insert the new parent container after the #userTable element
        const userTable = document.getElementById('userTable');
        userTable.parentNode.insertBefore(tableControls, userTable.nextSibling);

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
            let usersList = localStorage.getItem('autotune_users');
            let users = usersList ? JSON.parse(usersList) : [];
            
            let username = tableData[0];
            let currentUser = users.find(user => user.username === username);
            localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser));
            
            if (currentUser) {
                tableData[1] = currentUser.url;
                tableData[2] = currentUser.targetBG;
                tableData[3] = currentUser.lowTargetBG;
                tableData[4] = currentUser.weight;
                tableData[5] = currentUser.diaAdjustment;
                tableData[6] = currentUser.adjustmentFactor;
            } else {
                console.log('User not found');
            }

            // Save the current user to local storage
            document.getElementById('username').value = currentUser.username;
            document.getElementById('url').value = currentUser.url;
            document.getElementById('targetBG').value = currentUser.targetBG;
            document.getElementById('lowTargetBG').value = currentUser.lowTargetBG;
            document.getElementById('weight').value = currentUser.weight;
            document.getElementById('diaAdjustment').value = currentUser.diaAdjustment;
            document.getElementById('adjustmentFactor').value = currentUser.adjustmentFactor;
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
        let url = document.getElementById('url').value;
   		if (url.endsWith('/')) {
		  url = url.slice(0, -1);
		}
        const targetBG = document.getElementById('targetBG').value;
        const lowTargetBG = document.getElementById('lowTargetBG').value;
        const weight = document.getElementById('weight').value;
        const adjustmentFactor = document.getElementById('adjustmentFactor').value;
        const diaAdjustment = document.getElementById('diaAdjustment').value;
        users = users.filter((user) => user.username !== username);

        users.push({ username, url, targetBG, lowTargetBG, weight, adjustmentFactor, diaAdjustment });
        localStorage.setItem('autotune_users', JSON.stringify(users));
        let currentUser = { username, url, targetBG, lowTargetBG, weight, adjustmentFactor, diaAdjustment}
        setCurrentUser(currentUser);
        //   localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser));
        document.getElementById('current-user-select').innerHTML = username;
        userModal.hide();
        populateTable(users);
        window.location.reload();
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
        const rowData = users.map(user => [
            user.username,
            user.url,
            user.targetBG,
            user.lowTargetBG,
            user.weight,
            user.adjustmentFactor,
            user.diaAdjustment
        ]);
        dataTable.clear().rows.add(rowData).draw();
    };
    
};