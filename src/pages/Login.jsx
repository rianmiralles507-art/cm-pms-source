import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@cmpms.com', password: 'Admin@123' },
  { label: 'Finance Officer', email: 'finance@cmpms.com', password: 'Finance@123' },
  { label: 'Approver', email: 'approver@cmpms.com', password: 'Approver@123' },
  { label: 'Encoder', email: 'encoder@cmpms.com', password: 'Encoder@123' },
];

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #eef6ff 0%, #f4f8fb 45%, #eafbf1 100%)' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900">CM-PMS</h1>
          <p className="text-sm text-slate-500 mt-1">Contract Management &amp; Payment Monitoring System</p>
        </div>

        <div className="card p-7">
          <h2 className="text-lg font-display font-semibold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-5">Log in to manage contracts, approvals, and payments.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-400 outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-400 outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Try a demo account</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                className="text-left px-3 py-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
              >
                <p className="text-xs font-medium text-slate-700">{acc.label}</p>
                <p className="text-[11px] text-slate-400">{acc.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
