import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── tipos ──────────────────────────────────────────────────────
interface VentaHoy {
  id: string;
  fecha: string;
  total: number;
  tipoDoc: string;
}
interface DashStats {
  citasHoy: number;
  totalAnimales: number;
  totalProductos: number;
  stockBajo: number;
}
interface Meta { monto: number; tipo: 'diaria' | 'mensual' }

function fmt(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}
function hoy() { return new Date().toISOString().slice(0, 10); }

// ─── Gráfico de barras por hora (SVG nativo) ────────────────────
function GraficoVentasHoy({ ventas, meta }: { ventas: VentaHoy[]; meta?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Agrupar ventas por hora
  const porHora: Record<number, number> = {};
  ventas.forEach(v => {
    const h = new Date(v.fecha).getHours();
    porHora[h] = (porHora[h] ?? 0) + v.total;
  });

  // Horas activas (sólo las que tienen ventas, más hora actual)
  const horaActual = new Date().getHours();
  const horasConVentas = Object.keys(porHora).map(Number);
  const horasBase = Array.from({ length: horaActual + 1 }, (_, i) => i);
  const horas = Array.from(new Set([...horasBase, ...horasConVentas])).sort((a, b) => a - b);

  const maxVal = Math.max(...horas.map(h => porHora[h] ?? 0), 1);
  const total  = ventas.reduce((s, v) => s + v.total, 0);
  const pct    = meta ? Math.min((total / meta) * 100, 100) : null;

  const CHART_W = 480;
  const CHART_H = 90;
  const BAR_W   = Math.max(Math.floor((CHART_W - 4) / Math.max(horas.length, 1)) - 3, 6);
  const GAP     = Math.floor((CHART_W - 4) / Math.max(horas.length, 1));

  if (ventas.length === 0 && !meta) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        <p className="text-sm">Sin ventas registradas hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totales rápidos */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Ventas hoy</p>
          <p className="text-2xl font-bold text-gray-800">{fmt(total)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Transacciones</p>
          <p className="text-2xl font-bold text-gray-800">{ventas.length}</p>
        </div>
        {meta && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Meta diaria</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(meta)}</p>
          </div>
        )}
      </div>

      {/* Barra de progreso meta */}
      {meta && pct !== null && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso hacia la meta</span>
            <span className={`font-semibold ${pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-600'}`}>{Math.round(pct)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {pct >= 100 ? '✓ Meta alcanzada' : `Faltan ${fmt(meta - total)} para la meta`}
          </p>
        </div>
      )}

      {/* Gráfico SVG */}
      {horas.length > 0 && (
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 20}`} className="w-full" style={{ minWidth: '280px' }}>
            {/* Líneas de referencia */}
            {[0.25, 0.5, 0.75, 1].map(f => (
              <line key={f} x1={0} y1={CHART_H * (1 - f)} x2={CHART_W} y2={CHART_H * (1 - f)}
                stroke="#f0f0f0" strokeWidth={1} />
            ))}
            {/* Barras */}
            {horas.map((h, i) => {
              const val     = porHora[h] ?? 0;
              const barH    = val > 0 ? Math.max((val / maxVal) * CHART_H * 0.92, 4) : 2;
              const x       = i * GAP + 2;
              const y       = CHART_H - barH;
              const isHov   = hovered === h;
              const isActual = h === horaActual;
              return (
                <g key={h} onMouseEnter={() => setHovered(h)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
                  <rect x={x} y={y} width={BAR_W} height={barH}
                    rx={3}
                    fill={val > 0 ? (isHov ? '#059669' : '#10b981') : '#e5e7eb'}
                    opacity={isActual && val === 0 ? 0.5 : 1}
                  />
                  {/* Etiqueta hora */}
                  <text x={x + BAR_W / 2} y={CHART_H + 14} textAnchor="middle"
                    fontSize={9} fill={isActual ? '#374151' : '#9ca3af'} fontWeight={isActual ? 700 : 400}>
                    {h}h
                  </text>
                  {/* Tooltip */}
                  {isHov && val > 0 && (
                    <g>
                      <rect x={x - 18} y={y - 28} width={58} height={20} rx={4} fill="#111827" />
                      <text x={x + BAR_W / 2} y={y - 14} textAnchor="middle" fontSize={9} fill="white" fontWeight={600}>
                        {fmt(val)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {/* Línea meta en el gráfico */}
            {meta && meta > 0 && (() => {
              const y = CHART_H - (meta / maxVal) * CHART_H * 0.92;
              return y > 0 && y < CHART_H ? (
                <line x1={0} y1={y} x2={CHART_W} y2={y}
                  stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
              ) : null;
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────
export function DashboardPage() {
  const [ventasHoy, setVentasHoy]         = useState<VentaHoy[]>([]);
  const [totalVentas, setTotalVentas]     = useState(0);
  const [stats, setStats]                 = useState<DashStats>({ citasHoy: 0, totalAnimales: 0, totalProductos: 0, stockBajo: 0 });
  const [metaDiaria, setMetaDiaria]       = useState<number | undefined>();
  const [metaMensual, setMetaMensual]     = useState<number | undefined>();
  const [totalMes, setTotalMes]           = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const fecha = hoy();
    Promise.allSettled([
      apiClient.get(`/caja/ventas?fecha=${fecha}`),
      apiClient.get('/animales?limit=1'),
      apiClient.get('/inventario?limit=1'),
      apiClient.get('/metas/activa?tipo=diaria'),
      apiClient.get('/metas/activa?tipo=mensual'),
      apiClient.get(`/caja/total-mes?mes=${fecha.slice(0,7)}`),
      apiClient.get('/atencion/citas-hoy'),
    ]).then(([ventasRes, animalesRes, invRes, metaRes, metaMensualRes, totalMesRes, citasRes]) => {
      if (ventasRes.status === 'fulfilled') {
        setVentasHoy(ventasRes.value.data.ventas ?? []);
        setTotalVentas(ventasRes.value.data.totalVentas ?? 0);
      }
      setStats(prev => ({
        ...prev,
        totalAnimales: animalesRes.status === 'fulfilled' ? (animalesRes.value.data.total ?? 0) : prev.totalAnimales,
        totalProductos: invRes.status === 'fulfilled' ? (invRes.value.data.total ?? 0) : prev.totalProductos,
        stockBajo: invRes.status === 'fulfilled' ? (invRes.value.data.stockBajo ?? 0) : prev.stockBajo,
        citasHoy: citasRes.status === 'fulfilled' ? (citasRes.value.data.total ?? 0) : prev.citasHoy,
      }));
      if (metaRes.status === 'fulfilled' && metaRes.value.data?.monto) {
        setMetaDiaria(metaRes.value.data.monto);
      }
      if (metaMensualRes.status === 'fulfilled' && metaMensualRes.value.data?.monto) {
        setMetaMensual(metaMensualRes.value.data.monto);
      }
      if (totalMesRes.status === 'fulfilled' && totalMesRes.value.data?.totalMes != null) {
        setTotalMes(totalMesRes.value.data.totalMes);
      }
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Citas hoy', value: String(stats.citasHoy), sub: 'programadas',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      iconBg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-100' },
    { label: 'Animales registrados', value: String(stats.totalAnimales), sub: 'pacientes',
      icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" /><ellipse cx="10" cy="4.5" rx="2" ry="2.5" /><ellipse cx="14" cy="4.5" rx="2" ry="2.5" /><ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" /><path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" /></svg>,
      iconBg: 'bg-green-100 text-green-700', border: 'border-green-100' },
    { label: 'Productos en stock', value: String(stats.totalProductos), sub: 'referencias',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      iconBg: 'bg-teal-100 text-teal-700', border: 'border-teal-100' },
    { label: 'Alertas de stock', value: String(stats.stockBajo), sub: 'productos bajos',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
      iconBg: 'bg-amber-100 text-amber-700', border: 'border-amber-100' },
  ];

  const quickActions = [
    { to: '/atencion', label: 'Nueva cita', desc: 'Agendar consulta', color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', icon: '📅' },
    { to: '/animales', label: 'Nuevo animal', desc: 'Registrar paciente', color: 'border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700', icon: '🐾' },
    { to: '/inventario', label: 'Ver stock', desc: 'Control de inventario', color: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700', icon: '📦' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Panel de control</h1>
        <p className="text-gray-400 text-sm mt-0.5">Resumen general de la clínica · {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl p-5 shadow-sm border ${s.border}`}>
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${s.iconBg}`}>{s.icon}</div>
            <p className="text-3xl font-bold text-gray-800 leading-none">{loading ? '…' : s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Gráfico ventas hoy */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
            Ventas del día
            <span className="text-xs text-gray-400 font-normal">— ingresos por hora</span>
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <GraficoVentasHoy ventas={ventasHoy} meta={metaDiaria} />
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-green-500 rounded-full inline-block" />
            Acciones rápidas
          </h2>
          <div className="space-y-2">
            {quickActions.map(({ to, label, desc, color, icon }) => (
              <Link key={to} to={to} className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-all ${color}`}>
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Meta mensual */}
      {metaMensual && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block" />
              <h2 className="font-semibold text-gray-700 text-sm">Meta mensual</h2>
              <span className="text-xs text-gray-400 font-normal">
                — {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-blue-700">{fmt(totalMes)}</span>
              <span className="text-xs text-gray-400"> / {fmt(metaMensual)}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                totalMes >= metaMensual ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((totalMes / metaMensual) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">
              {Math.round((totalMes / metaMensual) * 100)}% completado
            </span>
            {totalMes < metaMensual && (
              <span className="text-xs text-gray-400">Faltan {fmt(metaMensual - totalMes)}</span>
            )}
            {totalMes >= metaMensual && (
              <span className="text-xs font-semibold text-emerald-600">Meta alcanzada</span>
            )}
          </div>
        </div>
      )}

      {/* Últimas ventas del día */}
      {ventasHoy.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Últimas transacciones de hoy</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[...ventasHoy].reverse().slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {v.tipoDoc === 'boleta' ? 'Boleta' : v.tipoDoc === 'factura' ? 'Factura' : 'Nota'}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="text-sm font-bold text-emerald-700">{fmt(v.total)}</span>
              </div>
            ))}
          </div>
          {ventasHoy.length > 5 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <Link to="/caja" className="text-xs text-emerald-600 hover:underline">Ver todas ({ventasHoy.length}) en Caja →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
