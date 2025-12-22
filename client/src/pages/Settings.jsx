import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useShortcuts } from '../context/ShortcutsContext';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { authAPI, usersAPI, sessionsAPI, twoFactorAPI } from '../services/api';
import { User, Moon, Sun, Lock, Save, Camera, Mail, Phone, Shield, Keyboard, Command, Info, Edit2, RotateCcw, Check, X, Monitor, Smartphone, LogOut } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shortcuts, updateShortcut, resetShortcut, resetAllShortcuts, loadShortcuts } = useShortcuts();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [shortcutForm, setShortcutForm] = useState({ modifierKeys: '', keyCode: '' });
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  // 2FA State
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await sessionsAPI.getAll();
      setSessions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
    if (activeTab === 'security') {
      fetch2FAStatus();
    }
  }, [activeTab]);

  const fetch2FAStatus = async () => {
    try {
      const response = await twoFactorAPI.getStatus();
      setTwoFAEnabled(response.data.enabled);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const response = await twoFactorAPI.setup();
      setQrCode(response.data.qrCode);
      setTwoFASecret(response.data.secret);
      setShow2FASetup(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      toast.warning('Please enter a 6-digit code');
      return;
    }
    setTwoFALoading(true);
    try {
      const response = await twoFactorAPI.verifySetup(twoFACode);
      setBackupCodes(response.data.backupCodes || []);
      setTwoFAEnabled(true);
      setTwoFACode('');
      toast.success('Two-Factor Authentication enabled!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const confirmed = await confirm({
      title: 'Disable Two-Factor Authentication',
      message: 'Are you sure you want to disable 2FA? This will make your account less secure.',
      type: 'warning',
      confirmText: 'Disable 2FA',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    
    setTwoFALoading(true);
    try {
      await twoFactorAPI.disable(passwordForm.currentPassword, '');
      setTwoFAEnabled(false);
      setShow2FASetup(false);
      setQrCode('');
      setBackupCodes([]);
      toast.success('Two-Factor Authentication disabled');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };


  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.update(user.id, profileForm);
      const updatedUser = { ...user, ...profileForm };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({ ...profileForm, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditingShortcut = (shortcut) => {
    setEditingShortcut(shortcut.id);
    setShortcutForm({
      modifierKeys: shortcut.modifierKeys,
      keyCode: shortcut.keyCode
    });
  };

  const cancelEditingShortcut = () => {
    setEditingShortcut(null);
    setShortcutForm({ modifierKeys: '', keyCode: '' });
  };

  const handleSaveShortcut = async (shortcutId) => {
    if (!shortcutForm.keyCode) {
      toast.error('Please enter a key');
      return;
    }
    setLoading(true);
    const result = await updateShortcut(shortcutId, shortcutForm);
    if (result.success) {
      toast.success('Shortcut updated!');
      setEditingShortcut(null);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleResetShortcut = async (shortcutId) => {
    const result = await resetShortcut(shortcutId);
    if (result.success) {
      toast.success('Shortcut reset to default!');
    } else {
      toast.error(result.error);
    }
  };

  const handleResetAllShortcuts = async () => {
    const confirmed = await confirm({
      title: 'Reset All Shortcuts',
      message: 'Reset all keyboard shortcuts to their default values?',
      type: 'warning',
      confirmText: 'Reset All',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    const result = await resetAllShortcuts();
    if (result.success) {
      toast.success('All shortcuts reset to defaults!');
    } else {
      toast.error(result.error);
    }
  };

  const handleKeyCapture = (e) => {
    e.preventDefault();
    const key = e.key.toUpperCase();
    // Ignore modifier keys themselves
    if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) return;
    setShortcutForm({ ...shortcutForm, keyCode: key });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'appearance', label: 'Appearance', icon: theme === 'light' ? Sun : Moon },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard }
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const cat = shortcut.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(shortcut);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 className="page-title" style={{ marginBottom: '1.5rem' }}>Settings</h2>

      {/* Tabs */}
      <div className="flex gap-sm" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: profileForm.avatar 
                    ? `url(${profileForm.avatar}) center/cover`
                    : 'linear-gradient(135deg, var(--primary), var(--success))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2.5rem',
                  fontWeight: 600
                }}>
                  {!profileForm.avatar && (user?.full_name?.charAt(0) || 'U')}
                </div>
                <label style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  border: '2px solid var(--surface)'
                }}>
                  <Camera size={16} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <h3>{user?.full_name}</h3>
                <p className="text-muted">{user?.email}</p>
                <span className="badge badge-primary">{user?.role}</span>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.6 }} />
                <small className="text-muted">Username cannot be changed</small>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label"><Mail size={14} /> Email</label>
                <input type="email" className="form-input" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={14} /> Phone</label>
                <input type="tel" className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 9876543210" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}><Lock size={20} /> Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Lock size={16} /> {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3><Shield size={20} /> Two-Factor Authentication</h3>
              {twoFAEnabled ? (
                <span className="badge badge-success">Enabled</span>
              ) : (
                <span className="badge badge-warning">Disabled</span>
              )}
            </div>
            
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Add an extra layer of security to your account by requiring a verification code from your authenticator app when logging in.
            </p>

            {!twoFAEnabled && !show2FASetup && (
              <button className="btn btn-primary" onClick={handleSetup2FA} disabled={twoFALoading}>
                <Shield size={16} /> {twoFALoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
              </button>
            )}

            {show2FASetup && !twoFAEnabled && (
              <div style={{ background: 'var(--background-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ marginBottom: '1rem' }}>Setup Authenticator App</h4>
                <ol style={{ marginBottom: '1.5rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                  <li>Download an authenticator app like Google Authenticator or Authy</li>
                  <li>Scan the QR code below with your authenticator app</li>
                  <li>Enter the 6-digit code from your app to verify</li>
                </ol>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  {qrCode && <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '200px', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)' }} />}
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.875rem' }}>Can't scan? Use manual entry</summary>
                    <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{twoFASecret}</code>
                  </details>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter 6-digit code"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" onClick={() => { setShow2FASetup(false); setQrCode(''); setTwoFACode(''); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleVerify2FA} disabled={twoFALoading || twoFACode.length !== 6}>
                    {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            )}

            {backupCodes.length > 0 && (
              <div style={{ marginTop: '1.5rem', background: 'rgba(var(--warning-rgb), 0.1)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--warning)' }}>
                <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>⚠️ Save Your Backup Codes</h4>
                <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                  These codes can be used to access your account if you lose your authenticator device. Each code can only be used once. Store them securely.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {backupCodes.map((code, idx) => (
                    <code key={idx} style={{ padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '0.875rem' }}>{code}</code>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  toast.success('Backup codes copied to clipboard!');
                }}>
                  Copy to Clipboard
                </button>
              </div>
            )}

            {twoFAEnabled && backupCodes.length === 0 && (
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleDisable2FA} disabled={twoFALoading}>
                {twoFALoading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3><Monitor size={20} /> Active Sessions</h3>
            {sessions.length > 1 && (
              <button 
                className="btn btn-ghost" 
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Log Out All Devices',
                    message: 'This will log you out from all other devices. Continue?',
                    type: 'warning',
                    confirmText: 'Log Out All',
                    cancelText: 'Cancel'
                  });
                  if (confirmed) {
                    try {
                      await sessionsAPI.revokeAll();
                      toast.success('Logged out from all other devices');
                      fetchSessions();
                    } catch (error) {
                      toast.error('Failed to log out from other devices');
                    }
                  }
                }}
              >
                <LogOut size={16} /> Log Out All Other Devices
              </button>
            )}
          </div>

          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            These are the devices currently logged into your account.
          </p>

          {sessionsLoading ? (
            <div className="loading-container" style={{ height: '200px' }}>
              <div className="spinner"></div>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted">No active sessions found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map(session => (
                <div 
                  key={session.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: session.is_current ? 'rgba(0, 191, 165, 0.1)' : 'var(--background-secondary)',
                    border: session.is_current ? '1px solid var(--success)' : '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: session.is_current ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      {session.device_info === 'Mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{session.browser} on {session.os}</strong>
                        {session.is_current && (
                          <span className="badge badge-success">Current</span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                        {session.ip_address || 'Unknown IP'} • Last active: {new Date(session.last_active).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        try {
                          await sessionsAPI.revoke(session.id);
                          toast.success('Session revoked');
                          fetchSessions();
                        } catch (error) {
                          toast.error('Failed to revoke session');
                        }
                      }}
                    >
                      <LogOut size={14} /> Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Theme Settings</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div
              onClick={() => theme !== 'light' && toggleTheme()}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                background: theme === 'light' ? 'rgba(21, 101, 192, 0.1)' : 'var(--surface-hover)',
                textAlign: 'center'
              }}
            >
              <Sun size={32} style={{ marginBottom: '0.5rem', color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)' }} />
              <h4>Light Mode</h4>
              <p className="text-sm text-muted">Clinical Blue theme</p>
            </div>
            <div
              onClick={() => theme !== 'dark' && toggleTheme()}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                background: theme === 'dark' ? 'rgba(0, 191, 165, 0.1)' : 'var(--surface-hover)',
                textAlign: 'center'
              }}
            >
              <Moon size={32} style={{ marginBottom: '0.5rem', color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)' }} />
              <h4>Dark Mode</h4>
              <p className="text-sm text-muted">Dark Charcoal theme</p>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Tab */}
      {activeTab === 'shortcuts' && (
        <div>
          {/* Command Palette Info */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.1), rgba(0, 191, 165, 0.1))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Command size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: '0.25rem' }}>Customize Keyboard Shortcuts</h3>
                <p className="text-muted" style={{ margin: 0 }}>
                  Click the edit button next to any shortcut to change it. Your shortcuts are saved automatically.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleResetAllShortcuts}>
                <RotateCcw size={16} /> Reset All
              </button>
            </div>
          </div>

          {/* Shortcuts List */}
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{category}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categoryShortcuts.map((shortcut) => (
                  <div 
                    key={shortcut.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem',
                      background: 'var(--background-secondary)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{shortcut.label}</span>
                    
                    {editingShortcut === shortcut.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select 
                          className="form-select" 
                          value={shortcutForm.modifierKeys}
                          onChange={(e) => setShortcutForm({ ...shortcutForm, modifierKeys: e.target.value })}
                          style={{ width: '100px', padding: '0.25rem 0.5rem' }}
                        >
                          <option value="Alt">Alt</option>
                          <option value="Ctrl">Ctrl</option>
                          <option value="Shift">Shift</option>
                          <option value="Ctrl+Shift">Ctrl+Shift</option>
                          <option value="Alt+Shift">Alt+Shift</option>
                        </select>
                        <span style={{ color: 'var(--text-muted)' }}>+</span>
                        <input
                          type="text"
                          className="form-input"
                          value={shortcutForm.keyCode}
                          onKeyDown={handleKeyCapture}
                          onChange={() => {}}
                          placeholder="Press key"
                          style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'center', textTransform: 'uppercase' }}
                        />
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleSaveShortcut(shortcut.id)}
                          disabled={loading}
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={cancelEditingShortcut}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <kbd style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontFamily: 'inherit',
                            color: 'var(--text-primary)',
                            boxShadow: '0 2px 0 var(--border)'
                          }}>{shortcut.modifierKeys}</kbd>
                          <span style={{ color: 'var(--text-muted)', lineHeight: '28px' }}>+</span>
                          <kbd style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontFamily: 'inherit',
                            color: 'var(--text-primary)',
                            boxShadow: '0 2px 0 var(--border)'
                          }}>{shortcut.keyCode}</kbd>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => startEditingShortcut(shortcut)}
                            title="Edit shortcut"
                          >
                            <Edit2 size={14} />
                          </button>
                          {shortcut.isCustomized && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleResetShortcut(shortcut.id)}
                              title="Reset to default"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="card" style={{ background: 'var(--background-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <strong>Tip:</strong> Click in the key input field and press the desired key to set it. Your shortcuts are saved to your account and sync across devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
