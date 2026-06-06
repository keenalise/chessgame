let elements = {};
let currentForm = 'login';

// ─── CANVAS ANIMATION ───────────────────────────────────────────────
const PIECES = ['♙','♟','♖','♜','♘','♞','♗','♝','♕','♛','♔','♚'];

function initCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Particle class
    class Particle {
        constructor() { this.reset(true); }
        reset(initial) {
            this.x = Math.random() * canvas.width;
            this.y = initial ? Math.random() * canvas.height : canvas.height + 40;
            this.size = Math.random() * 18 + 8;
            this.piece = PIECES[Math.floor(Math.random() * PIECES.length)];
            this.speed = Math.random() * 0.4 + 0.15;
            this.opacity = 0;
            this.targetOpacity = Math.random() * 0.12 + 0.04;
            this.fadeIn = true;
            this.drift = (Math.random() - 0.5) * 0.3;
            this.rotation = (Math.random() - 0.5) * 0.02;
            this.angle = 0;
        }
        update() {
            this.y -= this.speed;
            this.x += this.drift;
            this.angle += this.rotation;
            if (this.fadeIn) {
                this.opacity = Math.min(this.opacity + 0.003, this.targetOpacity);
                if (this.opacity >= this.targetOpacity) this.fadeIn = false;
            }
            if (this.y < -40) this.reset(false);
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalAlpha = this.opacity;
            ctx.font = `${this.size}px serif`;
            ctx.fillStyle = '#c9a84c';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.piece, 0, 0);
            ctx.restore();
        }
    }

    // Light streak class
    class Streak {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.length = Math.random() * 120 + 40;
            this.angle = Math.PI * 0.3 + (Math.random() - 0.5) * 0.5;
            this.speed = Math.random() * 1.5 + 0.8;
            this.opacity = 0;
            this.life = 0;
            this.maxLife = Math.random() * 80 + 40;
            this.active = Math.random() < 0.3;
        }
        update() {
            if (!this.active) {
                if (Math.random() < 0.002) this.active = true;
                return;
            }
            this.life++;
            const t = this.life / this.maxLife;
            this.opacity = t < 0.3 ? t / 0.3 * 0.15 : (1 - (t - 0.3) / 0.7) * 0.15;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            if (this.life >= this.maxLife) {
                this.reset();
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
            }
        }
        draw() {
            if (!this.active || this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            const grad = ctx.createLinearGradient(
                this.x, this.y,
                this.x - Math.cos(this.angle) * this.length,
                this.y - Math.sin(this.angle) * this.length
            );
            grad.addColorStop(0, '#c9a84c');
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x - Math.cos(this.angle) * this.length,
                this.y - Math.sin(this.angle) * this.length
            );
            ctx.stroke();
            ctx.restore();
        }
    }

    // Star particles (tiny gold dots)
    class Star {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.r = Math.random() * 1.5 + 0.3;
            this.baseOpacity = Math.random() * 0.3 + 0.05;
            this.phase = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 0.02 + 0.005;
        }
        update() { this.phase += this.speed; }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.baseOpacity * (0.5 + 0.5 * Math.sin(this.phase));
            ctx.fillStyle = '#c9a84c';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    const particles = Array.from({length: 28}, () => new Particle());
    const streaks = Array.from({length: 12}, () => new Streak());
    const stars = Array.from({length: 80}, () => new Star());

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Deep gradient bg
        const grad = ctx.createRadialGradient(
            canvas.width * 0.4, canvas.height * 0.4, 0,
            canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
        );
        grad.addColorStop(0, 'rgba(20,18,28,1)');
        grad.addColorStop(0.5, 'rgba(10,10,15,1)');
        grad.addColorStop(1, 'rgba(5,5,8,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(s => { s.update(); s.draw(); });
        streaks.forEach(s => { s.update(); s.draw(); });
        particles.forEach(p => { p.update(); p.draw(); });

        requestAnimationFrame(loop);
    }
    loop();
}

// ─── APP INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    initializeApp();
});

window.addEventListener('firebaseReady', function() {
    updateConnectionStatus('online');
});

