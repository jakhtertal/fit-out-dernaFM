import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Store, ClipboardList, AlertTriangle,
  CheckSquare, Users, FileText, LogOut, HardHat, Menu, Settings,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const nav = [
  { to: '/',            label: 'Dashboard',           icon: LayoutDashboard, roles: null },
  { to: '/shops',       label: 'Shops',               icon: Store,           roles: null },
  { to: '/inspections', label: 'Inspections',         icon: ClipboardList,   roles: null },
  { to: '/issues',      label: 'Issues & Violations', icon: AlertTriangle,   roles: null },
  { to: '/checklists',  label: 'Checklists',          icon: CheckSquare,     roles: ['admin','manager'] },
  { to: '/users',       label: 'Users',               icon: Users,           roles: ['admin','manager'] },
  { to: '/reports',     label: 'Reports',             icon: FileText,        roles: null },
  { to: '/settings',    label: 'Settings',            icon: Settings,        roles: ['admin','manager'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin:            'Admin',
  manager:          'Manager',
  hseq_inspector:   'HSEQ Inspector',
  fitout_inspector: 'Fit-Out Inspector',
};

function BrandLogo({ size = 'full' }: { size?: 'full' | 'small' }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/logo')
      .then(r => r.ok ? setLogoUrl(`/api/settings/logo?t=${Date.now()}`) : setLogoUrl(null))
      .catch(() => setLogoUrl(null));
  }, []);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="DERNA FM Logo"
        className={size === 'full' ? 'h-12 max-w-[140px] object-contain' : 'h-8 max-w-[90px] object-contain'}
        onError={() => setLogoUrl(null)}
      />
    );
  }

  // Fallback: text logo
  return (
    <div className="flex items-center gap-2.5">
      <div className={`rounded-lg bg-gold flex items-center justify-center flex-shrink-0 ${size === 'full' ? 'w-10 h-10' : 'w-7 h-7'}`}>
        <HardHat size={size === 'full' ? 22 : 15} className="text-brand-700" />
      </div>
      {size === 'full' && (
        <div>
          <p className="text-white font-bold text-base leading-tight">DERNA FM</p>
          <p className="text-brand-300 text-[10px] leading-tight">SUMOU GATE MADINAH</p>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const visible = nav.filter(n => !n.roles || n.roles.includes(user?.role ?? ''));

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-4 border-b border-brand-500">
        <BrandLogo size="full" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-brand-200 hover:bg-brand-500/50 hover:text-white'
              }`
            }
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-brand-500">
        <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
        <p className="text-brand-300 text-xs mb-3">{ROLE_LABELS[user?.role ?? '']}</p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-brand-300 hover:text-white text-xs transition-colors">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-brand-600 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-60 h-full bg-brand-600 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1 rounded-lg hover:bg-gray-100" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 rounded-lg p-1.5">
                <BrandLogo size="small" />
              </div>
              <div>
                <p className="text-brand-600 font-bold text-sm leading-tight">DERNA FM</p>
                <p className="text-gray-400 text-[10px]">SUMOU GATE MADINAH</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[user?.role ?? '']}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
