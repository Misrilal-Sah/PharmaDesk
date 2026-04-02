import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, twoFactorAPI } from '../services/api';
import { Eye, EyeOff, LogIn, Mail, ArrowLeft, RefreshCw, Shield, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import './Login.css';

function OTPInput({ otpValues, otpRefs, error, onOtpChange, onOtpKeyDown, onOtpPaste }) {
  return (
    <div className="otp-container">
      <div className="otp-boxes">
        {otpValues.map((value, index) => (
          <input
            key={index}
            ref={otpRefs[index]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => onOtpChange(index, e.target.value)}
            onKeyDown={(e) => onOtpKeyDown(index, e)}
            onPaste={onOtpPaste}
            className={`otp-box ${value ? 'filled' : ''} ${error ? 'error' : ''}`}
            autoFocus={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswords, setShowResetPasswords] = useState({ new: false, confirm: false });
  const [pendingEmail, setPendingEmail] = useState('');
  const [pending2FAUserId, setPending2FAUserId] = useState(null);
  
  // OTP Input refs
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'Staff',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // OTP input handler
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const wasEmpty = !otpValues[index];
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);
    setError('');

    // Auto-focus next input only when filling an empty box (not editing)
    if (value && wasEmpty && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (otpValues[index]) {
        // Box has a digit — clear it and stay on current box
        const newOtp = [...otpValues];
        newOtp[index] = '';
        setOtpValues(newOtp);
        setError('');
      } else if (index > 0) {
        // Box already empty — clear previous box and focus it
        const newOtp = [...otpValues];
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
        setError('');
        otpRefs[index - 1].current?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(paste)) return;
    
    const newOtp = paste.split('').concat(['', '', '', '', '', '']).slice(0, 6);
    setOtpValues(newOtp);
    otpRefs[Math.min(paste.length, 5)].current?.focus();
  };

  const getOtp = () => otpValues.join('');

  const resetOtp = () => setOtpValues(['', '', '', '', '', '']);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(formData.username, formData.password);
      if (result.requires2FA) {
        setPending2FAUserId(result.userId);
        setMode('2fa');
        resetOtp();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    const code = getOtp();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await twoFactorAPI.verify(pending2FAUserId, code);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.register(formData);
      if (response.data.requiresVerification) {
        setPendingEmail(response.data.email);
        setMode('verify');
        setMessage('We sent a 6-digit code to your email');
        resetOtp();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otp = getOtp();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifySignup({ email: pendingEmail, otp });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.resendOTP({ email: pendingEmail, type: 'signup' });
      setMessage('New code sent to your email');
      resetOtp();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword({ email: formData.email });
      setPendingEmail(formData.email);
      setMode('reset');
      setMessage('Reset code sent to your email');
      resetOtp();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const otp = getOtp();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({ 
        email: pendingEmail, 
        otp, 
        newPassword: formData.newPassword 
      });
      setMessage('Password reset successful!');
      setTimeout(() => {
        setMode('login');
        setMessage('');
        resetOtp();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const renderOTPInput = () => (
    <OTPInput
      otpValues={otpValues}
      otpRefs={otpRefs}
      error={error}
      onOtpChange={handleOtpChange}
      onOtpKeyDown={handleOtpKeyDown}
      onOtpPaste={handleOtpPaste}
    />
  );

  const renderForm = () => {
    switch (mode) {
      case '2fa':
        return (
          <div className="auth-card">
            <div className="auth-icon verify">
              <Shield size={32} />
            </div>
            <h2>Two-Factor Authentication</h2>
            <p className="login-subtitle">
              Enter the 6-digit code from your authenticator app
            </p>
            
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <form onSubmit={handle2FAVerify}>
              {renderOTPInput()}
              
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || getOtp().length !== 6}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : <>
                  <Shield size={18} /> Verify & Sign In
                </>}
              </button>
            </form>
            
            <div className="auth-footer">
              <p className="resend-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Use a backup code if you can't access your authenticator app
              </p>
              <button type="button" className="link-btn back-link" onClick={() => { setMode('login'); resetOtp(); setPending2FAUserId(null); }}>
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          </div>
        );

      case 'verify':
        return (
          <div className="auth-card">
            <div className="auth-icon verify">
              <Shield size={32} />
            </div>
            <h2>Verify Your Email</h2>
            <p className="login-subtitle">
              Enter the 6-digit code sent to<br />
              <strong>{pendingEmail}</strong>
            </p>
            
            {message && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} /> {message}
              </div>
            )}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <form onSubmit={handleVerifyOTP}>
              {renderOTPInput()}
              
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || getOtp().length !== 6}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : <>
                  <CheckCircle2 size={18} /> Verify & Continue
                </>}
              </button>
            </form>
            
            <div className="auth-footer">
              <p className="resend-text">
                Didn't receive the code?{' '}
                <button type="button" className="link-btn" onClick={handleResendOTP} disabled={loading}>
                  <RefreshCw size={14} /> Resend
                </button>
              </p>
              <button type="button" className="link-btn back-link" onClick={() => { setMode('login'); resetOtp(); }}>
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          </div>
        );

      case 'forgot':
        return (
          <div className="auth-card">
            <div className="auth-icon forgot">
              <Mail size={32} />
            </div>
            <h2>Forgot Password?</h2>
            <p className="login-subtitle">No worries! Enter your email and we'll send you a reset code.</p>
            
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input with-icon"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : <>
                  Send Reset Code
                </>}
              </button>
            </form>
            
            <div className="auth-footer">
              <button type="button" className="link-btn back-link" onClick={() => setMode('login')}>
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          </div>
        );

      case 'reset':
        return (
          <div className="auth-card">
            <div className="auth-icon reset">
              <KeyRound size={32} />
            </div>
            <h2>Reset Password</h2>
            <p className="login-subtitle">
              Enter the code sent to<br />
              <strong>{pendingEmail}</strong>
            </p>
            
            {message && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} /> {message}
              </div>
            )}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Reset Code</label>
                {renderOTPInput()}
              </div>
              
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type={showResetPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="form-input with-icon"
                    placeholder="Create new password"
                    minLength={6}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowResetPasswords(p => ({ ...p, new: !p.new }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showResetPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type={showResetPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input with-icon"
                    placeholder="Confirm new password"
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowResetPasswords(p => ({ ...p, confirm: !p.confirm }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showResetPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : <>
                  <KeyRound size={18} /> Reset Password
                </>}
              </button>
            </form>
            
            <div className="auth-footer">
              <button type="button" className="link-btn back-link" onClick={() => { setMode('login'); resetOtp(); }}>
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          </div>
        );

      case 'register':
        return (
          <>
            <h2>Create Account</h2>
            <p className="login-subtitle">Sign up to get started</p>
            {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="form-input" placeholder="Enter your full name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} className="form-input" placeholder="Choose a username" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Create a password" minLength={6} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="form-select">
                  <option value="Staff">Staff</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : 'Create Account'}
              </button>
            </form>
            <div className="login-footer">
              <p>Already have an account? <button type="button" className="link-btn" onClick={() => setMode('login')}>Sign In</button></p>
            </div>
          </>
        );

      default:
        return (
          <>
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Sign in to your account</p>
            {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username or Email</label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} className="form-input" placeholder="Enter username or email" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Enter your password" required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="forgot-password-link">
                <button type="button" className="link-btn" onClick={() => setMode('forgot')}>Forgot Password?</button>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> : <><LogIn size={18} /> Sign In</>}
              </button>
            </form>
            <div className="login-footer">
              <p>Don't have an account? <button type="button" className="link-btn" onClick={() => setMode('register')}>Sign Up</button></p>
            </div>
          </>
        );
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <svg viewBox="0 0 60 60" className="logo-icon-large">
                <defs>
                  <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ffffff' }} />
                    <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.7)' }} />
                  </linearGradient>
                </defs>
                <rect x="12" y="9" width="27" height="33" rx="3" fill="none" stroke="url(#brandGrad)" strokeWidth="2.5" />
                <rect x="18" y="6" width="15" height="6" rx="1.5" fill="url(#brandGrad)" />
                <rect x="21" y="18" width="9" height="3" rx="1" fill="rgba(255,255,255,0.8)" />
                <rect x="24" y="15" width="3" height="9" rx="1" fill="rgba(255,255,255,0.8)" />
                <ellipse cx="45" cy="42" rx="12" ry="6" transform="rotate(-30 45 42)" fill="none" stroke="url(#brandGrad)" strokeWidth="2.5"/>
              </svg>
            </div>
            <h1>Pharma<span>Desk</span></h1>
            <p>Modern Pharmacy Management System</p>
            <div className="features-list">
              <div className="feature-item"><div className="feature-dot"></div><span>Patient &amp; Prescription Management</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Medicine Inventory Tracking</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Billing &amp; Sales Reports</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Secure Role-based Access</span></div>
            </div>
          </div>
        </div>
        <div className="login-form-section">
          <div className="login-form-container">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
}
