document.addEventListener('DOMContentLoaded', function() {
    const actionBtn = document.getElementById('actionBtn');
    const output = document.getElementById('output');

    actionBtn.addEventListener('click', function() {
        // Get current tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            output.innerHTML = `<p>Current tab: ${currentTab.title}</p>`;
        });
    });

    // Load saved data
    chrome.storage.sync.get(['extensionData'], function(result) {
        if (result.extensionData) {
            output.innerHTML = `<p>Saved data: ${result.extensionData}</p>`;
        }
    });
});
