export default function StatCard({ label, value, icon: Icon, tint = 'primary', hint }) {
  const tints = {
    primary: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
    accent: { bg: 'var(--color-accent-soft)', fg: 'var(--color-accent)' },
    warning: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    danger: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  };
  const t = tints[tint] || tints.primary;

  return (
    <div className="card p-5 flex items-start justify-between" title={hint}>
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
      {Icon && (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