function initializeApp() {
    elements = {
        connectionStatus: document.getElementById('connectionStatus'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        forgotPasswordForm: document.getElementById('forgotPasswordForm'),
        loginFormElement: document.getElementById('loginFormElement'),
        registerFormElement: document.getElementById('registerFormElement'),
        forgotPasswordFormElement: document.getElementById('forgotPasswordFormElement'),
        googleSignInBtn: document.getElementById('googleSignInBtn'),
        googleSignUpBtn: document.getElementById('googleSignUpBtn'),
        loginBtn: document.getElementById('loginBtn'),
        registerBtn: document.getElementById('registerBtn'),
        forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        registerUsername: document.getElementById('registerUsername'),
        registerEmail: document.getElementById('registerEmail'),
        registerPassword: document.getElementById('registerPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        forgotPasswordEmail: document.getElementById('forgotPasswordEmail'),
        loginError: document.getElementById('loginError'),
        loginSuccess: document.getElementById('loginSuccess'),
        registerError: document.getElementById('registerError'),
        registerSuccess: document.getElementById('registerSuccess'),
        forgotPasswordError: document.getElementById('forgotPasswordError'),
        forgotPasswordSuccess: document.getElementById('forgotPasswordSuccess'),
        passwordStrength: document.getElementById('passwordStrength'),
        strengthFill: document.getElementById('strengthFill'),
        strengthText: document.getElementById('strengthText'),
        debugInfo: document.getElementById('debugInfo')
    };

    setupEventListeners();
    setupPasswordStrength();
    checkInitialConnection();
}

function setupEventListeners() {
    if (elements.loginFormElement) elements.loginFormElement.addEventListener('submit', handleLogin);
    if (elements.registerFormElement) elements.registerFormElement.addEventListener('submit', handleRegister);
    if (elements.forgotPasswordFormElement) elements.forgotPasswordFormElement.addEventListener('submit', handleForgotPassword);
    if (elements.googleSignInBtn) elements.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    if (elements.googleSignUpBtn) elements.googleSignUpBtn.addEventListener('click', handleGoogleSignUp);
    if (elements.registerPassword) elements.registerPassword.addEventListener('input', updatePasswordStrength);
}

function setupPasswordStrength() {
    if (elements.registerPassword) {
        elements.registerPassword.addEventListener('focus', () => {
            if (elements.passwordStrength) elements.passwordStrength.style.display = 'block';
        });
    }
}

function checkInitialConnection() {
    updateConnectionStatus('checking');
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
    const labels = { online: '● Connected', offline: '● Offline', checking: '● Connecting' };
    elements.connectionStatus.textContent = labels[status] || labels.checking;
}

// ─── FORM HANDLERS ──────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const email = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;
    if (!email || !password) { showMessage('loginError', 'Please fill in all fields'); return; }
    setButtonLoading(elements.loginBtn, true);
    clearMessages();
    try {
        const result = await window.FirebaseAuth.signInWithEmailPassword(email, password);
        if (result.success) {
            showMessage('loginSuccess', result.message);
            setTimeout(() => redirectToMainApp(result.user), 1000);
        } else {
            showMessage('loginError', result.message);
        }
    } catch (error) {
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
    if (!username || !email || !password || !confirmPassword) { showMessage('registerError', 'Please fill in all fields'); return; }
    if (password !== confirmPassword) { showMessage('registerError', 'Passwords do not match'); return; }
    if (password.length < 6) { showMessage('registerError', 'Password must be at least 6 characters'); return; }
    setButtonLoading(elements.registerBtn, true);
    clearMessages();
    try {
        const result = await window.FirebaseAuth.createUserWithEmailPassword(email, password, username);
        if (result.success) {
            showMessage('registerSuccess', result.message);
            elements.registerFormElement.reset();
            elements.passwordStrength.style.display = 'none';
            setTimeout(() => { showLogin(); showMessage('loginSuccess', 'Account created! Please sign in.'); }, 2000);
        } else {
            showMessage('registerError', result.message);
        }
    } catch (error) {
        showMessage('registerError', 'Registration failed. Please try again.');
    } finally {
        setButtonLoading(elements.registerBtn, false);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = elements.forgotPasswordEmail.value.trim();
    if (!email) { showMessage('forgotPasswordError', 'Please enter your email'); return; }
    setButtonLoading(elements.forgotPasswordBtn, true);
    clearMessages();
    try {
        const result = await window.FirebaseAuth.sendPasswordReset(email);
        if (result.success) {
            showMessage('forgotPasswordSuccess', result.message);
            elements.forgotPasswordFormElement.reset();
            setTimeout(() => showLogin(), 3000);
        } else {
            showMessage('forgotPasswordError', result.message);
        }
    } catch (error) {
        showMessage('forgotPasswordError', 'Password reset failed. Please try again.');
    } finally {
        setButtonLoading(elements.forgotPasswordBtn, false);
    }
}

async function handleGoogleSignIn() {
    if (!window.FirebaseAuth || !window.FirebaseAuth.ready()) { showMessage('loginError', 'Authentication service not ready.'); return; }
    setButtonLoading(elements.googleSignInBtn, true);
    clearMessages();
    try {
        const result = await window.FirebaseAuth.signInWithGoogle();
        if (result.success) {
            showMessage('loginSuccess', result.message);
            setTimeout(() => redirectToMainApp(result.user), 1000);
        } else {
            showMessage('loginError', result.message);
        }
    } catch (error) {
        showMessage('loginError', 'Google sign in failed. Please try again.');
    } finally {
        setButtonLoading(elements.googleSignInBtn, false);
    }
}

async function handleGoogleSignUp() {
    if (!window.FirebaseAuth || !window.FirebaseAuth.ready()) { showMessage('registerError', 'Authentication service not ready.'); return; }
    setButtonLoading(elements.googleSignUpBtn, true);
    clearMessages();
    try {
        const result = await window.FirebaseAuth.signInWithGoogle();
        if (result.success) {
            showMessage('registerSuccess', result.message);
            setTimeout(() => redirectToMainApp(result.user), 1000);
        } else {
            showMessage('registerError', result.message);
        }
    } catch (error) {
        showMessage('registerError', 'Google sign up failed.');
    } finally {
        setButtonLoading(elements.googleSignUpBtn, false);
    }
}

// ─── UI HELPERS ─────────────────────────────────────────────────────
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
    ['loginForm','registerForm','forgotPasswordForm'].forEach(id => {
        if (elements[id]) elements[id].classList.add('hidden');
    });
}

function clearMessages() {
    ['loginError','loginSuccess','registerError','registerSuccess','forgotPasswordError','forgotPasswordSuccess'].forEach(id => {
        if (elements[id]) { elements[id].style.display = 'none'; elements[id].textContent = ''; }
    });
}

function showMessage(elementId, message) {
    const el = elements[elementId];
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    if (elementId.includes('Success')) setTimeout(() => { el.style.display = 'none'; }, 5000);
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
        const labels = {
            loginBtn: 'Sign In',
            registerBtn: 'Create Account',
            forgotPasswordBtn: 'Send Reset Link',
            googleSignInBtn: 'Continue with Google',
            googleSignUpBtn: 'Sign up with Google'
        };
        const key = Object.keys(elements).find(k => elements[k] === button);
        btnText.textContent = labels[key] || 'Submit';
    }
}

function updatePasswordStrength() {
    if (!elements.registerPassword || !elements.strengthFill || !elements.strengthText) return;
    const password = elements.registerPassword.value;
    const strength = calculatePasswordStrength(password);
    elements.strengthFill.className = `strength-fill strength-${strength.level}`;
    elements.strengthText.textContent = strength.text;
    elements.passwordStrength.style.display = password.length ? 'block' : 'none';
}

function calculatePasswordStrength(password) {
    if (!password) return { level: 'weak', text: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score < 2) return { level: 'weak', text: 'Weak' };
    if (score < 4) return { level: 'fair', text: 'Fair' };
    if (score < 5) return { level: 'good', text: 'Good' };
    return { level: 'strong', text: 'Strong' };
}

function togglePassword(fieldId, toggleElement) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.type = field.type === 'password' ? 'text' : 'password';
    toggleElement.textContent = field.type === 'password' ? '👁️' : '🙈';
}

