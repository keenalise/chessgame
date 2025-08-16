const firebaseConfig = {
    apiKey: "AIzaSyBBP3jjc4WKshCNVIS1dv-ANP0OnFhxmRM",
    authDomain: "keenchess-9149f.firebaseapp.com",
    projectId: "keenchess-9149f",
    storageBucket: "keenchess-9149f.firebasestorage.app",
    messagingSenderId: "483473502369",
    appId: "1:483473502369:web:cfce007e26cc943b6980e0"
};

// Global variables
let app = null;
let auth = null;
let googleProvider = null;
let isFirebaseReady = false;

// Debug function
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Firebase: ${message}`, data || '');
}

// Initialize Firebase immediately when script loads
function initializeFirebase() {
    try {
        debugLog('Starting Firebase initialization...');
        
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            debugLog('ERROR: Firebase not loaded');
            return false;
        }
        
        // Initialize Firebase app
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            debugLog('Firebase app initialized');
        } else {
            app = firebase.apps[0];
            debugLog('Using existing Firebase app');
        }
        
        // Initialize Auth
        auth = firebase.auth();
        debugLog('Firebase Auth initialized');
        
        // Set up Google provider
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.addScope('profile');
        debugLog('Google provider configured');
        
        // Set persistence
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        isFirebaseReady = true;
        debugLog('Firebase fully ready');
        
        // Notify that Firebase is ready
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
        return true;
        
    } catch (error) {
        debugLog('Firebase initialization failed:', error);
        return false;
    }
}

// Authentication functions
async function signInWithEmailPassword(email, password) {
    try {
        if (!isFirebaseReady) throw new Error('Firebase not ready');
        
        debugLog('Attempting email sign in...');
        const result = await auth.signInWithEmailAndPassword(email, password);
        debugLog('Email sign in successful');
        
        return {
            success: true,
            user: result.user,
            message: 'Signed in successfully!'
        };
        
    } catch (error) {
        debugLog('Email sign in failed:', error);
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

async function createUserWithEmailPassword(email, password, username) {
    try {
        if (!isFirebaseReady) throw new Error('Firebase not ready');
        
        debugLog('Creating user account...');
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile with username
        await result.user.updateProfile({
            displayName: username
        });
        
        debugLog('User account created successfully');
        
        return {
            success: true,
            user: result.user,
            message: 'Account created successfully!'
        };
        
    } catch (error) {
        debugLog('User creation failed:', error);
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

async function signInWithGoogle() {
    try {
        if (!isFirebaseReady || !googleProvider) {
            throw new Error('Google auth not ready');
        }
        
        debugLog('Attempting Google sign in...');
        const result = await auth.signInWithPopup(googleProvider);
        debugLog('Google sign in successful');
        
        return {
            success: true,
            user: result.user,
            message: 'Signed in with Google successfully!'
        };
        
    } catch (error) {
        debugLog('Google sign in failed:', error);
        
        // Handle popup closed by user
        if (error.code === 'auth/popup-closed-by-user') {
            return {
                success: false,
                message: 'Sign in cancelled'
            };
        }
        
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

async function sendPasswordReset(email) {
    try {
        if (!isFirebaseReady) throw new Error('Firebase not ready');
        
        debugLog('Sending password reset...');
        await auth.sendPasswordResetEmail(email);
        debugLog('Password reset sent');
        
        return {
            success: true,
            message: 'Password reset email sent!'
        };
        
    } catch (error) {
        debugLog('Password reset failed:', error);
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

function getCurrentUser() {
    return new Promise((resolve) => {
        if (!isFirebaseReady) {
            resolve(null);
            return;
        }
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

async function signOut() {
    try {
        if (!isFirebaseReady) throw new Error('Firebase not ready');
        
        await auth.signOut();
        return { success: true };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Error message handler
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
        'auth/popup-closed-by-user': 'Sign in cancelled.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled.'
    };
    
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Connection check
function checkConnection() {
    return Promise.resolve(isFirebaseReady && navigator.onLine);
}

// Initialize Firebase as soon as possible
let initAttempt = 0;
const maxAttempts = 10;

function attemptInit() {
    initAttempt++;
    debugLog(`Init attempt ${initAttempt}/${maxAttempts}`);
    
    if (typeof firebase !== 'undefined') {
        const success = initializeFirebase();
        if (success) {
            debugLog('Firebase initialization complete');
            return;
        }
    }
    
    if (initAttempt < maxAttempts) {
        setTimeout(attemptInit, 100);
    } else {
        debugLog('Failed to initialize Firebase after all attempts');
    }
}

// Start initialization immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptInit);
} else {
    attemptInit();
}

// Export for global access
window.FirebaseAuth = {
    ready: () => isFirebaseReady,
    signInWithEmailPassword,
    createUserWithEmailPassword,
    signInWithGoogle,
    sendPasswordReset,
    getCurrentUser,
    signOut,
    checkConnection
};