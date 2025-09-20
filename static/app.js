// Navigation and section management
let currentSection = 'overview';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    initializeNavigation();
    initializeTabs();
    initializeCodeBlocks();
    initializeConfiguration();
    
    // Show initial section based on hash or default
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('overview');
    }
});

// Navigation functionality
function initializeNavigation() {
    console.log('Initializing navigation...');
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Nav link clicked:', this.getAttribute('data-section'));
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
                // Update URL hash
                window.history.pushState(null, null, `#${section}`);
            }
        });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.slice(1) || 'overview';
        showSection(hash);
    });
    
    console.log('Navigation initialized with', navLinks.length, 'links');
}

function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.classList.add('fade-in');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            targetSection.classList.remove('fade-in');
        }, 250);
        
        console.log('Section', sectionName, 'is now active');
    } else {
        console.error('Section not found:', sectionName);
        return;
    }
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionName) {
            link.classList.add('active');
        }
    });
    
    currentSection = sectionName;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Re-highlight code if Prism is available
    if (window.Prism && sectionName === 'implementation') {
        setTimeout(() => {
            Prism.highlightAll();
        }, 100);
    }
}

// Tab functionality
function initializeTabs() {
    console.log('Initializing tabs...');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            console.log('Tab clicked:', tabName);
            if (tabName) {
                showTab(tabName);
            }
        });
    });
    
    console.log('Tabs initialized with', tabBtns.length, 'buttons');
}

function showTab(tabName) {
    console.log('Showing tab:', tabName);
    
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Show target tab pane
    const targetPane = document.getElementById(tabName);
    if (targetPane) {
        targetPane.classList.add('active');
        targetPane.classList.add('fade-in');
        
        setTimeout(() => {
            targetPane.classList.remove('fade-in');
        }, 250);
        
        console.log('Tab', tabName, 'is now active');
    } else {
        console.error('Tab pane not found:', tabName);
        return;
    }
    
    // Update tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Trigger Prism highlighting for the new content
    if (window.Prism) {
        setTimeout(() => {
            Prism.highlightAll();
        }, 100);
    }
}

// Code block functionality
function initializeCodeBlocks() {
    console.log('Initializing code blocks...');
    
    // Initialize Prism highlighting
    if (window.Prism) {
        Prism.highlightAll();
        console.log('Prism highlighting applied');
    } else {
        console.warn('Prism not loaded');
    }
    
    // Add copy functionality to existing copy buttons
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            copyCode(this);
        });
    });
    
    console.log('Code blocks initialized with', copyBtns.length, 'copy buttons');
}

// Copy code functionality
function copyCode(button) {
    console.log('Copy button clicked');
    const codeBlock = button.parentElement;
    const code = codeBlock.querySelector('code, pre');
    
    let textToCopy = '';
    
    if (code) {
        // Get text content, preserving line breaks
        textToCopy = code.textContent || code.innerText;
    } else {
        // Fallback - try to get text from the pre element
        const pre = codeBlock.querySelector('pre');
        if (pre) {
            textToCopy = pre.textContent || pre.innerText;
        }
    }
    
    if (!textToCopy) {
        console.error('No text found to copy');
        return;
    }
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            console.log('Text copied to clipboard');
            showCopyFeedback(button);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            fallbackCopy(textToCopy, button);
        });
    } else {
        fallbackCopy(textToCopy, button);
    }
}

function fallbackCopy(text, button) {
    console.log('Using fallback copy method');
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('Fallback copy successful');
            showCopyFeedback(button);
        } else {
            console.error('Fallback copy failed');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyFeedback(button) {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
    }, 2000);
}

// Configuration functionality
function initializeConfiguration() {
    console.log('Initializing configuration...');
    const form = document.getElementById('botConfig');
    if (form) {
        // Load saved configuration
        loadConfiguration();
        
        // Save configuration on form changes
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', saveConfiguration);
            input.addEventListener('input', saveConfiguration);
        });
        
        console.log('Configuration form initialized');
    } else {
        console.log('Configuration form not found');
    }
}

