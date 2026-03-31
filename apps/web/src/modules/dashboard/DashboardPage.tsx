import { Link } from 'react-router-dom';

export function DashboardPage() {
  const stats = [
    { label: 'Citas hoy', value: '0', sub: 'programadas', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ), iconBg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-100' },
    { label: 'Animales registrados', value: '1', sub: 'pacientes', icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" /><ellipse cx="10" cy="4.5" rx="2" ry="2.5" /><ellipse cx="14" cy="4.5" rx="2" ry="2.5" /><ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" /><path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" /></svg>
    ), iconBg: 'bg-green-100 text-green-700', border: 'border-green-100' },
    { label: 'Productos en stock', value: '3', sub: 'referencias', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    ), iconBg: 'bg-teal-100 text-teal-700', border: 'border-teal-100' },
    { label: 'Alertas de stock', value: '0', sub: 'productos bajos', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
    ), iconBg: 'bg-amber-100 text-amber-700', border: 'border-amber-100' },
  ];

  const quickActions = [
    { to: '/atencion', label: 'Nueva cita', desc: 'Agendar consulta', color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', icon: '📅' },
    { to: '/animales', label: 'Nuevo animal', desc: 'Registrar paciente', color: 'border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700', icon: '🐾' },
    { to: '/inventario', label: 'Ver stock', desc: 'Control de inventario', color: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700', icon: '📦' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Bienvenida */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Panel de control</h1>
        <p className="text-gray-400 text-sm mt-0.5">Resumen general de la clínica</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl p-5 shadow-sm border ${s.border}`}>
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${s.iconBg}`}>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800 leading-none">{s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Acciones rápidas */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block"></span>
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map(({ to, label, desc, color, icon }) => (
              <Link key={to} to={to} className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${color}`}>
                <span className="text-2xl block mb-2">{icon}</span>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-green-500 rounded-full inline-block"></span>
            Estado del sistema
          </h2>
          <ul className="space-y-3">
            {[
              { label: 'API NestJS', ok: true },
              { label: 'Base de datos SQLite', ok: true },
              { label: 'Frontend PWA', ok: true },
              { label: 'Mód. Atención', ok: false, warn: true },
              { label: 'Mód. Inventario', ok: false, warn: true },
            ].map(({ label, ok, warn }) => (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${
                  ok ? 'text-emerald-600' : warn ? 'text-amber-500' : 'text-red-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${
                    ok ? 'bg-emerald-500' : warn ? 'bg-amber-400' : 'bg-red-400'
                  }`}></span>
                  {ok ? 'Activo' : 'En desarrollo'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
