import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Store, AlertTriangle, ShieldAlert, TrendingUp, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FITOUT_COLORS: Record<string, string> = {
  'Not Started':    '#94a3b8',
  'Ongoing':        '#3b82f6',
  'Ceiling Closed': '#8b5cf6',
  'Ready to Open':  '#f59e0b',
  'Opened':         '#10b981',
};

const LEASE_COLORS: Record<string, string> = {
  Vacant: '#94a3b8',
  LOI:    '#f59e0b',
  Signed: '#10b981',
};

interface Stats {
  totalShops: number;
  byLease: Record<string, number>;
  byFitout: Record<string, number>;
  totalViolations: number; openViolations: number;
  totalIssues: number;     openIssues: number;
  shopCompletions: {
    id: string; shop_no: string; shop_name: string; fitout_status: string;
    ceiling_closure_pct: number | null; pre_opening_pct: number | null;
  }[];
}

function Kpi({ label, value, sub, color, icon: Icon }: { label: string; value: number; sub?: string; color: string; icon: any }) {
  return (
    <div className={`card flex items-start gap-4 border-l-4 ${color}`}>
      <div className="p-2 rounded-lg bg-gray-100"><Icon size={22} className="text-gray-600" /></div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function pctColor(p: number) {
  if (p === 100) return 'text-green-600 bg-green-100';
  if (p >= 75)   return 'text-yellow-700 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">Loading dashboard…</div>;
  if (!stats)  return <div className="text-red-500">Failed to load stats.</div>;

  const fitoutData = Object.entries(stats.byFitout).map(([name, value]) => ({ name, value }));
  const leaseData  = Object.entries(stats.byLease).map(([name, value]) => ({ name, value }));

  const shopsWithCC = stats.shopCompletions.filter(s => s.ceiling_closure_pct !== null);
  const shopsWithPO = stats.shopCompletions.filter(s => s.pre_opening_pct !== null);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-600">Dashboard</h1>
          <p className="text-sm text-gray-500">SUMOU GATE MADINAH – Real-time overview</p>
        </div>
        <button onClick={load} className="btn-secondary btn-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Shops"      value={stats.totalShops}     color="border-brand-600" icon={Store} />
        <Kpi label="Open Issues"      value={stats.openIssues}     sub={`${stats.totalIssues} total`}     color="border-red-400"    icon={AlertTriangle} />
        <Kpi label="Open Violations"  value={stats.openViolations} sub={`${stats.totalViolations} total`} color="border-orange-400" icon={ShieldAlert} />
        <Kpi label="In Progress"
          value={(stats.byFitout['Ongoing'] || 0) + (stats.byFitout['Ceiling Closed'] || 0) + (stats.byFitout['Ready to Open'] || 0)}
          sub="Ongoing + CC + Ready"
          color="border-blue-400" icon={TrendingUp} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Fit-Out status bar */}
        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 mb-4">Fit-Out Status Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fitoutData} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {fitoutData.map((entry, i) => (
                  <Cell key={i} fill={FITOUT_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lease status */}
        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 mb-4">Lease Status Summary</h2>
          <div className="space-y-3 mt-2">
            {leaseData.map(({ name, value }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{name}</span>
                  <span className="text-gray-500">{value} shops</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{ width: stats.totalShops ? `${(value / stats.totalShops) * 100}%` : '0%', backgroundColor: LEASE_COLORS[name] || '#94a3b8' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {leaseData.map(({ name, value }) => (
              <Link key={name} to={`/shops?lease=${name}`}
                className="bg-gray-50 rounded-lg p-3 text-center hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors cursor-pointer">
                <p className="text-xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Fitout status grid */}
      <div className="card">
        <h2 className="text-base font-semibold text-brand-600 mb-4">Fit-Out Status Counts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {['Not Started','Ongoing','Ceiling Closed','Ready to Open','Opened'].map(status => {
            const count = stats.byFitout[status] || 0;
            return (
              <Link key={status} to={`/shops?fitout=${status}`}
                className="rounded-xl p-4 text-center border-2 hover:shadow-md transition-all"
                style={{ borderColor: FITOUT_COLORS[status], backgroundColor: FITOUT_COLORS[status] + '18' }}>
                <p className="text-2xl font-bold" style={{ color: FITOUT_COLORS[status] }}>{count}</p>
                <p className="text-xs text-gray-600 mt-1">{status}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Completion % tables */}
      {shopsWithCC.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 mb-4">Ceiling Closure – Completion %</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr>
                <th className="th rounded-tl-lg">Shop No.</th>
                <th className="th">Shop Name</th>
                <th className="th">Fit-Out Status</th>
                <th className="th rounded-tr-lg text-center">Completion %</th>
              </tr></thead>
              <tbody>
                {shopsWithCC.map(s => (
                  <tr key={s.id} className="tr-hover">
                    <td className="td font-semibold">{s.shop_no}</td>
                    <td className="td">{s.shop_name}</td>
                    <td className="td">{s.fitout_status}</td>
                    <td className="td text-center">
                      <span className={`badge ${pctColor(s.ceiling_closure_pct!)}`}>
                        {s.ceiling_closure_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shopsWithPO.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 mb-4">Pre-Opening – Completion %</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr>
                <th className="th rounded-tl-lg">Shop No.</th>
                <th className="th">Shop Name</th>
                <th className="th">Fit-Out Status</th>
                <th className="th rounded-tr-lg text-center">Completion %</th>
              </tr></thead>
              <tbody>
                {shopsWithPO.map(s => (
                  <tr key={s.id} className="tr-hover">
                    <td className="td font-semibold">{s.shop_no}</td>
                    <td className="td">{s.shop_name}</td>
                    <td className="td">{s.fitout_status}</td>
                    <td className="td text-center">
                      <span className={`badge ${pctColor(s.pre_opening_pct!)}`}>
                        {s.pre_opening_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
