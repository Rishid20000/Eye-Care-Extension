// Eye Care Reminder - Content Script

console.log('Eye Care Reminder content script loaded!');

// Create break overlay when break time arrives
function createBreakOverlay() {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('eyecareBreakOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Load break duration from settings
    chrome.storage.sync.get(['breakDuration'], function(result) {
        const breakDuration = result.breakDuration || 20;
        showBreakOverlay(breakDuration);
    });
}

// Show break overlay with custom duration
function showBreakOverlay(customDuration) {
    const countdown = customDuration;
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'eyecareBreakOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: eyecareOverlayFadeIn 0.5s ease-out;
    `;
    
    // Create break message card
    const breakCard = document.createElement('div');
    breakCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: eyecareBreakCardSlideIn 0.6s ease-out;
    `;
    
    // Create countdown timer (will be updated from settings)
    let countdown = 20; // Default 20 seconds
    
    breakCard.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">👁️</div>
        <h1 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 600;">Time for an Eye Break!</h1>
        <p style="margin: 0 0 25px 0; font-size: 16px; opacity: 0.9; line-height: 1.4;">Look at something 20 feet away for 20 seconds.<br>This helps reduce eye strain and keeps your vision healthy.</p>
        <div id="eyecareCountdown" style="font-size: 48px; font-weight: 700; margin: 20px 0; color: #4CAF50;">${countdown}</div>
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
            <button id="eyecareTakeBreak" style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">✅ Taking Break</button>
            <button id="eyecareSkipBreak" style="background: rgba(255, 255, 255, 0.2); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-size: 14px; transition: all 0.2s;">⏭️ Skip (Not Recommended)</button>
        </div>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">This overlay will automatically close in <span id="eyecareAutoClose">20</span> seconds</p>
    `;
    
    // Add styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes eyecareOverlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes eyecareBreakCardSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        #eyecareTakeBreak:hover {
            background: #45a049 !important;
            transform: translateY(-2px);
        }
        #eyecareSkipBreak:hover {
            background: rgba(255, 255, 255, 0.3) !important;
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(breakCard);
    document.body.appendChild(overlay);
    
    // Countdown timer
    const countdownElement = document.getElementById('eyecareCountdown');
    const autoCloseElement = document.getElementById('eyecareAutoClose');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        autoCloseElement.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            removeBreakOverlay();
        }
    }, 1000);
    
    // Button event listeners
    document.getElementById('eyecareTakeBreak').addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: 'breakTaken' });
        removeBreakOverlay();
        clearInterval(countdownInterval);
    });
    
    document.getElementById('eyecareSkipBreak').addEventListener('click', function() {
        removeBreakOverlay();
        clearInterval(countdownInterval);
    });
    
    // Close overlay when clicking outside the card
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            removeBreakOverlay();
            clearInterval(countdownInterval);
        }
    });
}

// Remove break overlay
function removeBreakOverlay() {
    const overlay = document.getElementById('eyecareBreakOverlay');
    if (overlay) {
        overlay.style.animation = 'eyecareOverlayFadeIn 0.3s ease-out reverse';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Blue light and brightness monitoring
function monitorScreenBrightness() {
    // This is a simplified version - actual brightness detection would require more advanced techniques
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Sample screen brightness by analyzing page colors
    try {
        const sampleElements = document.querySelectorAll('body, div, p, h1, h2, h3');
        let totalBrightness = 0;
        let sampleCount = 0;
        
        for (let i = 0; i < Math.min(sampleElements.length, 20); i++) {
            const element = sampleElements[i];
            const styles = window.getComputedStyle(element);
            const bgColor = styles.backgroundColor;
            
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                // Simple brightness calculation based on RGB values
                const rgb = bgColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                    totalBrightness += brightness;
                    sampleCount++;
                }
            }
        }
        
        if (sampleCount > 0) {
            const avgBrightness = totalBrightness / sampleCount;
            
            // Show warning if screen is too bright (over 200 on 0-255 scale)
            if (avgBrightness > 200) {
                showBrightnessWarning();
            }
        }
    } catch (error) {
        // Silently handle any errors in brightness detection
    }
}

// Show brightness warning
function showBrightnessWarning() {
    // Only show once per page load
    if (document.getElementById('eyecareBrightnessWarning')) return;
    
    const warning = document.createElement('div');
    warning.id = 'eyecareBrightnessWarning';
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInFromRight 0.3s ease-out;
    `;
    
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 20px;">💡</div>
            <div>
                <strong>Screen Brightness Warning</strong><br>
                Consider reducing screen brightness to protect your eyes.
            </div>
            <button style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin-left: auto;">×</button>
        </div>
    `;
    
    // Add close functionality
    warning.querySelector('button').addEventListener('click', function() {
        warning.remove();
    });
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.remove();
        }
    }, 8000);
    
    document.body.appendChild(warning);
}

// Add slide-in animation for warnings
if (!document.getElementById('eyecareWarningStyles')) {
    const style = document.createElement('style');
    style.id = 'eyecareWarningStyles';
    style.textContent = `
        @keyframes slideInFromRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize monitoring after page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(monitorScreenBrightness, 3000); // Check after 3 seconds
    });
} else {
    setTimeout(monitorScreenBrightness, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'showBreakOverlay') {
        createBreakOverlay();
        sendResponse({success: true});
    }
    
    if (request.action === 'hideBreakOverlay') {
        removeBreakOverlay();
        sendResponse({success: true});
    }
});