function saveConfiguration() {
    const config = {};
    
    // Get all form values
    const botToken = document.getElementById('botToken')?.value || '';
    const chatId = document.getElementById('chatId')?.value || '';
    const productUrl = document.getElementById('productUrl')?.value || '';
    const checkInterval = document.getElementById('checkInterval')?.value || '';
    const pincode = document.getElementById('pincode')?.value || '';
    
    config.botToken = botToken;
    config.chatId = chatId;
    config.productUrl = productUrl;
    config.checkInterval = checkInterval;
    config.pincode = pincode;
    
    // Save to localStorage (note: this won't work in the sandbox, but it's good practice)
    try {
        localStorage.setItem('botConfiguration', JSON.stringify(config));
    } catch (e) {
        // localStorage not available, ignore
        console.log('localStorage not available');
    }
}

function loadConfiguration() {
    try {
        const saved = localStorage.getItem('botConfiguration');
        if (saved) {
            const config = JSON.parse(saved);
            
            if (config.botToken && document.getElementById('botToken')) {
                document.getElementById('botToken').value = config.botToken;
            }
            if (config.chatId && document.getElementById('chatId')) {
                document.getElementById('chatId').value = config.chatId;
            }
            if (config.productUrl && document.getElementById('productUrl')) {
                document.getElementById('productUrl').value = config.productUrl;
            }
            if (config.checkInterval && document.getElementById('checkInterval')) {
                document.getElementById('checkInterval').value = config.checkInterval;
            }
            if (config.pincode && document.getElementById('pincode')) {
                document.getElementById('pincode').value = config.pincode;
            }
        }
    } catch (e) {
        // localStorage not available or invalid JSON, ignore
        console.log('Could not load saved configuration');
    }
}

function generateEnvFile() {
    console.log('Generating env file...');
    
    const botToken = document.getElementById('botToken')?.value || '';
    const chatId = document.getElementById('chatId')?.value || '';
    const checkInterval = document.getElementById('checkInterval')?.value || '*/10 * * * *';
    const pincode = document.getElementById('pincode')?.value || '';
    
    if (!botToken.trim()) {
        showNotification('Please enter your bot token first', 'error');
        const tokenInput = document.getElementById('botToken');
        if (tokenInput) tokenInput.focus();
        return;
    }
    
    if (!chatId.trim()) {
        showNotification('Please enter your chat ID first', 'error');
        const chatInput = document.getElementById('chatId');
        if (chatInput) chatInput.focus();
        return;
    }
    
    const envContent = `# Telegram Bot Configuration
BOT_TOKEN=${botToken}
ADMIN_CHAT_ID=${chatId}
CHECK_INTERVAL=${checkInterval}
PINCODE=${pincode || '400001'}

# Optional: Set to production for deployment
NODE_ENV=development

# Optional: Database URL for persistent storage
# DATABASE_URL=your_database_url_here`;
    
    // Show the generated content
    const envOutput = document.getElementById('envOutput');
    const envContentElement = document.getElementById('envContent');
    
    if (envContentElement) {
        envContentElement.textContent = envContent;
    }
    
    if (envOutput) {
        envOutput.classList.remove('hidden');
        
        // Highlight the code
        if (window.Prism && envContentElement) {
            Prism.highlightElement(envContentElement);
        }
        
        // Scroll to the output
        envOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Show success message
    showNotification('Environment file generated successfully!', 'success');
}

function testConfiguration() {
    console.log('Testing configuration...');
    
    const botToken = document.getElementById('botToken')?.value || '';
    const chatId = document.getElementById('chatId')?.value || '';
    const productUrl = document.getElementById('productUrl')?.value || '';
    
    if (!botToken.trim()) {
        showNotification('Please enter your bot token first', 'error');
        const tokenInput = document.getElementById('botToken');
        if (tokenInput) tokenInput.focus();
        return;
    }
    
    if (!chatId.trim()) {
        showNotification('Please enter your chat ID first', 'error');
        const chatInput = document.getElementById('chatId');
        if (chatInput) chatInput.focus();
        return;
    }
    
    if (!productUrl.trim()) {
        showNotification('Please enter a product URL first', 'error');
        const urlInput = document.getElementById('productUrl');
        if (urlInput) urlInput.focus();
        return;
    }
    
    // Validate URL format
    try {
        new URL(productUrl);
    } catch (e) {
        showNotification('Please enter a valid URL', 'error');
        const urlInput = document.getElementById('productUrl');
        if (urlInput) urlInput.focus();
        return;
    }
    
    // Validate bot token format (should be like 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenRegex.test(botToken)) {
        showNotification('Bot token format appears to be invalid. It should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz', 'warning');
    }
    
    // Validate chat ID format (should be numeric)
    if (!/^-?\d+$/.test(chatId)) {
        showNotification('Chat ID should be numeric (e.g., 123456789 or -123456789 for groups)', 'warning');
    }
    
    // Show success message with testing instructions
    const checkInterval = document.getElementById('checkInterval')?.value || '*/10 * * * *';
    const intervalText = checkInterval.replace('*/', 'every ').replace(' * * * *', ' minutes');
    
    const message = `Configuration looks good! 

To test your bot:
1. Save the generated .env file to your project
2. Install dependencies: npm install
3. Run the bot: npm start
4. Send /start to your bot on Telegram

The bot will check "${productUrl}" ${intervalText}.`;
    
    showNotification(message, 'success', 8000);
}

