import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InspType { id: number; code: string; name: string; }
interface CheckItem { id: string; item_text: string; order_index: number; }

export default function ChecklistsPage() {
  const { canManage } = useAuth();
  if (!canManage) return <Navigate to="/" replace />;

  const [types,    setTypes]    = useState<InspType[]>([]);
  const [selected, setSelected] = useState('');
  const [items,    setItems]    = useState<CheckItem[]>([]);
  const [newText,  setNewText]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [adding,   setAdding]   = useState(false);

  useEffect(() => {
    api.get('/checklists/types').then(r => {
      setTypes(r.data);
      if (r.data.length) setSelected(r.data[0].code);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api.get(`/checklists/${selected}`).then(r => setItems(r.data.items)).finally(() => setLoading(false));
  }, [selected]);

  const addItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const r = await api.post(`/checklists/${selected}/items`, { item_text: newText.trim() });
      setItems(prev => [...prev, r.data]);
      setNewText('');
      toast.success('Item added');
    } catch { toast.error('Failed to add item'); }
    finally { setAdding(false); }
  };

  const delItem = async (id: string) => {
    if (!confirm('Delete this checklist item?')) return;
    await api.delete(`/checklists/items/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item deleted');
  };

  const editItem = async (item: CheckItem, newText: string) => {
    if (!newText.trim() || newText === item.item_text) return;
    try {
      const r = await api.put(`/checklists/items/${item.id}`, { item_text: newText.trim() });
      setItems(prev => prev.map(i => i.id === item.id ? r.data : i));
      toast.success('Item updated');
    } catch { toast.error('Update failed'); }
  };

  const selectedType = types.find(t => t.code === selected);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Checklists</h1>
        <p className="text-sm text-gray-500">Manage checklist items for each inspection type</p>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {types.map(t => (
          <button key={t.code} onClick={() => setSelected(t.code)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              selected === t.code ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
            }`}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{selectedType?.name}</h2>
          <span className="badge bg-brand-100 text-brand-700">{items.length} items</span>
        </div>

        {loading && <p className="text-gray-400 text-sm animate-pulse">Loading…</p>}

        {!loading && items.map((item, idx) => (
          <EditableItem key={item.id} item={item} idx={idx} onDelete={delItem} onEdit={editItem} />
        ))}

        {!loading && items.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No items yet. Add one below.</p>
        )}

        {/* Add form */}
        <form onSubmit={addItem} className="flex gap-2 pt-3 border-t border-gray-100">
          <input
            value={newText} onChange={e => setNewText(e.target.value)}
            placeholder="New checklist item text…" className="input flex-1" required
          />
          <button type="submit" disabled={adding} className="btn-primary flex-shrink-0">
            <Plus size={15}/>{adding ? '…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditableItem({ item, idx, onDelete, onEdit }: {
  item: CheckItem; idx: number;
  onDelete: (id: string) => void;
  onEdit: (item: CheckItem, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text,    setText]    = useState(item.item_text);

  const save = () => {
    onEdit(item, text);
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-brand-200 group">
      <GripVertical size={16} className="text-gray-300 mt-0.5 flex-shrink-0"/>
      <span className="text-xs text-gray-400 font-semibold mt-0.5 w-5 flex-shrink-0">{idx + 1}.</span>
      {editing ? (
        <div className="flex-1 flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            className="input flex-1 text-sm" autoFocus onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape') { setText(item.item_text); setEditing(false); }}} />
          <button onClick={save} className="btn-primary btn-sm">Save</button>
          <button onClick={() => { setText(item.item_text); setEditing(false); }} className="btn-secondary btn-sm"><X size={13}/></button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-brand-600" onClick={() => setEditing(true)}>{item.item_text}</p>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 hover:bg-blue-50 rounded text-blue-500 text-xs">Edit</button>
            <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13}/></button>
          </div>
        </>
      )}
    </div>
  );
}
