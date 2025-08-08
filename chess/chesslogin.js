// chesslogin.js - Complete Fixed Version

let elements = {};
let currentForm = 'login';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Listen for Firebase ready event
window.addEventListener('firebaseReady', function() {
    console.log('Firebase is ready, updating connection status');
    updateConnectionStatus('online');
});

function initializeApp() {
    console.log('Initializing Chess Login App...');
    
    // Get all DOM elements
    elements = {
        // Connection status
        connectionStatus: document.getElementById('connectionStatus'),
        
        // Forms
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        forgotPasswordForm: document.getElementById('forgotPasswordForm'),
        
        // Form elements
        loginFormElement: document.getElementById('loginFormElement'),
        registerFormElement: document.getElementById('registerFormElement'),
        forgotPasswordFormElement: document.getElementById('forgotPasswordFormElement'),
        
        // Buttons
        googleSignInBtn: document.getElementById('googleSignInBtn'),
        googleSignUpBtn: document.getElementById('googleSignUpBtn'),
        loginBtn: document.getElementById('loginBtn'),
        registerBtn: document.getElementById('registerBtn'),
        forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
        
        // Input fields
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        registerUsername: document.getElementById('registerUsername'),
        registerEmail: document.getElementById('registerEmail'),
        registerPassword: document.getElementById('registerPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        forgotPasswordEmail: document.getElementById('forgotPasswordEmail'),
        
        // Messages
        loginError: document.getElementById('loginError'),
        loginSuccess: document.getElementById('loginSuccess'),
        registerError: document.getElementById('registerError'),
        registerSuccess: document.getElementById('registerSuccess'),
        forgotPasswordError: document.getElementById('forgotPasswordError'),
        forgotPasswordSuccess: document.getElementById('forgotPasswordSuccess'),
        
        // Password strength
        passwordStrength: document.getElementById('passwordStrength'),
        strengthFill: document.getElementById('strengthFill'),
        strengthText: document.getElementById('strengthText'),
        
        // Debug
        debugInfo: document.getElementById('debugInfo')
    };
    
    setupEventListeners();
    setupPasswordStrength();
    checkInitialConnection();
    
    console.log('App initialized successfully');
}

function setupEventListeners() {
    // Form submissions
    if (elements.loginFormElement) {
        elements.loginFormElement.addEventListener('submit', handleLogin);
    }
    
    if (elements.registerFormElement) {
        elements.registerFormElement.addEventListener('submit', handleRegister);
    }
    
    if (elements.forgotPasswordFormElement) {
        elements.forgotPasswordFormElement.addEventListener('submit', handleForgotPassword);
    }
    
    // Google buttons
    if (elements.googleSignInBtn) {
        elements.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    if (elements.googleSignUpBtn) {
        elements.googleSignUpBtn.addEventListener('click', handleGoogleSignUp);
    }
    
    // Password strength
    if (elements.registerPassword) {
        elements.registerPassword.addEventListener('input', updatePasswordStrength);
    }
    
    console.log('Event listeners set up');
}

function setupPasswordStrength() {
    if (elements.registerPassword) {
        elements.registerPassword.addEventListener('focus', () => {
            if (elements.passwordStrength) {
                elements.passwordStrength.style.display = 'block';
            }
        });
    }
}

function checkInitialConnection() {
    updateConnectionStatus('checking');
    
    // Quick check
    setTimeout(() => {
        if (window.FirebaseAuth && window.FirebaseAuth.ready()) {
            updateConnectionStatus('online');
        } else {
            updateConnectionStatus('offline');
        }
    }, 1000);
}

function updateConnectionStatus(status) {
    if (!elements.connectionStatus) return;
    
    elements.connectionStatus.className = `connection-status connection-${status}`;
    
    switch (status) {
        case 'online':
            elements.connectionStatus.textContent = '🟢 Connected';
            break;
        case 'offline':
            elements.connectionStatus.textContent = '🔴 Offline';
            break;
        case 'checking':
        default:
            elements.connectionStatus.textContent = '🟡 Checking...';
            break;
    }
}

// Form handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;
    
    if (!email || !password) {
        showMessage('loginError', 'Please fill in all fields');
        return;
    }
    
    setButtonLoading(elements.loginBtn, true);
    clearMessages();
    
    try {
        const result = await window.FirebaseAuth.signInWithEmailPassword(email, password);
        
        if (result.success) {
            showMessage('loginSuccess', result.message);
            setTimeout(() => {
                redirectToMainApp(result.user);
            }, 1000);
        } else {
            showMessage('loginError', result.message);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginError', 'Login failed. Please try again.');
    } finally {
        setButtonLoading(elements.loginBtn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = elements.registerUsername.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    const confirmPassword = elements.confirmPassword.value;
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
        showMessage('registerError', 'Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('registerError', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showMessage('registerError', 'Password must be at least 6 characters');
        return;
    }
    
    setButtonLoading(elements.registerBtn, true);
    clearMessages();
    
    try {
        const result = await window.FirebaseAuth.createUserWithEmailPassword(email, password, username);
        
        if (result.success) {
            showMessage('registerSuccess', result.message);
            
            // Clear form
            elements.registerFormElement.reset();
            elements.passwordStrength.style.display = 'none';
            
            // Switch to login
            setTimeout(() => {
                showLogin();
                showMessage('loginSuccess', 'Account created! Please sign in.');
            }, 2000);
        } else {
            showMessage('registerError', result.message);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('registerError', 'Registration failed. Please try again.');
    } finally {
        setButtonLoading(elements.registerBtn, false);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = elements.forgotPasswordEmail.value.trim();
    
    if (!email) {
        showMessage('forgotPasswordError', 'Please enter your email');
        return;
    }
    
    setButtonLoading(elements.forgotPasswordBtn, true);
    clearMessages();
    
    try {
        const result = await window.FirebaseAuth.sendPasswordReset(email);
        
        if (result.success) {
            showMessage('forgotPasswordSuccess', result.message);
            elements.forgotPasswordFormElement.reset();
            
            setTimeout(() => {
                showLogin();
            }, 3000);
        } else {
            showMessage('forgotPasswordError', result.message);
        }
        
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage('forgotPasswordError', 'Password reset failed. Please try again.');
    } finally {
        setButtonLoading(elements.forgotPasswordBtn, false);
    }
}

async function handleGoogleSignIn() {
    if (!window.FirebaseAuth || !window.FirebaseAuth.ready()) {
        showMessage('loginError', 'Authentication service not ready. Please wait...');
        return;
    }
    
    setButtonLoading(elements.googleSignInBtn, true);
    clearMessages();
    
    try {
        const result = await window.FirebaseAuth.signInWithGoogle();
        
        if (result.success) {
            showMessage('loginSuccess', result.message);
            setTimeout(() => {
                redirectToMainApp(result.user);
            }, 1000);
        } else {
            showMessage('loginError', result.message);
        }
        
    } catch (error) {
        console.error('Google sign in error:', error);
        showMessage('loginError', 'Google sign in failed. Please try again.');
    } finally {
        setButtonLoading(elements.googleSignInBtn, false);
    }
}

async function handleGoogleSignUp() {
    if (!window.FirebaseAuth || !window.FirebaseAuth.ready()) {
        showMessage('registerError', 'Authentication service not ready. Please wait...');
        return;
    }
    
    setButtonLoading(elements.googleSignUpBtn, true);
    clearMessages();
    
    try {
        const result = await window.FirebaseAuth.signInWithGoogle();
        
        if (result.success) {
            showMessage('registerSuccess', result.message);
            setTimeout(() => {
                redirectToMainApp(result.user);
            }, 1000);
        } else {
            showMessage('registerError', result.message);
        }
        
    } catch (error) {
        console.error('Google sign up error:', error);
        showMessage('registerError', 'Google sign up failed. Please try again.');
    } finally {
        setButtonLoading(elements.googleSignUpBtn, false);
    }
}

// UI Helper Functions
function showLogin() {
    currentForm = 'login';
    hideAllForms();
    elements.loginForm.classList.remove('hidden');
    clearMessages();
}

function showRegister() {
    currentForm = 'register';
    hideAllForms();
    elements.registerForm.classList.remove('hidden');
    clearMessages();
}

function showForgotPassword() {
    currentForm = 'forgotPassword';
    hideAllForms();
    elements.forgotPasswordForm.classList.remove('hidden');
    clearMessages();
}

function hideAllForms() {
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.add('hidden');
    elements.forgotPasswordForm.classList.add('hidden');
}

function clearMessages() {
    const messageElements = [
        elements.loginError, elements.loginSuccess,
        elements.registerError, elements.registerSuccess,
        elements.forgotPasswordError, elements.forgotPasswordSuccess
    ];
    
    messageElements.forEach(element => {
        if (element) {
            element.style.display = 'none';
            element.textContent = '';
        }
    });
}

function showMessage(elementId, message) {
    const element = elements[elementId];
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Auto-hide success messages
        if (elementId.includes('Success')) {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    if (!btnText) return;
    
    if (isLoading) {
        button.disabled = true;
        btnText.innerHTML = '<span class="loading"></span> Processing...';
    } else {
        button.disabled = false;
        
        // Restore original text
        if (button === elements.loginBtn) {
            btnText.textContent = 'Sign In';
        } else if (button === elements.registerBtn) {
            btnText.textContent = 'Create Account';
        } else if (button === elements.forgotPasswordBtn) {
            btnText.textContent = 'Send Reset Link';
        } else if (button === elements.googleSignInBtn) {
            btnText.textContent = 'Continue with Google';
        } else if (button === elements.googleSignUpBtn) {
            btnText.textContent = 'Sign up with Google';
        }
    }
}

// Password strength functionality
function updatePasswordStrength() {
    if (!elements.registerPassword || !elements.strengthFill || !elements.strengthText) return;
    
    const password = elements.registerPassword.value;
    const strength = calculatePasswordStrength(password);
    
    elements.strengthFill.className = `strength-fill strength-${strength.level}`;
    elements.strengthText.textContent = strength.text;
    
    if (password.length === 0) {
        elements.passwordStrength.style.display = 'none';
    } else {
        elements.passwordStrength.style.display = 'block';
    }
}

function calculatePasswordStrength(password) {
    if (!password) return { level: 'weak', text: '' };
    
    let score = 0;
    
    // Length checks
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character type checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score < 2) return { level: 'weak', text: 'Weak password' };
    if (score < 4) return { level: 'fair', text: 'Fair password' };
    if (score < 5) return { level: 'good', text: 'Good password' };
    return { level: 'strong', text: 'Strong password' };
}

// Global functions for HTML onclick handlers
function togglePassword(fieldId, toggleElement) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        toggleElement.textContent = '🙈';
    } else {
        field.type = 'password';
        toggleElement.textContent = '👁️';
    }
}

function toggleDebug() {
    const debugInfo = elements.debugInfo;
    const debugToggle = document.querySelector('.debug-toggle');
    
    if (!debugInfo || !debugToggle) return;
    
    if (debugInfo.style.display === 'none' || !debugInfo.style.display) {
        debugInfo.style.display = 'block';
        debugToggle.textContent = 'Hide Debug Info';
    } else {
        debugInfo.style.display = 'none';
        debugToggle.textContent = 'Show Debug Info';
    }
}

function retryConnection() {
    updateConnectionStatus('checking');
    
    setTimeout(() => {
        if (window.FirebaseAuth && window.FirebaseAuth.ready()) {
            updateConnectionStatus('online');
        } else {
            updateConnectionStatus('offline');
        }
    }, 1000);
}

function continueOffline() {
    alert('Offline mode not implemented yet. Please check your connection and try again.');
}

// Redirect function
function redirectToMainApp(user) {
    console.log('Redirecting to chess game for user:', user.uid);
    
    // Store user info in sessionStorage
    sessionStorage.setItem('chess_user_id', user.uid);
    sessionStorage.setItem('chess_user_email', user.email);
    sessionStorage.setItem('chess_user_name', user.displayName || user.email);
    sessionStorage.setItem('chess_user_photo', user.photoURL || '');
    
    // Also store in localStorage for persistence
    localStorage.setItem('chess_user_id', user.uid);
    localStorage.setItem('chess_user_email', user.email);
    localStorage.setItem('chess_user_name', user.displayName || user.email);
    localStorage.setItem('chess_user_photo', user.photoURL || '');
    
    console.log('User data stored, redirecting to chessgame.html...');
    
    // Redirect to chess game
    try {
        window.location.href = 'chessgame.html';
    } catch (error) {
        console.error('Redirect failed:', error);
        // Fallback: try different redirect methods
        try {
            window.location.replace('chessgame.html');
        } catch (error2) {
            console.error('Replace redirect failed:', error2);
            // Last resort: show manual link
            showMessage('loginSuccess', 'Login successful! Click here if not redirected: <a href="chessgame.html">Open Chess Game</a>');
        }
    }
}

// Make functions globally available
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showForgotPassword = showForgotPassword;
window.togglePassword = togglePassword;
window.toggleDebug = toggleDebug;
window.retryConnection = retryConnection;
window.continueOffline = continueOffline;