import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { notificationsAPI } from '../../services/api';
import { Bell, Search, X, Users, Stethoscope, Pill, FileText, Receipt, Check, AlertTriangle, Info, CheckCircle, Moon, Sun } from 'lucide-react';
import './Header.css';

const iconMap = {
  Users, Stethoscope, Pill, FileText, Receipt
};

const notificationIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertTriangle
};

export default function Header({ title }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await api.get('/search', { params: { q: searchQuery } });
        setSearchResults(response.data.results || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleResultClick = (result) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(result.path);
  };

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName];
    return Icon ? <Icon size={16} /> : null;
  };

  const getNotificationIcon = (type) => {
    const Icon = notificationIcons[type] || Info;
    return <Icon size={18} />;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-center" ref={searchRef}>
        <div className="header-search">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search patients, medicines, doctors..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searchQuery && (
            <button 
              className="search-clear" 
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <X size={16} />
            </button>
          )}

          {showResults && (searchResults.length > 0 || loading) && (
            <div className="search-dropdown">
              {loading ? (
                <div className="search-loading">Searching...</div>
              ) : (
                searchResults.map((result, idx) => (
                  <div 
                    key={`${result.type}-${result.id}-${idx}`} 
                    className="search-result-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className={`search-icon ${result.type}`}>
                      {getIcon(result.icon)}
                    </div>
                    <div className="search-info">
                      <span className="search-name">{result.name}</span>
                      <span className="search-code">{result.code}</span>
                    </div>
                    <span className="search-type">{result.type}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <div className="notification-wrapper" ref={notifRef}>
          <button 
            className="header-icon-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => !notif.is_read && markAsRead(notif.id)}
                    >
                      <div className={`notification-icon ${notif.type}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="notification-content">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                        <span className="notification-time">{formatTime(notif.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="header-user"
          onClick={() => navigate('/settings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/settings')}
          title="Settings"
          style={{ cursor: 'pointer' }}
        >
          <div className="user-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
