import { useState } from 'react';
import { Menu, Search, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

export default function Topbar({ onMenuClick, title, onSearch }) {
  const { user, logout, roleLabel } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-100 flex items-center gap-3 px-4 sm:px-6">
      <button className="lg:hidden p-2 -ml-2 text-slate-500 focus-ring rounded-lg" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-display font-semibold text-slate-900 hidden sm:block whitespace-nowrap">{title}</h1>

      {onSearch && (
        <div className="flex-1 max-w-md ml-2 sm:ml-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search…"
              title="Search across records by title, name, or code"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-300 outline-none transition-colors"
            />
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 focus-ring"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-4">
            <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-[11px] text-slate-400">{roleLabel}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.email}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role]}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
