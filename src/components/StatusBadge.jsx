const STYLES = {
  Active: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', dot: '#16a34a' },
  Paid: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', dot: '#16a34a' },
  Approved: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', dot: '#16a34a' },
  Completed: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', dot: '#16a34a' },

  Draft: { bg: 'var(--color-neutral-soft)', fg: 'var(--color-neutral)', dot: '#64748b' },
  Skipped: { bg: 'var(--color-neutral-soft)', fg: 'var(--color-neutral)', dot: '#64748b' },

  Pending: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', dot: '#d97706' },

  Overdue: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', dot: '#dc2626' },
  Rejected: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', dot: '#dc2626' },
  Terminated: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', dot: '#dc2626' },
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.Draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: style.bg, color: style.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
      {status}
    </span>
  );
}
