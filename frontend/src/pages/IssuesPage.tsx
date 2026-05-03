import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, X, CheckCircle2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Issue {
  id: string; type: string; description: string; status: string;
  shop_no: string; shop_name: string; shop_id: string;
  created_by: string; created_by_name: string;
  work_done_by_name?: string; closed_by_name?: string;
  created_at: string; updated_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  'Open':      'bg-red-100 text-red-700',
  'Work Done': 'bg-yellow-100 text-yellow-700',
  'Closed':    'bg-green-100 text-green-700',
};
const TYPE_BADGE: Record<string, string> = {
  issue:     'bg-blue-100 text-blue-700',
  violation: 'bg-orange-100 text-orange-700',
};

export default function IssuesPage() {
  const { user, canManage } = useAuth();
  const [issues,       setIssues]      = useState<Issue[]>([]);
  const [shops,        setShops]       = useState<{id:string;shop_no:string;shop_name:string}[]>([]);
  const [search,       setSearch]      = useState('');
  const [filterType,   setFilterType]  = useState('');
  const [filterStatus, setFilterStatus]= useState('');
  const [filterShop,   setFilterShop]  = useState('');
  const [loading,      setLoading]     = useState(true);
  // Manual add
  const [addModal, setAddModal] = useState(false);
  const [addForm,  setAddForm]  = useState({ shop_id:'', description:'' });
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/issues'), api.get('/shops')]).then(([ri, rs]) => {
      setIssues(ri.data);
      setShops(rs.data);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = issues.filter(i => {
    const q = search.toLowerCase();
    return (
      (!q || i.shop_no.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) &&
      (!filterType   || i.type === filterType) &&
      (!filterStatus || i.status === filterStatus) &&
      (!filterShop   || i.shop_id === filterShop)
    );
  });

  const updateStatus = async (issue: Issue, newStatus: string) => {
    try {
      await api.put(`/issues/${issue.id}/status`, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const addIssue = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.shop_id || !addForm.description) return;
    setSaving(true);
    try {
      await api.post('/issues', addForm);
      toast.success('Issue created');
      setAddModal(false);
      setAddForm({ shop_id:'', description:'' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const myOpenCount = issues.filter(i => i.created_by === user?.id && i.status === 'Open').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600">Issues & Violations</h1>
          <p className="text-sm text-gray-500">{filtered.length} records · {myOpenCount > 0 && <span className="text-red-500 font-medium">{myOpenCount} open by you</span>}</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary"><Plus size={16}/> Add Manually</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Shop, description…" className="input pl-8"/>
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input">
            <option value="">All</option>
            <option value="issue">Issue</option>
            <option value="violation">Violation</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="Work Done">Work Done</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="label">Shop</label>
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="input">
            <option value="">All Shops</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.shop_no} – {s.shop_name}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterShop(''); }} className="btn-secondary btn-sm self-end"><X size={13}/> Clear</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Shop</th>
                <th className="th">Type</th>
                <th className="th">Description</th>
                <th className="th">Status</th>
                <th className="th">Created By</th>
                <th className="th">Date</th>
                <th className="th text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="td text-center text-gray-400 py-10">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="td text-center text-gray-400 py-10">No records found</td></tr>
              )}
              {filtered.map(issue => (
                <tr key={issue.id} className="tr-hover">
                  <td className="td">
                    <p className="font-semibold text-brand-600 text-sm">{issue.shop_no}</p>
                    <p className="text-xs text-gray-400">{issue.shop_name}</p>
                  </td>
                  <td className="td"><span className={`badge capitalize ${TYPE_BADGE[issue.type]}`}>{issue.type}</span></td>
                  <td className="td max-w-xs">
                    <p className="text-sm truncate" title={issue.description}>{issue.description}</p>
                  </td>
                  <td className="td"><span className={`badge ${STATUS_BADGE[issue.status]}`}>{issue.status}</span></td>
                  <td className="td text-xs">
                    <p>{issue.created_by_name}</p>
                    {issue.work_done_by_name && <p className="text-gray-400">→ {issue.work_done_by_name}</p>}
                    {issue.closed_by_name    && <p className="text-gray-400">✓ {issue.closed_by_name}</p>}
                  </td>
                  <td className="td text-xs">{format(new Date(issue.created_at), 'dd/MM/yyyy')}</td>
                  <td className="td text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Inspector marks own Open issue as Work Done */}
                      {issue.status === 'Open' && issue.created_by === user?.id && (
                        <button onClick={() => updateStatus(issue, 'Work Done')}
                          title="Mark as Work Done"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300">
                          <CheckCircle2 size={12}/> Work Done
                        </button>
                      )}
                      {/* Manager closes Work Done */}
                      {issue.status === 'Work Done' && canManage && (
                        <button onClick={() => updateStatus(issue, 'Closed')}
                          title="Close Issue"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 border border-green-300">
                          <Lock size={12}/> Close
                        </button>
                      )}
                      {issue.status === 'Closed' && <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-brand-600">Add Issue/Violation</h2>
              <button onClick={() => setAddModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={addIssue} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Shop *</label>
                <select value={addForm.shop_id} onChange={e => setAddForm(f=>({...f,shop_id:e.target.value}))} className="input" required>
                  <option value="">— Select Shop —</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.shop_no} – {s.shop_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea value={addForm.description} onChange={e => setAddForm(f=>({...f,description:e.target.value}))}
                  rows={3} className="input" required placeholder="Describe the issue or violation…"/>
              </div>
              <p className="text-xs text-gray-400">
                Type will be automatically set based on your role ({user?.role === 'hseq_inspector' ? 'Violation' : 'Issue'}).
              </p>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
