import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Stethoscope,
  Pill,
  Package,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  ClipboardList
} from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
  { path: '/medicines', icon: Pill, label: 'Medicines' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
  { path: '/billing', icon: Receipt, label: 'Billing' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { path: '/users', icon: UserCog, label: 'Users' },
  { path: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile } = useSidebar();

  const isAdmin = user?.role === 'Admin';

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobile}
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={closeMobile}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <Link to="/" className="logo" onClick={closeMobile}>
            <svg viewBox="0 0 40 40" className="logo-icon">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#15803D' }} />
                  <stop offset="100%" style={{ stopColor: '#0369A1' }} />
                </linearGradient>
              </defs>
              <rect x="8" y="6" width="18" height="22" rx="2" fill="none" stroke="url(#logoGrad)" strokeWidth="2" />
              <rect x="12" y="4" width="10" height="4" rx="1" fill="url(#logoGrad)" />
              <rect x="14" y="12" width="6" height="2" rx="0.5" fill="#15803D" />
              <rect x="16" y="10" width="2" height="6" rx="0.5" fill="#15803D" />
              <ellipse cx="30" cy="26" rx="8" ry="4" transform="rotate(-30 30 26)" fill="none" stroke="url(#logoGrad)" strokeWidth="2" />
            </svg>
            {!collapsed && <span className="logo-text">Pharma<span>Desk</span></span>}
          </Link>
          <button
            className="collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.full_name || user?.username}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <span className="nav-label">Main Menu</span>}
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="nav-section">
              {!collapsed && <span className="nav-label">Administration</span>}
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={logout} title="Logout">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
