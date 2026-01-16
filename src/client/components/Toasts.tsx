import type { Toast } from '../types.js';

type ToastsProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export const Toasts = ({ toasts, onDismiss }: ToastsProps) => (
  <div className="toasts" aria-live="polite" aria-atomic="false">
    {toasts.map((toast) => (
      <div key={toast.id} className="toast">
        <h3>{toast.title}</h3>
        <p>{toast.message}</p>
        <details>
          <summary>More details</summary>
          <pre>{toast.details}</pre>
        </details>
        <div className="toast-actions">
          <button
            className="primary"
            onClick={async () => {
              const payload = [
                `Context: ${toast.title}`,
                `Message: ${toast.message}`,
                `Details:`,
                toast.details,
              ].join('\n');
              try {
                await navigator.clipboard.writeText(payload);
              } catch {
                // ignore
              }
            }}
          >
            Copy details
          </button>
          <button onClick={() => onDismiss(toast.id)}>Dismiss</button>
        </div>
      </div>
    ))}
  </div>
);
