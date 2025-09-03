document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const closeBtn = document.getElementById('closeSettings');
    const saveBtn = document.getElementById('saveSettings');
    const cancelBtn = document.getElementById('cancelSettings');
    const resetStatsBtn = document.getElementById('resetStats');
    const customRadio = document.getElementById('timerCustom');
    const customInput = document.getElementById('customMinutes');
    
    // Timer interval radio buttons
    const timerRadios = document.querySelectorAll('input[name="timerInterval"]');
    
    // Load current settings
    loadSettings();
    
    // Event listeners
    closeBtn.addEventListener('click', closeSettings);
    cancelBtn.addEventListener('click', closeSettings);
    saveBtn.addEventListener('click', saveSettings);
    resetStatsBtn.addEventListener('click', resetStatistics);
    
    // Custom timer input handling
    customInput.addEventListener('focus', function() {
        customRadio.checked = true;
    });
    
    customInput.addEventListener('input', function() {
        if (this.value) {
            customRadio.checked = true;
        }
    });
    
    // Load settings from storage
    function loadSettings() {
        chrome.storage.sync.get([
            'reminderInterval',
            'breakDuration', 
            'notificationsEnabled',
            'screenOverlayEnabled',
            'soundAlertsEnabled'
        ], function(result) {
            // Set timer interval
            const interval = result.reminderInterval || 20;
            const standardIntervals = [10, 15, 20, 30];
            
            if (standardIntervals.includes(interval)) {
                document.getElementById(`timer${interval}`).checked = true;
            } else {
                document.getElementById('timerCustom').checked = true;
                document.getElementById('customMinutes').value = interval;
            }
            
            // Set break duration
            document.getElementById('breakDuration').value = result.breakDuration || 20;
            
            // Set notification preferences
            document.getElementById('desktopNotifications').checked = result.notificationsEnabled !== false;
            document.getElementById('screenOverlay').checked = result.screenOverlayEnabled !== false;
            document.getElementById('soundAlerts').checked = result.soundAlertsEnabled || false;
        });
    }
    
    // Save settings to storage
    function saveSettings() {
        // Get selected timer interval
        let selectedInterval = 20; // default
        const checkedRadio = document.querySelector('input[name="timerInterval"]:checked');
        
        if (checkedRadio) {
            if (checkedRadio.value === 'custom') {
                selectedInterval = parseInt(document.getElementById('customMinutes').value) || 20;
                // Validate custom input
                if (selectedInterval < 5 || selectedInterval > 60) {
                    alert('Custom interval must be between 5 and 60 minutes!');
                    return;
                }
            } else {
                selectedInterval = parseInt(checkedRadio.value);
            }
        }
        
        // Get other settings
        const breakDuration = parseInt(document.getElementById('breakDuration').value);
        const notificationsEnabled = document.getElementById('desktopNotifications').checked;
        const screenOverlayEnabled = document.getElementById('screenOverlay').checked;
        const soundAlertsEnabled = document.getElementById('soundAlerts').checked;
        
        // Save to storage
        chrome.storage.sync.set({
            reminderInterval: selectedInterval,
            breakDuration: breakDuration,
            notificationsEnabled: notificationsEnabled,
            screenOverlayEnabled: screenOverlayEnabled,
            soundAlertsEnabled: soundAlertsEnabled
        }, function() {
            // Notify background script of settings change
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: {
                    reminderInterval: selectedInterval,
                    breakDuration: breakDuration,
                    notificationsEnabled: notificationsEnabled,
                    screenOverlayEnabled: screenOverlayEnabled,
                    soundAlertsEnabled: soundAlertsEnabled
                }
            });
            
            // Show success message
            showSuccessMessage();
            
            // Close settings after a brief delay
            setTimeout(closeSettings, 1500);
        });
    }
    
    // Reset statistics
    function resetStatistics() {
        if (confirm('Are you sure you want to reset today\'s statistics? This cannot be undone.')) {
            chrome.storage.sync.set({
                breaksToday: 0,
                screenTimeToday: 0,
                lastResetDate: new Date().toDateString()
            }, function() {
                // Notify popup to refresh stats
                chrome.runtime.sendMessage({
                    action: 'statsReset'
                });
                
                alert('Statistics have been reset!');
            });
        }
    }
    
    // Show success message
    function showSuccessMessage() {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '#4CAF50';
        }, 1500);
    }
    
    // Close settings modal
    function closeSettings() {
        window.close();
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSettings();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            saveSettings();
        }
    });
});
