import { options } from "./index.js";
import { initializeDB } from "./localDatabase.js";
import { loadNavMenu } from "./views/navMenu.js";

export function safetyMessage() {

  // Create the Bootstrap modal elements
  var modalElement = document.createElement('div');
  modalElement.classList.add('modal', 'fade');
  modalElement.setAttribute('tabindex', '-1');
  modalElement.setAttribute('aria-hidden', 'true');

  var modalDialog = document.createElement('div');
  modalDialog.classList.add('modal-dialog');
  modalElement.appendChild(modalDialog);

  var modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');
  modalDialog.appendChild(modalContent);

  var modalHeader = document.createElement('div');
  modalHeader.classList.add('modal-header');
  modalContent.appendChild(modalHeader);

  var modalTitle = document.createElement('h5');
  modalTitle.classList.add('modal-title');
  modalTitle.innerText = 'Autotune';
  modalHeader.appendChild(modalTitle);

  // var closeButton = document.createElement('button');
  // closeButton.classList.add('btn-close');
  // closeButton.setAttribute('data-bs-dismiss', 'modal');
  // closeButton.setAttribute('aria-label', 'Close');
  // modalHeader.appendChild(closeButton);

  var modalBody = document.createElement('div');
  modalBody.classList.add('modal-body');
  modalBody.innerText = 'Welcome to Autotune. Autotune is an experimental app that is currently under testing. Please consult with your physician before implementing any of the recommendations.';
  modalContent.appendChild(modalBody);

  // Add a modal footer
  var modalFooter = document.createElement('div');
  modalFooter.classList.add('modal-footer');
  modalContent.appendChild(modalFooter);

  // Create the Accept button with primary class
  var acceptButton = document.createElement('button');
  acceptButton.classList.add('btn', 'btn-primary');
  acceptButton.innerText = 'Accept';
  modalFooter.appendChild(acceptButton);

  // Hide the modal when the Accept button is clicked
  acceptButton.addEventListener('click', function() {
    var modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();
  });

  // Add the modal to the document
  document.body.appendChild(modalElement);

  // Create a Bootstrap 5 modal instance and show it
  var modalInstance = new bootstrap.Modal(modalElement);
  modalInstance.show();
}

export function setUser() {
	const currentUser = JSON.parse(localStorage.getItem('autotune_currentUser'));
    if (currentUser) {
      options.user = currentUser.username;
      options.url = currentUser.url;
      options.isf = currentUser.isf;
      options.icr = currentUser.icr;
      options.weight = currentUser.weight;
      if (currentUser.length > 0) {
        initializeDB()
        loadNavMenu()
      }
	}

}
  