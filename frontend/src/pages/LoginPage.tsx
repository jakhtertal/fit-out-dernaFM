import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HardHat, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('admin@derna.com');
  const [password, setPassword] = useState('admin123');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-600">
      {/* Header band */}
      <div className="bg-brand-700 py-4 px-8 flex items-center gap-3 border-b border-brand-500">
        <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
          <HardHat size={20} className="text-brand-700" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">DERNA FM</p>
          <p className="text-brand-300 text-xs">SUMOU GATE MADINAH</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-brand-600 px-8 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gold mx-auto flex items-center justify-center mb-4">
                <HardHat size={32} className="text-brand-700" />
              </div>
              <h1 className="text-white text-2xl font-bold">Fit-Out Management</h1>
              <p className="text-brand-300 text-sm mt-1">Sign in to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="px-8 py-8 space-y-5">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" required autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pr-10" required
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-brand-300 text-xs mt-6">
            Default credentials: admin@derna.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