function toggleDebug() {
    const d = elements.debugInfo;
    const t = document.querySelector('.debug-toggle');
    if (!d || !t) return;
    const show = d.style.display !== 'block';
    d.style.display = show ? 'block' : 'none';
    t.textContent = show ? 'Hide Debug' : 'Show Debug';
}

function retryConnection() {
    updateConnectionStatus('checking');
    setTimeout(() => {
        updateConnectionStatus(window.FirebaseAuth && window.FirebaseAuth.ready() ? 'online' : 'offline');
    }, 1000);
}

function continueOffline() {
    alert('Offline mode not implemented yet. Please check your connection and try again.');
}

function redirectToMainApp(user) {
    ['chess_user_id','chess_user_email','chess_user_name','chess_user_photo'].forEach(key => {
        const map = { chess_user_id: user.uid, chess_user_email: user.email, chess_user_name: user.displayName || user.email, chess_user_photo: user.photoURL || '' };
        sessionStorage.setItem(key, map[key]);
        localStorage.setItem(key, map[key]);
    });
    try { window.location.href = 'chessmaininterface.html'; }
    catch (e) { window.location.replace('chessmaininterface.html'); }
}

// Global exports
Object.assign(window, { showLogin, showRegister, showForgotPassword, togglePassword, toggleDebug, retryConnection, continueOffline });