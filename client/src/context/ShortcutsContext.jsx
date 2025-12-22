import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { shortcutsAPI } from '../services/api';

const ShortcutsContext = createContext();

// Default shortcuts (fallback)
const DEFAULT_SHORTCUTS = [
  { id: 'command-palette', label: 'Command Palette', modifierKeys: 'Ctrl', keyCode: 'K', category: 'General' },
  { id: 'go-dashboard', label: 'Go to Dashboard', modifierKeys: 'Alt', keyCode: '1', category: 'Navigation' },
  { id: 'go-patients', label: 'Go to Patients', modifierKeys: 'Alt', keyCode: '2', category: 'Navigation' },
  { id: 'go-doctors', label: 'Go to Doctors', modifierKeys: 'Alt', keyCode: '3', category: 'Navigation' },
  { id: 'go-medicines', label: 'Go to Medicines', modifierKeys: 'Alt', keyCode: '4', category: 'Navigation' },
  { id: 'go-inventory', label: 'Go to Inventory', modifierKeys: 'Alt', keyCode: '5', category: 'Navigation' },
  { id: 'go-prescriptions', label: 'Go to Prescriptions', modifierKeys: 'Alt', keyCode: '6', category: 'Navigation' },
  { id: 'go-billing', label: 'Go to Billing', modifierKeys: 'Alt', keyCode: '7', category: 'Navigation' },
  { id: 'go-reports', label: 'Go to Reports', modifierKeys: 'Alt', keyCode: '8', category: 'Navigation' },
  { id: 'toggle-theme', label: 'Toggle Theme', modifierKeys: 'Alt', keyCode: 'T', category: 'Actions' },
];

// Navigation paths for shortcuts
const SHORTCUT_PATHS = {
  'go-dashboard': '/',
  'go-patients': '/patients',
  'go-doctors': '/doctors',
  'go-medicines': '/medicines',
  'go-inventory': '/inventory',
  'go-prescriptions': '/prescriptions',
  'go-billing': '/billing',
  'go-reports': '/reports',
};

export function ShortcutsProvider({ children }) {
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [loading, setLoading] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Load shortcuts from API
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadShortcuts();
    } else {
      setLoading(false);
    }
  }, []);

  const loadShortcuts = async () => {
    try {
      const response = await shortcutsAPI.getAll();
      setShortcuts(response.data);
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      setShortcuts(DEFAULT_SHORTCUTS);
    } finally {
      setLoading(false);
    }
  };

  const updateShortcut = async (shortcutId, data) => {
    try {
      await shortcutsAPI.update(shortcutId, data);
      await loadShortcuts();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update shortcut' 
      };
    }
  };

  const resetShortcut = async (shortcutId) => {
    try {
      await shortcutsAPI.reset(shortcutId);
      await loadShortcuts();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset shortcut' };
    }
  };

  const resetAllShortcuts = async () => {
    try {
      await shortcutsAPI.resetAll();
      await loadShortcuts();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset shortcuts' };
    }
  };

  const getShortcut = (shortcutId) => {
    return shortcuts.find(s => s.id === shortcutId);
  };

  const openCommandPalette = () => setCommandPaletteOpen(true);
  const closeCommandPalette = () => setCommandPaletteOpen(false);
  const toggleCommandPalette = () => setCommandPaletteOpen(prev => !prev);

  return (
    <ShortcutsContext.Provider value={{
      shortcuts,
      loading,
      updateShortcut,
      resetShortcut,
      resetAllShortcuts,
      getShortcut,
      loadShortcuts,
      commandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette
    }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}

// Hook for handling keyboard shortcuts
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { shortcuts, toggleCommandPalette } = useShortcuts();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        // Exception for Command Palette (Ctrl+K)
        if (!(e.ctrlKey && e.key.toLowerCase() === 'k')) {
          return;
        }
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.isEnabled === false) continue;

        const modifiers = shortcut.modifierKeys.toLowerCase();
        const key = shortcut.keyCode.toLowerCase();
        
        const ctrlMatch = modifiers.includes('ctrl') === (e.ctrlKey || e.metaKey);
        const altMatch = modifiers.includes('alt') === e.altKey;
        const shiftMatch = modifiers.includes('shift') === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === key;

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          
          // Handle the shortcut
          if (shortcut.id === 'command-palette') {
            toggleCommandPalette();
          } else if (shortcut.id === 'toggle-theme') {
            toggleTheme();
          } else if (SHORTCUT_PATHS[shortcut.id]) {
            navigate(SHORTCUT_PATHS[shortcut.id]);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, navigate, toggleTheme, toggleCommandPalette]);
}

export default ShortcutsContext;
