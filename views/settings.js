// import { initializeDB, saveData, getData } from '../localDatabase.js'
import { setUser } from '../load.js';
import { options } from '../index.js';

// let users = [];
// export async function getUsersArray() {
//     try {
//       const userListKey = "user-list";
//       const objectStoreName = "Autotune";
  
//       // Try to get the "user-list" from the local storage
//       const userListData = await getData(objectStoreName, userListKey);
  
//       // If the "user-list" exists in the local storage and is not empty, set users to userListData
//       if (userListData !== null && Array.isArray(userListData) && userListData.length > 0) {
//         const users = userListData;
//         return users;
//       } else {users = []}
//     } catch (error) {
//       console.log("Error getting users array:", error);
//     }   
// }
  
export function loadSettings() {
    console.log('Loading settings')
    // JavaScript code to insert HTML into the "main" div
    var htmlCode = /*html*/
    `
        <div class="container mt-4">
            <h1>Settings</h1>
            <!-- Add drop-down menu for selecting Current User -->
            <div class="mb-3">
                <label for="current-user-select" class="form-label">Current User</label>
                <select class="form-select" id="current-user-select">
                    <option selected>Select a user...</option>
                </select>
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
        </div>
    `
    document.getElementById('main').innerHTML = htmlCode;
 
// Initialize variables
let users = JSON.parse(localStorage.getItem('autotune_users')) || [];
const currentUserSelect = document.getElementById('current-user-select')
let currentUser = JSON.parse(localStorage.getItem('autotune_currentUser')) || [];
currentUserSelect.value = currentUser

$(document).ready(function() {
    // if (!$.fn.DataTable.isDataTable('#userTable')) {
        console.log('Initializing DataTables.js (Responsive extension)...')
      $('#userTable').DataTable({
        // responsive: true,
        searching: false,      // Hide the search box
        lengthChange: false,   // Hide the "Show X entries" drop-down
        ordering: false,       // Disable column ordering
        columnDefs: [
            { targets: 0, visible: true },
            { targets: 1, visible: false },
            { targets: 2, visible: false },
            { targets: 3, visible: false },
            { targets: 4, visible: false }
          ],          
      });
    // }
    // Populate table with users
        if (users.length > 0) {
            populateTable(users);
        }
});

// Get the form and modal elements
const userForm = document.getElementById('userForm');
const userModal = new bootstrap.Modal(document.getElementById('userModal'));
populateCurrentUserSelect(users, currentUser);
// Save button click event
userForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const url = document.getElementById('url').value;
  const isf = document.getElementById('isf').value;
  const icr = document.getElementById('icr').value;
  const weight = document.getElementById('weight').value;

  if (currentUser) {
    users = users.filter((user) => user.username !== currentUser.username);
  }

  users.push({ username, url, isf, icr, weight });
  localStorage.setItem('autotune_users', JSON.stringify(users));
  populateTable(users);
  userModal.hide();
  populateCurrentUserSelect(users, currentUser)
});

// Add event listener to Delete button
document.getElementById('deleteBtn').addEventListener('click', () => {
  users = users.filter((user) => user.username !== currentUser.username);
  localStorage.setItem('autotune_users', JSON.stringify(users));
  populateTable(users);

  userModal.hide();
});

// Function to populate the DataTable with users
function populateTable(users) {
    const dataTable = $('#userTable').DataTable(); // Remove the {retrieve: true} option
    dataTable.clear().rows.add(users.map(user => [
      user.username,
      user.url,
      user.isf,
      user.icr,
      user.weight
    ])).draw();
  };
  

// Add event listener for row click
$('#userTable tbody').on('click', 'tr', function (event) {
    console.log('Row clicked');
  
    if ($(event.target).hasClass('details-control')) {
      return;
    } else {
      let tableData = [];
      $(this).children('td').each(function () {
        tableData.push($(this).text());
      });
  
      currentUser = {
        username: tableData[0],
        // url: tableData[1],
        // isf: tableData[2],
        // icr: tableData[3],
        // weight: tableData[4],
      };
      for (let i = 0; i < users.length; i++) {
        if (users[i].username === currentUser.username) {
          currentUser.url = users[i].url;
          currentUser.isf = users[i].isf;
          currentUser.icr = users[i].icr;
          currentUser.weight = users[i].weight;
          break;
        }
      }

      document.getElementById('username').value = currentUser.username;
      document.getElementById('url').value = currentUser.url;
      document.getElementById('isf').value = currentUser.isf;
      document.getElementById('icr').value = currentUser.icr;
      document.getElementById('weight').value = currentUser.weight;
      document.getElementById('deleteBtn').style.display = 'block';
  
      userModal.show();
    }
  });
  
  // Add event listener for modal hide
  userModal._element.addEventListener('hide.bs.modal', () => {
    currentUser = null;
    userForm.reset();
    document.getElementById('deleteBtn').style.display = 'none';
  });
  
  
  // Function to populate the Current User drop-down menu
  function populateCurrentUserSelect(users, currentUser) {
    const currentUserSelect = document.getElementById('current-user-select');
    const options = ['<option>Select a user...</option>'].concat(users.map(user =>
      `<option value="${user.username}"${currentUser && currentUser.username === user.username ? ' selected' : ''}>${user.username}</option>`
    ));
    currentUserSelect.innerHTML = options.join('');
  
    // currentUserSelect.addEventListener('change', function() {
    //   currentUser = users.find(user => user.username === this.value) || null;
    //   window.currentUser = currentUser; // Make it globally accessible
    //   localStorage.setItem('autotune_currentUser', JSON.stringify(currentUser)); // Save the current user to local storage
    // });
  
    // Add event listener to save selected value to local storage
    currentUserSelect.addEventListener('change', function() {
        console.log('current user saved to local storage: ', this.value)
        const selectedUsername = this.value;
        const selectedUser = users.find(user => user.username === selectedUsername) || null;
        setUser()
    });
  }
}

function setCurrentUserDropDown() {
    const currentUserSelect = document.getElementById('autotune_currentUser').value;
    const currentUser = JSON.parse(localStorage.getItem('')) || [];
    currentUserSelect = currentUser
}