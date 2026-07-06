import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, Wallet, BarChart3, Users, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white border-r border-slate-100 flex flex-col
        transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 leading-4 text-[15px]">CM-PMS</p>
              <p className="text-[11px] text-slate-400 leading-3">Contracts &amp; Payments</p>
            </div>
          </div>
          <button className="lg:hidden p-1 text-slate-400" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.filter(item => !item.roles || item.roles.includes(user?.role)).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring ${
                  isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--color-primary)' } : {})}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)' }}>
            <p className="font-semibold mb-0.5">Need help?</p>
            <p className="text-[11px] leading-4 opacity-80">Hover any field for a quick tip. Contact your admin for access changes.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
