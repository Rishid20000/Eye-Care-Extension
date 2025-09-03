// Eye Care Reminder - Background Service Worker

// Timer state
let timerState = {
    isRunning: false,
    timeRemaining: 20 * 60, // Default 20 minutes in seconds
    intervalId: null,
    startTime: null,
    reminderInterval: 20 // minutes
};

// Load settings on startup
chrome.storage.sync.get(['reminderInterval'], function(result) {
    timerState.reminderInterval = result.reminderInterval || 20;
    timerState.timeRemaining = timerState.reminderInterval * 60;
});

// Install event
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('Eye Care Reminder installed:', details.reason);
    
    // Set default storage values (only if they don't exist)
    chrome.storage.sync.get([
        'breaksToday', 
        'screenTimeToday', 
        'lastResetDate', 
        'reminderInterval', 
        'breakDuration', 
        'notificationsEnabled'
    ], function(result) {
        const defaults = {};
        
        if (result.breaksToday === undefined) defaults.breaksToday = 0;
        if (result.screenTimeToday === undefined) defaults.screenTimeToday = 0;
        if (result.lastResetDate === undefined) defaults.lastResetDate = new Date().toDateString();
        if (result.reminderInterval === undefined) defaults.reminderInterval = 20;
        if (result.breakDuration === undefined) defaults.breakDuration = 20;
        if (result.notificationsEnabled === undefined) defaults.notificationsEnabled = true;
        
        // Only set defaults that don't exist
        if (Object.keys(defaults).length > 0) {
            chrome.storage.sync.set(defaults);
        }
        
        // Update timer state with loaded interval
        timerState.reminderInterval = result.reminderInterval || defaults.reminderInterval || 20;
        timerState.timeRemaining = timerState.reminderInterval * 60;
        
        console.log('Timer initialized with interval:', timerState.reminderInterval, 'minutes');
        console.log('Timer remaining:', timerState.timeRemaining, 'seconds');
    });
    
    // Create notification
    chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '👁️ Eye Care Reminder',
        message: 'Your eye care assistant is ready! Click the extension icon to start protecting your vision.'
    }).catch(() => {
        // Fallback notification without icon if image fails
        chrome.notifications.create('welcome-fallback', {
            type: 'basic',
            title: '👁️ Eye Care Reminder',
            message: 'Your eye care assistant is ready! Click the extension icon to start protecting your vision.'
        });
    });
});

// Timer functions
function startTimer() {
    if (timerState.isRunning) return;
    
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    
    timerState.intervalId = setInterval(() => {
        timerState.timeRemaining--;
        
        // Send update to popup if open
        chrome.runtime.sendMessage({
            action: 'updateTimer',
            timeRemaining: timerState.timeRemaining
        }).catch(() => {}); // Ignore errors if popup is closed
        
        // Timer finished
        if (timerState.timeRemaining <= 0) {
            handleTimerEnd();
        }
    }, 1000);
    
    // Update screen time tracking
    updateScreenTime();
}

function pauseTimer() {
    if (!timerState.isRunning) return;
    
    timerState.isRunning = false;
    clearInterval(timerState.intervalId);
}

function resetTimer() {
    timerState.isRunning = false;
    timerState.timeRemaining = timerState.reminderInterval * 60;
    clearInterval(timerState.intervalId);
}

function handleTimerEnd() {
    // Reset timer with current custom interval
    timerState.isRunning = false;
    timerState.timeRemaining = timerState.reminderInterval * 60;
    clearInterval(timerState.intervalId);
    
    // Show break reminder notification
    chrome.notifications.create('breakTime', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '👁️ Time for an Eye Break!',
        message: 'Look at something 20 feet away for 20 seconds. Your eyes will thank you!',
        buttons: [{ title: 'Take Break' }, { title: 'Skip' }]
    }).catch(() => {
        // Fallback notification without icon if image fails
        chrome.notifications.create('breakTime-fallback', {
            type: 'basic',
            title: '👁️ Time for an Eye Break!',
            message: 'Look at something 20 feet away for 20 seconds. Your eyes will thank you!',
            buttons: [{ title: 'Take Break' }, { title: 'Skip' }]
        });
    });
    
    // Send break overlay message to all tabs
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'showBreakOverlay'
            }).catch(() => {}); // Ignore errors for tabs that don't have content script
        });
    });
    
    // Update break statistics
    updateBreakStats();
    
    // Notify popup that timer ended
    chrome.runtime.sendMessage({
        action: 'timerEnded'
    }).catch(() => {});
}

// Update screen time tracking
function updateScreenTime() {
    const updateInterval = setInterval(() => {
        if (!timerState.isRunning) {
            clearInterval(updateInterval);
            return;
        }
        
        chrome.storage.sync.get(['screenTimeToday'], function(result) {
            const newScreenTime = (result.screenTimeToday || 0) + 1;
            chrome.storage.sync.set({ screenTimeToday: newScreenTime });
        });
    }, 60000); // Update every minute
}

// Update break statistics
function updateBreakStats() {
    chrome.storage.sync.get(['breaksToday'], function(result) {
        const newBreakCount = (result.breaksToday || 0) + 1;
        chrome.storage.sync.set({ breaksToday: newBreakCount });
    });
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'startTimer':
            startTimer();
            sendResponse({ success: true });
            break;
            
        case 'pauseTimer':
            pauseTimer();
            sendResponse({ success: true });
            break;
            
        case 'resetTimer':
            resetTimer();
            sendResponse({ success: true });
            break;
            
        case 'getTimerStatus':
            sendResponse({
                isRunning: timerState.isRunning,
                timeRemaining: timerState.timeRemaining
            });
            break;
            
        case 'breakTaken':
            // User took a break
            updateBreakStats();
            sendResponse({ success: true });
            break;
            
        case 'settingsUpdated':
            // Settings have been updated
            timerState.reminderInterval = request.settings.reminderInterval;
            // If timer is not running, update the remaining time for next start
            if (!timerState.isRunning) {
                timerState.timeRemaining = timerState.reminderInterval * 60;
            }
            
            // Notify popup to refresh display
            chrome.runtime.sendMessage({
                action: 'settingsUpdated'
            }).catch(() => {}); // Ignore if popup is closed
            
            sendResponse({ success: true });
            break;
    }
    
    return true; // Keep message channel open for async response
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId === 'breakTime') {
        if (buttonIndex === 0) { // Take Break
            // User chose to take a break
            chrome.notifications.create('breakStarted', {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Great! 👍',
                message: 'Take a 20-second break. Look at something far away and blink naturally.'
            });
            
            // Start break timer
            setTimeout(() => {
                chrome.notifications.create('breakEnded', {
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Break Complete! ✅',
                    message: 'Your eyes are refreshed. Ready to continue working?'
                });
            }, 20000); // 20 seconds
            
        } else if (buttonIndex === 1) { // Skip
            chrome.notifications.clear('breakTime');
        }
    }
});

// Clear notifications when clicked
chrome.notifications.onClicked.addListener(function(notificationId) {
    chrome.notifications.clear(notificationId);
});

// Auto-start reminder when browser becomes active (optional)
chrome.windows.onFocusChanged.addListener(function(windowId) {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        // Browser gained focus - could auto-start timer here
        // For now, we'll let users manually start it
    }
});

// Daily reset of statistics
chrome.alarms.create('dailyReset', { periodInMinutes: 1440 }); // 24 hours

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'dailyReset') {
        chrome.storage.sync.set({
            breaksToday: 0,
            screenTimeToday: 0,
            lastResetDate: new Date().toDateString()
        });
    }
});
