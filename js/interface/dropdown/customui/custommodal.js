// Get the modal element
const modal = document.getElementById('customModal');
// Get the close button element
const closeBtn = modal.querySelector('.close');
// Get the modal content element
const modalContent = modal.querySelector('.modal-content');
const modalOverlay = modal.querySelector('.modal-overlay');
const modalOverlayCloseBtn = modalOverlay.querySelector('.modal-overlay-close');
const modalOverlayBody = modalOverlay.querySelector('.modal-overlay-body');

// Function to store input values and perform modal-specific actions
const storeInputValue = debounce(function (input, contentId) {
    if (input.type === 'checkbox') {
        modalInputValues[input.id] = input.checked;
    } else {
        modalInputValues[input.id] = input.value;
    }
    localStorage.setItem('modalInputValues', JSON.stringify(modalInputValues));

    // Perform modal-specific actions based on contentId
    if (contentId === 'noteModal') {
        updatePathOptions();
    }
    // Add more conditions for other modals if needed
}, 100);

let currentOpenModalContentId = null;

// Function to open the modal
function openModal(contentId) {
    hideContextMenu();
    //console.log(`Opened Modal: ${contentId}`);

    // Clear filepath input from header.
    const existingInput = document.querySelector('.modal-filepath-input');
    if (existingInput) {
        existingInput.remove();
    }

    const content = document.getElementById(contentId);
    if (!content) {
        console.error(`No content found for ID: ${contentId}`);
        return; // Exit the function if content doesn't exist
    }

    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = content.innerHTML; // Ensure modalBody exists before setting its innerHTML
    } else {
        console.error('Modal body element is missing');
        return; // Exit if there is no modal body
    }

    // Set the modal title based on the contentId
    const modalTitle = modal.querySelector('.modal-title');
    switch (contentId) {
        case 'noteModal':
            modalTitle.textContent = 'Zettelkasten Settings';
            initializeTagInputs();
            break;
        case 'aiModal':
            modalTitle.textContent = 'Ai Controls';
            break;
        case 'alertModal':
            modalTitle.textContent = 'Alert';
            break;
        case 'apiConfigModalContent':
            modalTitle.textContent = 'Custom Endpoint';
            break;
        case 'importLinkModalContent':
            modalTitle.textContent = 'Import';
            break;
        case 'nodeConnectionModal':
            modalTitle.textContent = 'Connect Notes';
            break;
        case 'ollamaManagerModal':
            modalTitle.textContent = 'Ollama Library';
            break;
        case 'vectorDbModal':
            modalTitle.textContent = 'Vector Database';
            break;
        case 'vectorDbSearchModal':
            modalTitle.textContent = 'Search Vector-DB';
            break;
        case 'vectorDbImportConfirmModal':
            modalTitle.textContent = 'Confirm Vector DB Import';
            setupVectorDbImportConfirmModal();
            break;
        case 'zetSearchModal':
            modalTitle.textContent = 'Search Notes';
            break;
        case 'promptLibraryModalContent':
            modalTitle.textContent = 'Prompt Library';
            break;
        case 'controls-modal':
            modalTitle.textContent = 'Adjust Controls';
            break;
        case 'neurite-modal':
            modalTitle.textContent = 'Neurite';
            break;
        default:
            modalTitle.textContent = ''; // Default, clears the title
    }

    currentOpenModalContentId = contentId;

    modal.style.display = 'flex';

    // Set up custom selects within the modal
    let modalSelects = modalBody.querySelectorAll('select.custom-select');
    modalSelects.forEach(select => {
        setupModelSelect(select);
        // Restore the stored value if available
        if (modalInputValues[select.id] !== undefined) {
            select.value = modalInputValues[select.id];
        }
        // Store the value when changed
        select.addEventListener('change', function () {
            storeInputValue(select, contentId);
        });
    });

    // Set up sliders within the modal
    let modalSliders = modalBody.querySelectorAll('input[type=range]');
    modalSliders.forEach(function (slider) {
        setSliderBackground(slider);
        // Restore the stored value if available
        if (modalInputValues[slider.id] !== undefined) {
            slider.value = modalInputValues[slider.id];
            setSliderBackground(slider); // Update the background after restoring the value
        }
        // Store the value when changed
        slider.addEventListener('input', function () {
            setSliderBackground(slider);
            storeInputValue(slider, contentId);
        });
    });

    // Set up other input elements within the modal
    let modalInputs = modalBody.querySelectorAll('input:not([type=range]), textarea');
    modalInputs.forEach(function (input) {
        // Skip file inputs
        if (input.type === 'file') {
            return;
        }

        // Restore the stored value if available
        if (modalInputValues[input.id] !== undefined) {
            if (input.type === 'checkbox') {
                input.checked = modalInputValues[input.id];
            } else {
                input.value = modalInputValues[input.id];
            }
        }
        // Store the value when changed
        input.addEventListener('input', function () {
            storeInputValue(input, contentId);
        });
    });
}

