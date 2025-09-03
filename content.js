// Content script - runs on web pages

console.log('My Extension content script loaded!');

// Example: Add a floating button to the page
function createFloatingButton() {
    const button = document.createElement('button');
    button.innerText = 'My Extension';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '10000';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#4285f4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '12px';
    
    button.addEventListener('click', function() {
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'getData'
        }, function(response) {
            alert('Extension data: ' + response.data);
        });
    });
    
    document.body.appendChild(button);
}

// Wait for page to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
} else {
    createFloatingButton();
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'highlightPage') {
        document.body.style.backgroundColor = 'yellow';
        setTimeout(() => {
            document.body.style.backgroundColor = '';
        }, 1000);
        sendResponse({success: true});
    }
});
