document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const timerStatus = document.getElementById('timerStatus');
    const timerDisplay = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const breaksToday = document.getElementById('breaksToday');
    const screenTime = document.getElementById('screenTime');
    const dailyTip = document.getElementById('dailyTip');
    const settingsBtn = document.getElementById('settingsBtn');
    const postureBtn = document.getElementById('postureBtn');

    // Timer state
    let timeRemaining = 20 * 60; // Default 20 minutes in seconds
    let isRunning = false;
    let isPaused = false;
    let reminderInterval = 20; // Default interval in minutes

    // Eye care tips array
    const eyeCareTips = [
        "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
        "Blink frequently to keep your eyes moist. We blink less when staring at screens.",
        "Adjust your screen brightness to match your surroundings.",
        "Position your screen 20-26 inches away from your eyes.",
        "Use artificial tears if your eyes feel dry.",
        "Take longer breaks every hour - stand up and walk around.",
        "Ensure good lighting in your workspace to reduce glare.",
        "Consider blue light filtering glasses or software."
    ];

    // Posture tips array
    const postureTips = [
        "Keep your feet flat on the floor and your back straight.",
        "Position your monitor at eye level to avoid neck strain.",
        "Keep your shoulders relaxed and elbows at 90-degree angles.",
        "Use a chair that supports your lower back.",
        "Take micro-breaks to stretch your neck and shoulders."
    ];

    // Initialize popup
    function init() {
        loadStats();
        setRandomTip();
        loadSettings(); // This now handles timer status too
    }
    
    // Load settings
    function loadSettings() {
        chrome.storage.sync.get(['reminderInterval'], function(result) {
            reminderInterval = result.reminderInterval || 20;
            
            // Always sync with background timer status
            chrome.runtime.sendMessage({action: 'getTimerStatus'}, function(response) {
                if (response) {
                    if (!response.isRunning) {
                        // If timer is not running, use the settings interval
                        timeRemaining = reminderInterval * 60;
                    } else {
                        // If timer is running, use the current remaining time
                        timeRemaining = response.timeRemaining;
                        isRunning = response.isRunning;
                    }
                    updateTimerDisplay();
                    updateUI();
                }
            });
        });
    }

    // Load statistics from storage
    function loadStats() {
        chrome.storage.sync.get(['breaksToday', 'screenTimeToday', 'lastResetDate'], function(result) {
            const today = new Date().toDateString();
            
            // Reset daily stats if it's a new day
            if (result.lastResetDate !== today) {
                chrome.storage.sync.set({
                    breaksToday: 0,
                    screenTimeToday: 0,
                    lastResetDate: today
                });
                breaksToday.textContent = '0';
                screenTime.textContent = '0h';
            } else {
                breaksToday.textContent = result.breaksToday || '0';
                const hours = Math.floor((result.screenTimeToday || 0) / 60);
                const minutes = (result.screenTimeToday || 0) % 60;
                screenTime.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            }
        });
    }

    // Set random daily tip
    function setRandomTip() {
        const randomTip = eyeCareTips[Math.floor(Math.random() * eyeCareTips.length)];
        dailyTip.textContent = randomTip;
    }

    // Update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Check timer status from background
    function checkTimerStatus() {
        chrome.runtime.sendMessage({action: 'getTimerStatus'}, function(response) {
            if (response && response.isRunning) {
                isRunning = true;
                timeRemaining = response.timeRemaining;
                updateUI();
            } else if (response) {
                // If timer is not running, get the correct time from background
                timeRemaining = response.timeRemaining;
                updateUI();
            }
        });
    }

    // Update UI based on timer state
    function updateUI() {
        if (isRunning && !isPaused) {
            timerStatus.textContent = 'Timer Running';
            startBtn.disabled = true;
            pauseBtn.disabled = false;
        } else if (isPaused) {
            timerStatus.textContent = 'Timer Paused';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        } else {
            timerStatus.textContent = 'Timer Off';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
        updateTimerDisplay();
    }

    // Event listeners
    startBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'startTimer'});
        isRunning = true;
        isPaused = false;
        updateUI();
    });

    pauseBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'pauseTimer'});
        isPaused = true;
        isRunning = false;
        updateUI();
    });

    resetBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'resetTimer'});
        timeRemaining = reminderInterval * 60;
        isRunning = false;
        isPaused = false;
        updateUI();
    });

    settingsBtn.addEventListener('click', function() {
        // Open settings page in new tab
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        });
        window.close(); // Close popup
    });

    postureBtn.addEventListener('click', function() {
        const randomPostureTip = postureTips[Math.floor(Math.random() * postureTips.length)];
        alert(`Posture Tip:\n\n${randomPostureTip}`);
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateTimer') {
            timeRemaining = request.timeRemaining;
            updateTimerDisplay();
        }
        if (request.action === 'timerEnded') {
            isRunning = false;
            isPaused = false;
            timeRemaining = reminderInterval * 60;
            updateUI();
        }
        if (request.action === 'statsReset') {
            loadStats(); // Refresh stats display
        }
        if (request.action === 'settingsUpdated') {
            loadSettings(); // Refresh timer display with new interval
        }
    });

    // Initialize the popup
    init();
});
