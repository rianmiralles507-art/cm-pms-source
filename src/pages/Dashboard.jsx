import { useEffect, useState } from 'react';
import { FileText, Activity, Clock, Wallet, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import api from '../api/axios';

const STATUS_COLORS = { Draft: '#94a3b8', Active: '#16a34a', Completed: '#2563eb', Terminated: '#dc2626' };
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

const ACTION_LABELS = {
  CREATE: 'created', UPDATE: 'updated', DELETE: 'deleted', APPROVE: 'approved',
  REJECT: 'rejected', MARK_PAID: 'marked as paid', LOGIN: 'logged in',
  AUTO_OVERDUE: 'flagged overdue (auto)', AUTO_COMPLETE: 'marked completed (auto)',
  AUTO_ACTIVATE: 'activated (auto)', TERMINATE: 'terminated', RESUBMIT: 'resubmitted',
  EXPORT_EXCEL: 'exported (Excel)', EXPORT_PDF: 'exported (PDF)', DEACTIVATE: 'deactivated',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Dashboard">
      {loading && <p className="text-slate-400 text-sm">Loading dashboard…</p>}
      {!loading && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Contracts" value={data.totalContracts} icon={FileText} tint="primary" hint="All contracts ever created" />
            <StatCard label="Active Contracts" value={data.activeContracts} icon={Activity} tint="accent" hint="Currently in force" />
            <StatCard label="Pending Approvals" value={data.pendingApprovals} icon={Clock} tint="warning" hint="Awaiting sign-off at any step" />
            <StatCard label="Total Payments Released" value={PESO.format(data.totalPaymentsReleased)} icon={Wallet} tint="accent" hint="Sum of all payments marked Paid" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <PieIcon size={16} className="text-slate-400" />
                <h3 className="font-display font-semibold text-slate-800 text-sm">Contract Status Distribution</h3>
              </div>
              {data.statusDistribution.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No contracts yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={data.statusDistribution} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {data.statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend verticalAlign="bottom" height={30} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-5 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-slate-400" />
                <h3 className="font-display font-semibold text-slate-800 text-sm">Monthly Payment Trends</h3>
              </div>
              {data.monthlyTrends.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No payments recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ReTooltip formatter={(v) => PESO.format(v)} />
                    <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} name="Amount Paid" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-slate-800 text-sm mb-4">Recent Activity</h3>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((log) => (
                  <li key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        <span className="font-medium">{log.user_name || 'System'}</span>{' '}
                        {ACTION_LABELS[log.action] || log.action.toLowerCase()}{' '}
                        <span className="text-slate-400">a {log.entity_type}</span>
                        {log.entity_id ? <span className="text-slate-400"> #{log.entity_id}</span> : null}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
