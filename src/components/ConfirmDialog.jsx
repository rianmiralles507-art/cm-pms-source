import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 focus-ring">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 focus-ring"
            style={{ background: danger ? 'var(--color-danger)' : 'var(--color-primary)' }}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
