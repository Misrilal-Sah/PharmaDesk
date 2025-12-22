import { useState, createContext, useContext, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        onConfirm: () => {
          setConfirmState(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState && (
        <div className="confirm-overlay" onClick={confirmState.onCancel}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className={`confirm-icon ${confirmState.type || 'warning'}`}>
              {confirmState.type === 'danger' ? <Trash2 size={28} /> : 
               confirmState.type === 'info' ? <Info size={28} /> : 
               <AlertTriangle size={28} />}
            </div>
            <h3 className="confirm-title">{confirmState.title || 'Confirm Action'}</h3>
            <p className="confirm-message">{confirmState.message || 'Are you sure you want to proceed?'}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={confirmState.onCancel}>
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button 
                className={`btn ${confirmState.type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
