import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, LayoutDashboard, Users, Stethoscope, Pill, Package, 
  FileText, Receipt, BarChart3, Settings, UserCog, LogOut, 
  Moon, Sun, Plus
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useShortcuts } from '../../context/ShortcutsContext';
import './CommandPalette.css';

const commands = [
  // Navigation
  { id: 'go-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, path: '/', category: 'Navigation' },
  { id: 'go-patients', label: 'Go to Patients', icon: Users, path: '/patients', category: 'Navigation' },
  { id: 'go-doctors', label: 'Go to Doctors', icon: Stethoscope, path: '/doctors', category: 'Navigation' },
  { id: 'go-medicines', label: 'Go to Medicines', icon: Pill, path: '/medicines', category: 'Navigation' },
  { id: 'go-inventory', label: 'Go to Inventory', icon: Package, path: '/inventory', category: 'Navigation' },
  { id: 'go-prescriptions', label: 'Go to Prescriptions', icon: FileText, path: '/prescriptions', category: 'Navigation' },
  { id: 'go-billing', label: 'Go to Billing', icon: Receipt, path: '/billing', category: 'Navigation' },
  { id: 'go-reports', label: 'Go to Reports', icon: BarChart3, path: '/reports', category: 'Navigation' },
  { id: 'go-users', label: 'Go to Users', icon: UserCog, path: '/users', category: 'Navigation' },
  { id: 'go-settings', label: 'Go to Settings', icon: Settings, path: '/settings', category: 'Navigation' },
  
  // Actions
  { id: 'new-patient', label: 'Add New Patient', icon: Plus, path: '/patients?action=new', category: 'Actions' },
  { id: 'new-medicine', label: 'Add New Medicine', icon: Plus, path: '/medicines?action=new', category: 'Actions' },
  { id: 'new-prescription', label: 'Create Prescription', icon: Plus, path: '/prescriptions?action=new', category: 'Actions' },
  { id: 'new-sale', label: 'Create New Sale', icon: Plus, path: '/billing?action=new', category: 'Actions' },
  
  // Settings
  { id: 'toggle-theme', label: 'Toggle Theme', icon: Moon, action: 'toggleTheme', category: 'Settings' },
  { id: 'logout', label: 'Logout', icon: LogOut, action: 'logout', category: 'Settings' },
];

export default function CommandPalette() {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { commandPaletteOpen, closeCommandPalette, shortcuts } = useShortcuts();

  // Filter commands
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      executeCommand(filteredCommands[selectedIndex]);
    }
  }, [filteredCommands, selectedIndex]);

  const executeCommand = (cmd) => {
    closeCommandPalette();
    
    if (cmd.action === 'toggleTheme') {
      toggleTheme();
    } else if (cmd.action === 'logout') {
      logout();
    } else if (cmd.path) {
      navigate(cmd.path);
    }
  };

  // Get shortcut display for a command
  const getShortcutDisplay = (cmdId) => {
    const shortcut = shortcuts.find(s => s.id === cmdId);
    if (shortcut && shortcut.isEnabled !== false) {
      return `${shortcut.modifierKeys}+${shortcut.keyCode}`;
    }
    return null;
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={closeCommandPalette}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-search">
          <Search size={20} className="command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="command-input"
          />
          <kbd className="command-shortcut">ESC</kbd>
        </div>
        
        <div className="command-list">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="command-group">
              <div className="command-category">{category}</div>
              {cmds.map((cmd) => {
                const globalIdx = filteredCommands.indexOf(cmd);
                const shortcutKey = getShortcutDisplay(cmd.id);
                return (
                  <button
                    key={cmd.id}
                    className={`command-item ${globalIdx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <cmd.icon size={18} className="command-item-icon" />
                    <span className="command-item-label">{cmd.label}</span>
                    {cmd.id === 'toggle-theme' && (
                      <span className="command-item-hint">
                        {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                      </span>
                    )}
                    {shortcutKey && (
                      <kbd className="command-item-shortcut">{shortcutKey}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="command-empty">No commands found</div>
          )}
        </div>

        <div className="command-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
