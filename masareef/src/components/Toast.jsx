export default function Toast({ toast, onHide }) {
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => { toast.action.run(); onHide(); }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