// Notification system
function showNotification(message, type = 'info', duration = 5000) {
    console.log('Showing notification:', type, message);
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-message">${message.replace(/\n/g, '<br>')}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-base);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        padding: var(--space-16);
        font-size: var(--font-size-sm);
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Type-specific styling
    if (type === 'success') {
        notification.style.borderColor = 'var(--color-success)';
        notification.style.backgroundColor = 'rgba(var(--color-success-rgb), 0.05)';
    } else if (type === 'error') {
        notification.style.borderColor = 'var(--color-error)';
        notification.style.backgroundColor = 'rgba(var(--color-error-rgb), 0.05)';
    } else if (type === 'warning') {
        notification.style.borderColor = 'var(--color-warning)';
        notification.style.backgroundColor = 'rgba(var(--color-warning-rgb), 0.05)';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-content {
        display: flex;
        align-items: flex-start;
        gap: var(--space-12);
    }
    
    .notification-message {
        flex: 1;
        line-height: 1.4;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }
    
    .notification-close:hover {
        background: var(--color-secondary);
        color: var(--color-text);
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Hero button handlers
function handleHeroButtons() {
    // Get Started button
    const getStartedBtns = document.querySelectorAll('button:contains("Get Started"), .btn:contains("Get Started")');
    getStartedBtns.forEach(btn => {
        if (btn.textContent.includes('Get Started')) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Get Started clicked');
                showSection('setup');
                window.history.pushState(null, null, '#setup');
            });
        }
    });
    
    // View Code button
    const viewCodeBtns = document.querySelectorAll('button:contains("View Code"), .btn:contains("View Code")');
    viewCodeBtns.forEach(btn => {
        if (btn.textContent.includes('View Code')) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('View Code clicked');
                showSection('implementation');
                window.history.pushState(null, null, '#implementation');
            });
        }
    });
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting enhanced initialization...');
    
    // Wait a bit for all elements to be rendered
    setTimeout(() => {
        initializeNavigation();
        initializeTabs();
        initializeCodeBlocks();
        initializeConfiguration();
        handleHeroButtons();
        
        // Show initial section
        const hash = window.location.hash.slice(1);
        if (hash && document.getElementById(hash)) {
            showSection(hash);
        } else {
            showSection('overview');
        }
        
        console.log('Application fully initialized');
    }, 100);
});

// Export functions for global access
window.showSection = showSection;
window.showTab = showTab;
window.copyCode = copyCode;
window.generateEnvFile = generateEnvFile;
window.testConfiguration = testConfiguration;

// Debug helper
window.debugApp = function() {
    console.log('Current section:', currentSection);
    console.log('Available sections:', Array.from(document.querySelectorAll('.section')).map(s => s.id));
    console.log('Nav links:', Array.from(document.querySelectorAll('.nav-link')).map(l => l.getAttribute('data-section')));
    console.log('Tab buttons:', Array.from(document.querySelectorAll('.tab-btn')).map(t => t.getAttribute('data-tab')));
};