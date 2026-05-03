import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface User { id: string; name: string; email: string; role: string; created_at: string; }

const ROLE_OPTIONS = [
  { value: 'admin',            label: 'Admin' },
  { value: 'manager',          label: 'Manager' },
  { value: 'hseq_inspector',   label: 'HSEQ Inspector' },
  { value: 'fitout_inspector', label: 'Fit-Out Inspector' },
];
const ROLE_BADGE: Record<string, string> = {
  admin:            'bg-red-100 text-red-700',
  manager:          'bg-purple-100 text-purple-700',
  hseq_inspector:   'bg-orange-100 text-orange-700',
  fitout_inspector: 'bg-blue-100 text-blue-700',
};

const emptyForm = { name:'', email:'', password:'', role:'fitout_inspector' };

export default function UsersPage() {
  const { canManage, isAdmin, user: me } = useAuth();
  if (!canManage) return <Navigate to="/" replace />;

  const [users,   setUsers]   = useState<User[]>([]);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form,    setForm]    = useState({ ...emptyForm });
  const [saving,  setSaving]  = useState(false);

  const load = () => api.get('/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ ...emptyForm }); setModal(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name:u.name, email:u.email, password:'', role:u.role }); setModal(true); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const del = async (u: User) => {
    if (u.id === me?.id) return toast.error('Cannot delete yourself');
    if (!confirm(`Delete user "${u.name}"?`)) return;
    await api.delete(`/users/${u.id}`);
    toast.success('User deleted');
    load();
  };

  const roleOptions = isAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter(r => r.value !== 'admin');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-600">Users</h1>
          <p className="text-sm text-gray-500">{users.length} users registered</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16}/> Add User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Created</th>
                <th className="th text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="tr-hover">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {u.id === me?.id && <span className="badge bg-gray-100 text-gray-500 text-xs">you</span>}
                    </div>
                  </td>
                  <td className="td text-sm">{u.email}</td>
                  <td className="td">
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>
                      {u.role === 'admin' && <ShieldCheck size={11} className="mr-1"/>}
                      {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="td text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="td text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Pencil size={14}/></button>
                      {isAdmin && u.id !== me?.id && (
                        <button onClick={() => del(u)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-brand-600">{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="input" required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="input" required disabled={!!editing}/>
              </div>
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} className="input" required={!editing}/>
              </div>
              <div>
                <label className="label">Role *</label>
                <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} className="input">
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : (editing ? 'Update' : 'Create User')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
