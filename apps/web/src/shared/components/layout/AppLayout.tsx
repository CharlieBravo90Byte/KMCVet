import { Outlet, NavLink, useNavigate } from 'react-router-dom';

function IconHome() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconPaw() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" />
      <ellipse cx="10" cy="4.5" rx="2" ry="2.5" />
      <ellipse cx="14" cy="4.5" rx="2" ry="2.5" />
      <ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" />
      <path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

const navGroups = [
  {
    label: 'PRINCIPAL',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: <IconHome /> }],
  },
  {
    label: 'CLÍNICA',
    items: [
      { to: '/atencion', label: 'Atención', icon: <IconCalendar /> },
      { to: '/animales', label: 'Registro Animales', icon: <IconPaw /> },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { to: '/inventario', label: 'Inventario', icon: <IconBox /> },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/configuracion', label: 'Configuración', icon: <IconSettings /> },
    ],
  },
];

export function AppLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('kmcvet_token');
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-green-900 text-white flex flex-col shadow-xl flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-6 h-6 text-green-900" fill="currentColor" viewBox="0 0 24 24">
                <ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" />
                <ellipse cx="10" cy="4.5" rx="2" ry="2.5" />
                <ellipse cx="14" cy="4.5" rx="2" ry="2.5" />
                <ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" />
                <path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base leading-tight tracking-wide">KMCVet</p>
              <p className="text-xs text-green-300 leading-tight">Gestión Veterinaria</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-green-500 px-3 mb-1.5 tracking-widest">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-emerald-400 text-green-900 shadow-sm'
                          : 'text-green-200 hover:bg-green-800 hover:text-white'
                      }`
                    }
                  >
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-green-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-xs font-bold text-emerald-300 flex-shrink-0">AD</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-100 truncate">Administrador</p>
              <p className="text-xs text-green-400 truncate">admin@demo.kmcvet.com</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-green-300 hover:bg-green-800 hover:text-white rounded-lg transition-colors"
          >
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <p className="text-xs text-gray-400 font-medium">Clínica Veterinaria Demo</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Sistema activo
          </span>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
