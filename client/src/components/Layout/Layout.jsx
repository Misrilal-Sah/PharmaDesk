import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from '../../context/SidebarContext';
import { useKeyboardShortcuts } from '../../context/ShortcutsContext';
import CommandPalette from '../CommandPalette/CommandPalette';


const pageTitles = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/doctors': 'Doctors',
  '/medicines': 'Medicines',
  '/inventory': 'Inventory',
  '/prescriptions': 'Prescriptions',
  '/billing': 'Billing & Sales',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings'
};

export default function Layout() {
  const location = useLocation();
  const { collapsed } = useSidebar();
  const title = pageTitles[location.pathname] || 'PharmaDesk';
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="app-container">
      <Sidebar />
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header title={title} />
        <div className="page-container">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
