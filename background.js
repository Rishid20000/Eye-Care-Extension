// Background service worker for Chrome extension

// Install event
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('Extension installed:', details.reason);
    
    // Set default storage values
    chrome.storage.sync.set({
        extensionData: 'Hello from background!'
    });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getData') {
        chrome.storage.sync.get(['extensionData'], function(result) {
            sendResponse({data: result.extensionData});
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'setData') {
        chrome.storage.sync.set({extensionData: request.data}, function() {
            sendResponse({success: true});
        });
        return true;
    }
});

// Handle tab updates (optional)
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
    }
});
