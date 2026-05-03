import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, MinusCircle, ChevronLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface Shop { id: string; shop_no: string; shop_name: string; fitout_status: string; }
interface InspType { id: number; code: string; name: string; allowed_roles: string; }
interface CheckItem { id: string; item_text: string; order_index: number; }
type RespVal = 'OK' | 'NOT OK' | 'N/A' | '';

interface Response { checklist_item_id: string; response: RespVal; notes: string; }

const ROLE_TYPES: Record<string, string[]> = {
  admin:            ['daily_general','daily_hse','ceiling_closure','pre_opening','post_opening'],
  manager:          ['daily_general','daily_hse','ceiling_closure','pre_opening','post_opening'],
  fitout_inspector: ['daily_general','ceiling_closure','pre_opening','post_opening'],
  hseq_inspector:   ['daily_hse'],
};

export default function InspectionFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [shops,      setShops]      = useState<Shop[]>([]);
  const [types,      setTypes]      = useState<InspType[]>([]);
  const [shopId,     setShopId]     = useState('');
  const [typeCode,   setTypeCode]   = useState('');
  const [items,      setItems]      = useState<CheckItem[]>([]);
  const [responses,  setResponses]  = useState<Response[]>([]);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/shops'), api.get('/checklists/types')]).then(([rs, rt]) => {
      setShops(rs.data);
      const allowed = ROLE_TYPES[user?.role ?? ''] || [];
      setTypes(rt.data.filter((t: InspType) => allowed.includes(t.code)));
    });
  }, [user]);

  useEffect(() => {
    if (!typeCode) { setItems([]); setResponses([]); return; }
    setLoadingItems(true);
    api.get(`/checklists/${typeCode}`).then(r => {
      setItems(r.data.items);
      setResponses(r.data.items.map((i: CheckItem) => ({ checklist_item_id: i.id, response: '' as RespVal, notes: '' })));
    }).finally(() => setLoadingItems(false));
  }, [typeCode]);

  const setResp = (idx: number, val: RespVal) =>
    setResponses(prev => prev.map((r, i) => i === idx ? { ...r, response: val } : r));
  const setNoteFor = (idx: number, val: string) =>
    setResponses(prev => prev.map((r, i) => i === idx ? { ...r, notes: val } : r));

  const allAnswered = responses.length > 0 && responses.every(r => r.response !== '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shopId || !typeCode) return toast.error('Select a shop and inspection type');
    if (!allAnswered) return toast.error('Please answer all checklist items');

    setSubmitting(true);
    try {
      await api.post('/inspections', { shop_id: shopId, type_code: typeCode, responses, notes });
      toast.success('Inspection submitted successfully!');
      navigate('/inspections');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const okCount    = responses.filter(r => r.response === 'OK').length;
  const notOkCount = responses.filter(r => r.response === 'NOT OK').length;
  const naCount    = responses.filter(r => r.response === 'N/A').length;
  const total      = responses.length;
  const pct        = total > 0 ? Math.round((okCount / total) * 100) : 0;

  const selectedShop = shops.find(s => s.id === shopId);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600"><ChevronLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-brand-600">New Inspection</h1>
          <p className="text-sm text-gray-500">Fill in all checklist items</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Shop & Type selectors */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Shop *</label>
            <select value={shopId} onChange={e => setShopId(e.target.value)} className="input" required>
              <option value="">— Select Shop —</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.shop_no} – {s.shop_name}</option>
              ))}
            </select>
            {selectedShop && (
              <p className="mt-1 text-xs text-gray-400">Fit-Out Status: <span className="font-semibold text-brand-600">{selectedShop.fitout_status}</span></p>
            )}
          </div>
          <div>
            <label className="label">Inspection Type *</label>
            <select value={typeCode} onChange={e => setTypeCode(e.target.value)} className="input" required>
              <option value="">— Select Type —</option>
              {types.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Checklist */}
        {loadingItems && <div className="card text-center text-gray-400 animate-pulse py-8">Loading checklist…</div>}

        {!loadingItems && items.length > 0 && (
          <>
            {/* Progress bar */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress: {responses.filter(r=>r.response!=='').length}/{total} answered</span>
                <span className="text-sm font-bold text-brand-600">{pct}% OK</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="text-green-600">✓ OK: {okCount}</span>
                <span className="text-red-600">✗ NOT OK: {notOkCount}</span>
                <span className="text-gray-500">— N/A: {naCount}</span>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const resp = responses[idx];
                return (
                  <div key={item.id} className={`card border-l-4 transition-colors ${
                    resp?.response === 'OK'     ? 'border-green-400 bg-green-50/30' :
                    resp?.response === 'NOT OK' ? 'border-red-400 bg-red-50/30' :
                    resp?.response === 'N/A'    ? 'border-gray-300 bg-gray-50/50' :
                    'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-800 flex-1 leading-snug">
                        <span className="font-semibold text-gray-400 mr-2">{idx + 1}.</span>
                        {item.item_text}
                      </p>
                      <div className="flex gap-2 flex-shrink-0">
                        <button type="button" onClick={() => setResp(idx, 'OK')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            resp?.response === 'OK' ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
                          }`}>
                          <CheckCircle size={13}/> OK
                        </button>
                        <button type="button" onClick={() => setResp(idx, 'NOT OK')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            resp?.response === 'NOT OK' ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
                          }`}>
                          <XCircle size={13}/> NOT OK
                        </button>
                        <button type="button" onClick={() => setResp(idx, 'N/A')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            resp?.response === 'N/A' ? 'bg-gray-400 text-white border-gray-400' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                          }`}>
                          <MinusCircle size={13}/> N/A
                        </button>
                      </div>
                    </div>
                    {resp?.response === 'NOT OK' && (
                      <div className="mt-3">
                        <input
                          value={resp.notes}
                          onChange={e => setNoteFor(idx, e.target.value)}
                          placeholder="Describe the issue (optional)"
                          className="input text-sm border-red-200 focus:ring-red-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* General notes */}
            <div className="card">
              <label className="label">General Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} className="input" placeholder="Any overall comments about this inspection…" />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting || !allAnswered} className="btn-primary px-6">
                <Send size={15}/>{submitting ? 'Submitting…' : 'Submit Inspection'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
