import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Plus, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Inspection {
  id: string; type_code: string; type_name: string;
  inspector_name: string; shop_no: string; shop_name: string;
  submitted_at: string; notes: string;
}

const TYPE_BADGE: Record<string, string> = {
  daily_general:   'bg-blue-100 text-blue-700',
  daily_hse:       'bg-orange-100 text-orange-700',
  ceiling_closure: 'bg-purple-100 text-purple-700',
  pre_opening:     'bg-yellow-100 text-yellow-700',
  post_opening:    'bg-green-100 text-green-700',
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [types,       setTypes]       = useState<{ id: number; code: string; name: string }[]>([]);
  const [detail,      setDetail]      = useState<any | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inspections?limit=200'),
      api.get('/checklists/types'),
    ]).then(([ri, rt]) => {
      setInspections(ri.data);
      setTypes(rt.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = inspections.filter(i => {
    const q = search.toLowerCase();
    const matchQ = !q || i.shop_no.toLowerCase().includes(q) || i.shop_name.toLowerCase().includes(q) || i.inspector_name.toLowerCase().includes(q);
    const matchT = !typeFilter || i.type_code === typeFilter;
    return matchQ && matchT;
  });

  const openDetail = async (id: string) => {
    const r = await api.get(`/inspections/${id}`);
    setDetail(r.data);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600">Inspections</h1>
          <p className="text-sm text-gray-500">{filtered.length} records</p>
        </div>
        <Link to="/inspections/new" className="btn-primary"><Plus size={16}/> New Inspection</Link>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Shop, inspector…" className="input pl-8" />
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input">
            <option value="">All Types</option>
            {types.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Shop</th>
                <th className="th">Inspection Type</th>
                <th className="th">Inspector</th>
                <th className="th">Date & Time</th>
                <th className="th text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="td text-center text-gray-400 py-10">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-10">No inspections found</td></tr>
              )}
              {filtered.map(i => (
                <tr key={i.id} className="tr-hover">
                  <td className="td">
                    <p className="font-semibold text-brand-600">{i.shop_no}</p>
                    <p className="text-xs text-gray-400">{i.shop_name}</p>
                  </td>
                  <td className="td"><span className={`badge ${TYPE_BADGE[i.type_code] || 'bg-gray-100 text-gray-600'}`}>{i.type_name}</span></td>
                  <td className="td">{i.inspector_name}</td>
                  <td className="td text-xs">{format(new Date(i.submitted_at), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="td text-center">
                    <button onClick={() => openDetail(i.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-600">{detail.type_name}</h2>
                <p className="text-sm text-gray-500">{detail.shop_no} – {detail.shop_name} &nbsp;·&nbsp; {detail.inspector_name}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
            </div>
            <div className="px-6 py-4">
              {detail.notes && <p className="mb-4 text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">{detail.notes}</p>}
              <table className="table-base">
                <thead>
                  <tr><th className="th">Checklist Item</th><th className="th text-center w-28">Response</th><th className="th">Notes</th></tr>
                </thead>
                <tbody>
                  {detail.responses?.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="td text-xs">{r.item_text}</td>
                      <td className="td text-center">
                        <span className={`badge text-xs ${r.response==='OK'?'bg-green-100 text-green-700':r.response==='NOT OK'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-500'}`}>{r.response}</span>
                      </td>
                      <td className="td text-xs text-gray-400">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
