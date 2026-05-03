import { useState, useRef, useEffect, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Image, CheckCircle, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function SettingsPage() {
  const { canManage, isAdmin, user } = useAuth();
  if (!canManage) return <Navigate to="/" replace />;

  const [logoUrl,    setLogoUrl]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password change
  const [pwForm,    setPwForm]    = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw,  setSavingPw]  = useState(false);

  const refreshLogo = () => {
    fetch('/api/settings/logo')
      .then(r => r.ok ? setLogoUrl(`/api/settings/logo?t=${Date.now()}`) : setLogoUrl(null))
      .catch(() => setLogoUrl(null));
  };
  useEffect(refreshLogo, []);

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file (PNG, JPG, WEBP)');
    if (file.size > 5 * 1024 * 1024)     return toast.error('File must be smaller than 5 MB');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Logo uploaded! It will appear across all pages and reports.');
      refreshLogo();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const removeLogo = async () => {
    if (!confirm('Remove the company logo?')) return;
    try {
      await api.delete('/settings/logo');
      setLogoUrl(null);
      toast.success('Logo removed');
    } catch { toast.error('Failed to remove logo'); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogo(file);
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm)
      return toast.error('New passwords do not match');
    if (pwForm.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSavingPw(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Settings</h1>
        <p className="text-sm text-gray-500">Manage branding and account settings</p>
      </div>

      {/* ── Logo Upload ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-gray-800">Company Logo</h2>
        </div>
        <p className="text-sm text-gray-500">
          The logo appears in the sidebar, top header, and on all PDF/Excel reports.
          Accepted formats: PNG, JPG, WEBP · Max 5 MB.
        </p>

        {/* Current logo preview */}
        {logoUrl && (
          <div className="flex items-center gap-4 p-4 bg-brand-600 rounded-xl">
            <img src={logoUrl} alt="Current logo" className="h-16 max-w-[160px] object-contain bg-white rounded-lg p-2" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium flex items-center gap-1.5">
                <CheckCircle size={15} className="text-green-300" /> Logo is active
              </p>
              <p className="text-brand-300 text-xs mt-0.5">Showing on all pages and reports</p>
            </div>
            {isAdmin && (
              <button onClick={removeLogo} className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={28} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading…' : (logoUrl ? 'Click or drag to replace logo' : 'Click or drag to upload logo')}
          </p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5 MB</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFileChange} />
        </div>

        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <strong>Tip:</strong> Use a logo with a transparent background (PNG) for best results on the dark sidebar and PDF reports.
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-gray-800">Change Password</h2>
        </div>
        <p className="text-sm text-gray-500">Update your own account password.</p>

        <form onSubmit={changePw} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={pwForm.currentPassword}
              onChange={e => setPwForm(f=>({...f, currentPassword:e.target.value}))}
              className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(f=>({...f, newPassword:e.target.value}))}
                className="input" required minLength={6} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f=>({...f, confirm:e.target.value}))}
                className="input" required minLength={6} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPw} className="btn-primary">
              {savingPw ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── App Info ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Application Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Company</span>
            <span className="font-semibold text-gray-800">DERNA FM</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Project</span>
            <span className="font-semibold text-gray-800">SUMOU GATE MADINAH</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Database</span>
            <span className="font-semibold text-green-600">Firebase Firestore ✓</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Logged in as</span>
            <span className="font-semibold text-gray-800">{user?.name} ({user?.role})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