function getModalState(modalId, itemId, defaultValue = true) {
    // Use the correct key for retrieving modal values
    const modalStates = JSON.parse(localStorage.getItem('modalInputValues') || '{}');

    // Check if the item exists in the saved states, return defaultValue if it doesn't exist
    return modalStates[itemId] !== undefined ? modalStates[itemId] : defaultValue;
}

// Function to close the modal
function closeModal() {
    switch (currentOpenModalContentId) {
        case 'zetSearchModal':
        case 'nodeConnectionModal':
            clearSearch();
            break;
        case 'vectorDbImportConfirmModal':
            if (window.currentVectorDbImportReject) {
                window.currentVectorDbImportReject(new Error('User cancelled the operation'));
                window.currentVectorDbImportReject = null;
            }
            break;
        // Add more cases for other modals if needed
        default:
            break;
    }
    closeModalOverlay();
    modal.style.display = 'none';
    currentOpenModalContentId = null; // Reset the current content ID
}

// Event listener for the close button
closeBtn.addEventListener('click', closeModal);

// Function to open the generic overlay with specific content
function openModalOverlay(explanationId) {
    const explanationContent = document.getElementById(explanationId);
    if (!explanationContent) {
        console.error(`No explanation found for ID: ${explanationId}`);
        return;
    }

    // Populate the overlay with the explanation content
    modalOverlayBody.innerHTML = explanationContent.innerHTML;

    modalOverlay.style.display = 'block';
}


// Function to close the generic overlay
function closeModalOverlay() {
    modalOverlay.style.display = 'none';
    modalOverlayBody.innerHTML = ''; // Clear the overlay content
}

// Event listener for closing the overlay
modalOverlayCloseBtn.addEventListener('click', closeModalOverlay);




// Event listener to prevent all events from passing through the modal content
modalContent.addEventListener('click', stopEventPropagation);
modalContent.addEventListener('dblclick', stopEventPropagation);
modalContent.addEventListener('mousedown', stopEventPropagation);
modalContent.addEventListener('touchstart', stopEventPropagation);
modalContent.addEventListener('touchend', stopEventPropagation);
modalContent.addEventListener('wheel', stopEventPropagation);
modalContent.addEventListener('dragstart', stopEventPropagation);
modalContent.addEventListener('drag', stopEventPropagation);
modalContent.addEventListener('drop', stopEventPropagation);

// Function to stop event propagation
function stopEventPropagation(event) {
    event.stopPropagation();
}

// Function to check if an element is an input element
function isInputElement(element) {
    const inputTypes = ['input', 'select', 'textarea', 'button'];
    return inputTypes.includes(element.tagName.toLowerCase()) ||
        element.classList.contains('custom-select') ||
        element.closest('.vdb-search-result') ||
        element.closest('#modal-file-tree-container'); // Added condition
}

// Variables to store the initial position and mouse offset
let isDraggingModal = false;
let initialModalMouseX;
let initialModalMouseY;
let initialModalX;
let initialModalY;

// Track modal height before changes
let modalHeightBeforeChange = null;

// Event listener for mousedown on the modal content
modalContent.addEventListener('mousedown', startDragging);

// Function to start dragging the modal content
function startDragging(event) {
    if (!isInputElement(event.target)) {
        isDraggingModal = true;
        initialModalMouseX = event.clientX;
        initialModalMouseY = event.clientY;
        initialModalX = modal.offsetLeft;
        initialModalY = modal.offsetTop;

        // Capture the current modal height
        modalHeightBeforeChange = modalContent.offsetHeight;

        // Listen for mouse movement and update modal position
        document.addEventListener('mousemove', dragModalContent);
    }
}

// Function to drag the modal content
function dragModalContent(event) {
    if (isDraggingModal) {
        event.preventDefault();
        const deltaX = event.clientX - initialModalMouseX;
        const deltaY = event.clientY - initialModalMouseY;
        modal.style.left = `${initialModalX + deltaX}px`;
        modal.style.top = `${initialModalY + deltaY}px`;
    }
}

// Event listener to stop dragging and fix the modal position
document.addEventListener('mouseup', stopDragging);

function stopDragging() {
    isDraggingModal = false;

    // Remove the mousemove listener when drag stops
    document.removeEventListener('mousemove', dragModalContent);
}

// Function to dynamically update the modal height without changing the top position
function adjustModalHeight(newHeight) {
    const modalTop = modal.offsetTop;

    // Set the new height for the modal content
    modalContent.style.height = `${newHeight}px`;

    // Ensure the top position remains unchanged
    modal.style.top = `${modalTop}px`;
}