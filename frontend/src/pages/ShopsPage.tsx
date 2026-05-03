import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Shop {
  id: string; shop_no: string; shop_name: string;
  floor: string; zone: string;
  lease_status: string; fitout_status: string;
  updated_at: string;
}

const LEASE_OPTIONS  = ['Vacant', 'LOI', 'Signed'];
const FITOUT_OPTIONS = ['Not Started', 'Ongoing', 'Ceiling Closed', 'Ready to Open', 'Opened'];

const FITOUT_BADGE: Record<string, string> = {
  'Not Started':   'bg-gray-100 text-gray-600',
  'Ongoing':       'bg-blue-100 text-blue-700',
  'Ceiling Closed':'bg-purple-100 text-purple-700',
  'Ready to Open': 'bg-yellow-100 text-yellow-700',
  'Opened':        'bg-green-100 text-green-700',
};
const LEASE_BADGE: Record<string, string> = {
  Vacant: 'bg-gray-100 text-gray-600',
  LOI:    'bg-orange-100 text-orange-700',
  Signed: 'bg-green-100 text-green-700',
};

const empty = { shop_no:'', shop_name:'', floor:'', zone:'', lease_status:'Vacant', fitout_status:'Not Started' };

export default function ShopsPage() {
  const { canManage } = useAuth();
  const [searchParams] = useSearchParams();
  const [shops,    setShops]   = useState<Shop[]>([]);
  const [search,   setSearch]  = useState('');
  const [filterLease,  setFilterLease]  = useState(searchParams.get('lease')  || '');
  const [filterFitout, setFilterFitout] = useState(searchParams.get('fitout') || '');
  const [modal,    setModal]   = useState(false);
  const [editing,  setEditing] = useState<Shop | null>(null);
  const [form,     setForm]    = useState({ ...empty });
  const [saving,   setSaving]  = useState(false);

  const load = () => api.get('/shops').then(r => setShops(r.data));
  useEffect(() => { load(); }, []);

  const filtered = shops.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.shop_no.toLowerCase().includes(q) || s.shop_name.toLowerCase().includes(q) || s.zone.toLowerCase().includes(q);
    const matchLease  = !filterLease  || s.lease_status  === filterLease;
    const matchFitout = !filterFitout || s.fitout_status === filterFitout;
    return matchSearch && matchLease && matchFitout;
  });

  const openNew  = () => { setEditing(null); setForm({ ...empty }); setModal(true); };
  const openEdit = (s: Shop) => { setEditing(s); setForm({ shop_no:s.shop_no, shop_name:s.shop_name, floor:s.floor, zone:s.zone, lease_status:s.lease_status, fitout_status:s.fitout_status }); setModal(true); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/shops/${editing.id}`, form);
        toast.success('Shop updated');
      } else {
        await api.post('/shops', form);
        toast.success('Shop added');
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const del = async (s: Shop) => {
    if (!confirm(`Delete shop ${s.shop_no} – ${s.shop_name}?`)) return;
    await api.delete(`/shops/${s.id}`);
    toast.success('Shop deleted');
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600">Shops</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {shops.length} shops</p>
        </div>
        {canManage && <button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Shop</button>}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Shop no, name, zone…" className="input pl-8" />
          </div>
        </div>
        <div>
          <label className="label">Lease Status</label>
          <select value={filterLease} onChange={e => setFilterLease(e.target.value)} className="input">
            <option value="">All</option>
            {LEASE_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fit-Out Status</label>
          <select value={filterFitout} onChange={e => setFilterFitout(e.target.value)} className="input">
            <option value="">All</option>
            {FITOUT_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(''); setFilterLease(''); setFilterFitout(''); }}
          className="btn-secondary btn-sm self-end"><X size={13} /> Clear</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Shop No.</th>
                <th className="th">Shop Name</th>
                <th className="th">Floor</th>
                <th className="th">Zone</th>
                <th className="th">Lease Status</th>
                <th className="th">Fit-Out Status</th>
                {canManage && <th className="th text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="td text-center text-gray-400 py-10">No shops found</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className="tr-hover">
                  <td className="td font-semibold text-brand-600">{s.shop_no}</td>
                  <td className="td">{s.shop_name}</td>
                  <td className="td">{s.floor}</td>
                  <td className="td">{s.zone}</td>
                  <td className="td"><span className={`badge ${LEASE_BADGE[s.lease_status]}`}>{s.lease_status}</span></td>
                  <td className="td"><span className={`badge ${FITOUT_BADGE[s.fitout_status]}`}>{s.fitout_status}</span></td>
                  {canManage && (
                    <td className="td text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Pencil size={14}/></button>
                        <button onClick={() => del(s)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-brand-600">{editing ? 'Edit Shop' : 'Add Shop'}</h2>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Shop No. *</label>
                  <input value={form.shop_no} onChange={e => setForm(f=>({...f,shop_no:e.target.value}))} className="input" required />
                </div>
                <div>
                  <label className="label">Floor *</label>
                  <input value={form.floor} onChange={e => setForm(f=>({...f,floor:e.target.value}))} className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Shop Name *</label>
                <input value={form.shop_name} onChange={e => setForm(f=>({...f,shop_name:e.target.value}))} className="input" required />
              </div>
              <div>
                <label className="label">Zone *</label>
                <input value={form.zone} onChange={e => setForm(f=>({...f,zone:e.target.value}))} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lease Status</label>
                  <select value={form.lease_status} onChange={e => setForm(f=>({...f,lease_status:e.target.value}))} className="input">
                    {LEASE_OPTIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                {editing && (
                  <div>
                    <label className="label">Fit-Out Status</label>
                    <select value={form.fitout_status} onChange={e => setForm(f=>({...f,fitout_status:e.target.value}))} className="input">
                      {FITOUT_OPTIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : (editing ? 'Update' : 'Add Shop')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
