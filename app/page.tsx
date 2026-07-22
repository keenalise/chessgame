'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ChessBackground from '@/components/ChessBackground';
import {
  createUserWithEmailPassword,
  sendPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
} from '@/lib/firebase';
import styles from './page.module.css';

type FormMode = 'login' | 'register' | 'forgotPassword';

function calculatePasswordStrength(password: string): { level: string; text: string } {
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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const strength = calculatePasswordStrength(registerPassword);

  function switchMode(next: FormMode) {
    setMode(next);
    setLoginError('');
    setLoginSuccess('');
    setRegisterError('');
    setRegisterSuccess('');
    setForgotError('');
    setForgotSuccess('');
  }

  function goToDashboard() {
    router.push('/dashboard');
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please fill in all fields');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    setLoginSuccess('');
    const result = await signInWithEmailPassword(loginEmail.trim(), loginPassword);
    setLoginLoading(false);
    if (result.success) {
      setLoginSuccess(result.message);
      setTimeout(goToDashboard, 800);
    } else {
      setLoginError(result.message);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!registerUsername || !registerEmail || !registerPassword || !confirmPassword) {
      setRegisterError('Please fill in all fields');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }
    setRegisterLoading(true);
    setRegisterError('');
    const result = await createUserWithEmailPassword(registerEmail.trim(), registerPassword, registerUsername.trim());
    setRegisterLoading(false);
    if (result.success) {
      setRegisterSuccess(result.message);
      setTimeout(() => {
        switchMode('login');
        setLoginSuccess('Account created! Please sign in.');
      }, 1500);
    } else {
      setRegisterError(result.message);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your email');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    const result = await sendPasswordReset(forgotEmail.trim());
    setForgotLoading(false);
    if (result.success) {
      setForgotSuccess(result.message);
      setTimeout(() => switchMode('login'), 2000);
    } else {
      setForgotError(result.message);
    }
  }

  async function handleGoogle(target: 'login' | 'register') {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.success) {
      if (target === 'login') setLoginSuccess(result.message);
      else setRegisterSuccess(result.message);
      setTimeout(goToDashboard, 600);
    } else if (target === 'login') {
      setLoginError(result.message);
    } else {
      setRegisterError(result.message);
    }
  }

  return (
    <div className={styles.scene}>
      <ChessBackground />
      <div className={styles.boardOverlay} />
      <div className={styles.vignette} />

      <div className={styles.logoArea}>
        <div className={styles.crownWrap}>
          <span className={styles.crownIcon}>♔</span>
        </div>
        <h1 className={styles.brandName}>
          Keen <span>Chess</span>
        </h1>
        <p className={styles.brandTagline}>Master the Board</p>
      </div>

      <div className={styles.authCard}>
        {mode === 'login' && (
          <div className={styles.formSlide}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Welcome back</h2>
              <p className={styles.formSubtitle}>Sign in to continue your chess journey</p>
            </div>

            {loginError && <div className={styles.errorMessage}>{loginError}</div>}
            {loginSuccess && <div className={styles.successMessage}>{loginSuccess}</div>}

            <button
              type="button"
              className={styles.googleBtn}
              disabled={googleLoading}
              onClick={() => handleGoogle('login')}
            >
              Continue with Google
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label htmlFor="loginEmail">Email or Username</label>
                <input
                  id="loginEmail"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="loginPassword">Password</label>
                <input
                  id="loginPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                New here?{' '}
                <button type="button" className={styles.formLink} onClick={() => switchMode('register')}>
                  Create an account
                </button>
              </p>
              <p>
                <button type="button" className={styles.formLink} onClick={() => switchMode('forgotPassword')}>
                  Forgot password?
                </button>
              </p>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div className={styles.formSlide}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Join the board</h2>
              <p className={styles.formSubtitle}>Create your account and start playing</p>
            </div>

            {registerError && <div className={styles.errorMessage}>{registerError}</div>}
            {registerSuccess && <div className={styles.successMessage}>{registerSuccess}</div>}

            <button
              type="button"
              className={styles.googleBtn}
              disabled={googleLoading}
              onClick={() => handleGoogle('register')}
            >
              Sign up with Google
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <form onSubmit={handleRegister}>
              <div className={styles.formGroup}>
                <label htmlFor="registerUsername">Username</label>
                <input
                  id="registerUsername"
                  type="text"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  placeholder="YourChessName"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="registerEmail">Email</label>
                <input
                  id="registerEmail"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="registerPassword">Password</label>
                <input
                  id="registerPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                {registerPassword.length > 0 && (
                  <div className={styles.passwordStrength}>
                    <div className={styles.strengthBar}>
                      <div className={`${styles.strengthFill} ${styles[`strength-${strength.level}`]}`} />
                    </div>
                    <span>{strength.text}</span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={registerLoading}>
                {registerLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                Already have an account?{' '}
                <button type="button" className={styles.formLink} onClick={() => switchMode('login')}>
                  Sign In
                </button>
              </p>
            </div>
          </div>
        )}

        {mode === 'forgotPassword' && (
          <div className={styles.formSlide}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Reset password</h2>
              <p className={styles.formSubtitle}>We&apos;ll send a reset link to your email</p>
            </div>

            {forgotError && <div className={styles.errorMessage}>{forgotError}</div>}
            {forgotSuccess && <div className={styles.successMessage}>{forgotSuccess}</div>}

            <form onSubmit={handleForgotPassword}>
              <div className={styles.formGroup}>
                <label htmlFor="forgotEmail">Email Address</label>
                <input
                  id="forgotEmail"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={forgotLoading}>
                {forgotLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                <button type="button" className={styles.formLink} onClick={() => switchMode('login')}>
                  ← Back to Sign In
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
