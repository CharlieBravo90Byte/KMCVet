import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Denominaciones chilenas activas ───────────────────────────
const BILLETES = [
  { valor: 20000, label: '$20.000' },
  { valor: 10000, label: '$10.000' },
  { valor: 5000,  label: '$5.000'  },
  { valor: 2000,  label: '$2.000'  },
  { valor: 1000,  label: '$1.000'  },
];
const MONEDAS = [
  { valor: 500, label: '$500' },
  { valor: 100, label: '$100' },
  { valor: 50,  label: '$50'  },
  { valor: 10,  label: '$10'  },
];
const DENOMINACIONES = [...BILLETES, ...MONEDAS];
type DenomMap = Record<string, string>;

function denomMapInicial(): DenomMap {
  const m: DenomMap = {};
  DENOMINACIONES.forEach(d => { m[String(d.valor)] = ''; });
  return m;
}
function totalDenom(denom: DenomMap): number {
  return DENOMINACIONES.reduce((s, d) => {
    const cant = parseInt(denom[String(d.valor)]) || 0;
    return s + cant * d.valor;
  }, 0);
}

// ─── Cuadro de billetes / monedas ──────────────────────────────
function CuadroDenominaciones({ denom, onChange }: { denom: DenomMap; onChange: (d: DenomMap) => void }) {
  const total = useMemo(() => totalDenom(denom), [denom]);
  const set = (valor: string, cantidad: string) => onChange({ ...denom, [valor]: cantidad });

  const Fila = ({ grupo }: { grupo: typeof BILLETES }) => (
    <>
      {grupo.map(d => {
        const cant     = parseInt(denom[String(d.valor)]) || 0;
        const subtotal = cant * d.valor;
        return (
          <div key={d.valor} className="grid grid-cols-3 gap-2 items-center py-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">{d.label}</span>
            </div>
            <input
              type="number" min={0} value={denom[String(d.valor)]}
              onChange={e => set(String(d.valor), e.target.value)}
              placeholder="0"
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="text-right">
              <span className={`text-sm font-semibold ${subtotal > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                {subtotal > 0 ? fmt(subtotal) : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">
        <span>Denominación</span><span className="text-center">Cantidad</span><span className="text-right">Subtotal</span>
      </div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Billetes</p>
      <Fila grupo={BILLETES} />
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-1">Monedas</p>
      <Fila grupo={MONEDAS} />
      <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
        <span className="text-sm font-bold text-gray-700">Total efectivo</span>
        <span className={`text-base font-bold ${total > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

// ─── Exportar cierre ────────────────────────────────────────────
function exportarCierre(cierre: CajaCierre, ventas: VentaDia[] = []) {
  const lineas = ventas.map(v => `
    <tr>
      <td>${v.tipoDoc === 'boleta' ? 'Boleta' : v.tipoDoc === 'factura' ? 'Factura' : 'NC'}${v.numeroDocumento ? ' N°' + v.numeroDocumento : ''}</td>
      <td>${new Date(v.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${v.usuario.nombre}</td>
      <td style="text-align:right;font-weight:600">${fmt(v.total)}</td>
    </tr>`).join('');

  const fechaStr = (() => { const d = new Date(cierre.fechaDia + 'T12:00:00'); return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }); })();

  const html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/><title>Cierre de Caja — ${fechaStr}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;padding:16mm 20mm;color:#111;font-size:13px;}
h1{font-size:22px;font-weight:800;margin-bottom:4px;}
.sub{font-size:11px;color:#777;margin-bottom:22px;}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;}
.card .lbl{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.05em;}
.card .val{font-size:18px;font-weight:800;margin-top:2px;}
.ok{color:#065f46;background:#d1fae5;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;display:inline-block;}
.err{color:#991b1b;background:#fee2e2;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;display:inline-block;}
table{width:100%;border-collapse:collapse;margin-top:4px;}
th{background:#111;color:#fff;padding:6px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;text-align:left;}
td{padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;}
.footer{margin-top:28px;font-size:8px;color:#bbb;text-align:center;border-top:1px dashed #ddd;padding-top:10px;}
@media print{@page{size:A4 portrait;margin:0;}body{padding:10mm 14mm;}}
</style></head><body>
<h1>Cierre de Caja</h1>
<p class="sub">Fecha: ${fechaStr} &nbsp;·&nbsp; Registrado por: ${cierre.usuario.nombre} &nbsp;·&nbsp; Generado: ${new Date().toLocaleString('es-CL')}</p>

<h2>Resumen</h2>
<div class="grid2">
  <div class="card"><div class="lbl">Ventas del día (sistema)</div><div class="val">${fmt(cierre.totalVentas)}</div></div>
  <div class="card"><div class="lbl">Total declarado</div><div class="val">${fmt(cierre.totalEfectivo + cierre.totalTarjeta + cierre.totalTransferencia)}</div></div>
  <div class="card"><div class="lbl">Saldo anterior</div><div class="val">${fmt(cierre.saldoAnterior)}</div></div>
  <div class="card"><div class="lbl">Diferencia</div><div class="val"><span class="${Math.abs(cierre.diferencia) < 1 ? 'ok' : 'err'}">${Math.abs(cierre.diferencia) < 1 ? '✓ Cuadrada' : fmt(cierre.diferencia)}</span></div></div>
</div>

<h2>Desglose de ingresos declarados</h2>
<table><thead><tr><th>Medio de pago</th><th style="text-align:right">Monto</th></tr></thead><tbody>
  <tr><td>Efectivo</td><td style="text-align:right">${fmt(cierre.totalEfectivo)}</td></tr>
  <tr><td>Tarjeta (débito / crédito)</td><td style="text-align:right">${fmt(cierre.totalTarjeta)}</td></tr>
  <tr><td>Transferencia bancaria</td><td style="text-align:right">${fmt(cierre.totalTransferencia)}</td></tr>
</tbody></table>

${lineas ? `<h2>Transacciones del día</h2>
<table><thead><tr><th>Documento</th><th>Hora</th><th>Atendió</th><th style="text-align:right">Total</th></tr></thead><tbody>${lineas}</tbody></table>` : ''}

${cierre.observaciones ? `<h2>Observaciones</h2><p style="font-size:12px;color:#444;margin-top:4px">${cierre.observaciones}</p>` : ''}

<div class="footer">KMCVet — Documento generado automáticamente</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) { alert('Permite ventanas emergentes para exportar'); return; }
  win.document.write(html);
  win.document.close();
}

// ─── Tipos ─────────────────────────────────────────────────────
interface VentaDia {
  id: string;
  fecha: string;
  total: number;
  tipoDoc: string;
  numeroDocumento: number | null;
  notas?: string;
  usuario: { nombre: string };
  items: { descripcion: string; cantidad: number; subtotal: number }[];
}

interface CajaCierre {
  id: string;
  fechaDia: string;
  saldoAnterior: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalVentas: number;
  diferencia: number;
  observaciones?: string | null;
  createdAt: string;
  usuario: { nombre: string };
}

// ─── Utils ──────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Componente principal ───────────────────────────────────────
export function CajaPage() {
  const [fecha, setFecha]                     = useState(hoy());
  const [ventas, setVentas]                   = useState<VentaDia[]>([]);
  const [totalVentas, setTotalVentas]         = useState(0);
  const [loadingVentas, setLoadingVentas]     = useState(false);
  const [historial, setHistorial]             = useState<CajaCierre[]>([]);
  const [loadingHist, setLoadingHist]         = useState(true);
  const [saldoAnterior, setSaldoAnterior]     = useState('');
  const [denomEfectivo, setDenomEfectivo]     = useState<DenomMap>(denomMapInicial());
  const [efectivoManual, setEfectivoManual]   = useState('');
  const [modoEfectivo, setModoEfectivo]       = useState<'denom' | 'manual'>('denom');
  const [tarjeta, setTarjeta]                 = useState('');
  const [transferencia, setTransferencia]     = useState('');
  const [observaciones, setObservaciones]     = useState('');
  const [saving, setSaving]                   = useState(false);
  const [tab, setTab]                         = useState<'cuadre' | 'historial'>('cuadre');
  const [ventaExpandida, setVentaExpandida]   = useState<string | null>(null);

  const cargarVentas = useCallback(async (d: string) => {
    setLoadingVentas(true);
    try {
      const { data } = await apiClient.get(`/caja/ventas?fecha=${d}`);
      setVentas(data.ventas ?? []);
      setTotalVentas(data.totalVentas ?? 0);
    } catch { /**/ } finally { setLoadingVentas(false); }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHist(true);
    try {
      const [histRes, ultimoRes] = await Promise.all([
        apiClient.get('/caja/historial'),
        apiClient.get('/caja/ultimo-cierre'),
      ]);
      setHistorial(histRes.data ?? []);
      if (ultimoRes.data && saldoAnterior === '') {
        setSaldoAnterior(String(Math.round(ultimoRes.data.totalEfectivo)));
      }
    } catch { /**/ } finally { setLoadingHist(false); }
  }, []);

  useEffect(() => { cargarVentas(fecha); }, [fecha, cargarVentas]);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const ef  = modoEfectivo === 'denom' ? totalDenom(denomEfectivo) : (parseFloat(efectivoManual) || 0);
  const tar = parseFloat(tarjeta)       || 0;
  const tra = parseFloat(transferencia) || 0;
  const sal = parseFloat(saldoAnterior) || 0;
  const declarado  = ef + tar + tra;
  const diferencia = declarado - totalVentas;
  const cuadrado   = Math.abs(diferencia) < 1;

  async function registrarCierre() {
    if (!fecha) return;
    setSaving(true);
    try {
      await apiClient.post('/caja/cierre', {
        fechaDia: fecha, saldoAnterior: sal,
        totalEfectivo: ef, totalTarjeta: tar, totalTransferencia: tra,
        observaciones: observaciones.trim() || undefined,
      });
      setDenomEfectivo(denomMapInicial()); setEfectivoManual('');
      setTarjeta(''); setTransferencia(''); setObservaciones('');
      setSaldoAnterior(String(Math.round(ef)));
      await cargarHistorial();
      setTab('historial');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Error al registrar cierre');
    } finally { setSaving(false); }
  }

  async function eliminarCierre(id: string) {
    if (!confirm('¿Eliminar este cierre de caja?')) return;
    try {
      await apiClient.delete(`/caja/cierre/${id}`);
      setHistorial(p => p.filter(c => c.id !== id));
    } catch { /**/ }
  }

  async function exportarDesdeHistorial(cierre: CajaCierre) {
    try {
      const { data } = await apiClient.get(`/caja/ventas?fecha=${cierre.fechaDia}`);
      exportarCierre(cierre, data.ventas ?? []);
    } catch { exportarCierre(cierre); }
  }

  const fmtFecha = (s: string) => {
    const d = new Date(s.length === 10 ? s + 'T12:00:00' : s);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Caja</h1>
        <p className="text-sm text-gray-400 mt-0.5">Cuadre diario de caja — ventas vs. ingresos declarados</p>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['cuadre', 'historial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'cuadre' ? 'Cuadre del día' : 'Historial de cierres'}
          </button>
        ))}
      </div>

      {/* ── TAB CUADRE ───────────────────────────────────────── */}
      {tab === 'cuadre' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Fecha a cuadrar:</label>
            <input type="date" value={fecha} max={hoy()} onChange={e => setFecha(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button onClick={() => setFecha(hoy())}
              className="text-xs text-emerald-600 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50">Hoy</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Total ventas</p>
              <p className="text-xl font-bold text-gray-800">{loadingVentas ? '…' : fmt(totalVentas)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ventas.length} transacción(es)</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Declarado</p>
              <p className="text-xl font-bold text-gray-800">{fmt(declarado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Ef. + Tarjeta + Transf.</p>
            </div>
            <div className={`border rounded-xl p-4 shadow-sm ${cuadrado ? 'bg-emerald-50 border-emerald-200' : diferencia > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${cuadrado ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>Diferencia</p>
              <p className={`text-xl font-bold ${cuadrado ? 'text-emerald-700' : diferencia > 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(diferencia)}</p>
              <p className={`text-xs mt-0.5 ${cuadrado ? 'text-emerald-500' : diferencia > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {cuadrado ? '✓ Cuadrada' : diferencia > 0 ? '↑ Sobrante' : '↓ Faltante'}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Saldo anterior</p>
              <p className="text-xl font-bold text-gray-800">{fmt(sal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Efectivo al abrir caja</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Formulario */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-700 text-sm">Declarar ingresos del día</h2>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Saldo anterior (efectivo al abrir caja)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min={0} value={saldoAnterior} onChange={e => setSaldoAnterior(e.target.value)}
                    placeholder="0" className="w-full pl-7 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              {/* Efectivo con toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Efectivo recibido</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setModoEfectivo('denom')}
                      className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all ${modoEfectivo === 'denom' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                      Billetes y monedas
                    </button>
                    <button onClick={() => setModoEfectivo('manual')}
                      className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all ${modoEfectivo === 'manual' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                      Monto directo
                    </button>
                  </div>
                </div>
                {modoEfectivo === 'denom' ? (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <CuadroDenominaciones denom={denomEfectivo} onChange={setDenomEfectivo} />
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min={0} value={efectivoManual} onChange={e => setEfectivoManual(e.target.value)}
                      placeholder="0" className="w-full pl-7 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tarjeta (débito / crédito)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min={0} value={tarjeta} onChange={e => setTarjeta(e.target.value)}
                    placeholder="0" className="w-full pl-7 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Transferencia bancaria</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min={0} value={transferencia} onChange={e => setTransferencia(e.target.value)}
                    placeholder="0" className="w-full pl-7 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  rows={2} placeholder="Notas del cuadre…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Ventas del día (sistema)</span>
                  <span className="font-semibold text-gray-700">{fmt(totalVentas)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Efectivo</span><span>{fmt(ef)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tarjeta</span><span>{fmt(tar)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Transferencia</span><span>{fmt(tra)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1.5">
                  <span>Total declarado</span><span>{fmt(declarado)}</span>
                </div>
                <div className={`flex justify-between font-bold border-t border-gray-200 pt-1.5 ${cuadrado ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  <span>Diferencia</span>
                  <span>{fmt(diferencia)} {cuadrado ? '✓' : diferencia > 0 ? '↑' : '↓'}</span>
                </div>
              </div>

              <button onClick={registrarCierre} disabled={saving || (!ef && !tar && !tra)}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Registrar cierre de caja
              </button>
            </div>

            {/* Ventas del día */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 text-sm">
                  Ventas del {fmtFecha(fecha)}
                  {' '}<span className="text-gray-400 font-normal text-xs">({ventas.length})</span>
                </h2>
                {loadingVentas && <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              {ventas.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  {loadingVentas ? 'Cargando…' : 'Sin ventas registradas este día'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[460px] overflow-y-auto">
                  {ventas.map(v => (
                    <div key={v.id}>
                      <button onClick={() => setVentaExpandida(ventaExpandida === v.id ? null : v.id)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/70 text-left transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {v.tipoDoc === 'boleta' ? 'Boleta' : v.tipoDoc === 'factura' ? 'Factura' : 'NC'}
                            {v.numeroDocumento ? ` N° ${v.numeroDocumento}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">{v.usuario.nombre} · {new Date(v.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-800">{fmt(v.total)}</p>
                          <svg className={`w-3 h-3 ml-auto text-gray-400 transition-transform ${ventaExpandida === v.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                      </button>
                      {ventaExpandida === v.id && (
                        <div className="px-5 pb-3 bg-gray-50 border-t border-gray-100">
                          {v.items.map((it, i) => (
                            <div key={i} className="flex justify-between py-1 text-xs text-gray-600">
                              <span>{it.descripcion} × {it.cantidad}</span>
                              <span>{fmt(it.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {ventas.length > 0 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                  <span className="text-xs text-gray-400">Total del día</span>
                  <span className="text-sm font-bold text-gray-800">{fmt(totalVentas)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB HISTORIAL ────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Cierres registrados</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos 90 días · botón imprimir para exportar detalle</p>
          </div>

          {loadingHist ? (
            <div className="flex items-center justify-center py-14">
              <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historial.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">Sin cierres registrados aún</div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="col-span-2">Fecha</span>
                <span className="col-span-2 text-right">Ventas</span>
                <span className="col-span-2 text-right">Efectivo</span>
                <span className="col-span-2 text-right">Tarjeta</span>
                <span className="col-span-1 text-right">Transf.</span>
                <span className="col-span-2 text-right">Diferencia</span>
                <span className="col-span-1" />
              </div>
              {historial.map(c => {
                const dif = c.diferencia;
                const ok  = Math.abs(dif) < 1;
                return (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-800">{fmtFecha(c.fechaDia)}</p>
                      <p className="text-[10px] text-gray-400">{c.usuario.nombre}</p>
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-600">{fmt(c.totalVentas)}</div>
                    <div className="col-span-2 text-right text-sm text-gray-600">{fmt(c.totalEfectivo)}</div>
                    <div className="col-span-2 text-right text-sm text-gray-600">{fmt(c.totalTarjeta)}</div>
                    <div className="col-span-1 text-right text-sm text-gray-600">{fmt(c.totalTransferencia)}</div>
                    <div className="col-span-2 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ok ? 'text-emerald-700 bg-emerald-50' : dif > 0 ? 'text-blue-700 bg-blue-50' : 'text-red-700 bg-red-50'}`}>
                        {ok ? '✓ OK' : `${dif > 0 ? '+' : ''}${fmt(dif)}`}
                      </span>
                      {c.observaciones && <p className="text-[10px] text-gray-400 truncate max-w-[100px] ml-auto mt-0.5" title={c.observaciones}>{c.observaciones}</p>}
                    </div>
                    <div className="col-span-1 flex justify-end items-center gap-1">
                      <button onClick={() => exportarDesdeHistorial(c)} title="Exportar / Imprimir"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      </button>
                      <button onClick={() => eliminarCierre(c.id)} title="Eliminar"
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">{historial.length} cierre(s) registrado(s)</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
