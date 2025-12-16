import React, { useEffect, useState, useRef } from "react";

// Dispatch a toast with:
// window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success'|'info'|'warning'|'error', title?: 'Title', message: '...', duration?: 5000 } }))

const TYPE_CONFIG = {
  success: {
    title: 'Success',
    border: 'border-l-4 border-green-500',
    bg: 'bg-green-50',
    icon: (
      <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    title: 'Info',
    border: 'border-l-4 border-blue-400',
    bg: 'bg-blue-50',
    icon: (
      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 9h1v4H9V9z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 11-0 12A6 6 0 0110 4z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    title: 'Warning',
    border: 'border-l-4 border-yellow-400',
    bg: 'bg-yellow-50',
    icon: (
      <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l5.454 9.69C18 14.53 17.11 16 15.86 16H4.14c-1.25 0-2.14-1.47-1.38-2.21l5.497-9.69zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    title: 'Error',
    border: 'border-l-4 border-red-500',
    bg: 'bg-red-50',
    icon: (
      <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9V6a1 1 0 112 0v3a1 1 0 11-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const handler = (e) => {
      const { type = 'info', message = '', title = undefined, duration = 5000 } = e.detail || {};
      const id = Date.now() + Math.random();
      const toast = { id, type, message, title, duration };
      setToasts((t) => [...t, toast]);

      if (duration && duration > 0) {
        setTimeout(() => {
          if (!mounted.current) return;
          setToasts((t) => t.filter((x) => x.id !== id));
        }, duration);
      }
    };

    window.addEventListener('app-toast', handler);
    // convenience global helper
    window.showToast = (type, message, title, duration) =>
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, message, title, duration } }));

    window.handleErrorToast = (err, _fallbackMessage = 'Transaction failed') => {
      try {
        const code = err?.code ?? err?.error?.code ?? null;
        const message = err?.message ?? err?.error?.message ?? '';

        // If user explicitly rejected the transaction, show a friendly warning
        if (code === 4001 || /user denied/i.test(message) || /rejected/i.test(message) || err?.reason === 'rejected' || String(code).toUpperCase().includes('ACTION_REJECTED')) {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'warning', message: 'You cancelled the transaction.', title: 'Action Cancelled' } }));
          return;
        }

        // Default: do not surface internal/console error details — show generic message
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: 'Transaction failed.', title: 'Error' } }));
      } catch (e) {
        console.error('handleErrorToast failure', e, err);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: 'Transaction failed.', title: 'Error' } }));
      }
    };

    return () => {
      mounted.current = false;
      window.removeEventListener('app-toast', handler);
      try { delete window.showToast; } catch (e) {}
    };
  }, []);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {toasts.map((t) => {
        const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.info;
        return (
          <div key={t.id} className={`w-full max-w-xs ${cfg.bg} ${cfg.border} rounded-lg shadow-lg overflow-hidden relative`}>
            <div className="flex p-4 gap-3">
              <div className="flex-shrink-0">{cfg.icon}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t.title || cfg.title}</div>
                    <div className="text-xs text-gray-600 mt-1 break-words whitespace-normal">{t.message}</div>
                  </div>
                  <button onClick={() => remove(t.id)} className="ml-2 text-gray-500 hover:text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
