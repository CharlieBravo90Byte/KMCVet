import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useBlocker } from 'react-router-dom';

// ─── Tipos ────────────────────────────────────────────────────
type TipoItem = 'SERVICIO' | 'PRODUCTO';

interface MotivoAtencion {
  label: string;
  precio?: number | null;
}

interface ClinicaInfo {
  nombre: string;
  logoUrl?: string | null;
  plantillaBoletaUrl?: string | null;
  emailClinica?: string | null;
  telefonos?: string | null;
}

interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  categoria: string;
  unidad: string;
  stockActual: number;
  precioVenta?: number;
}

interface LineaVenta {
  _id: string; // id local para React key
  tipo: TipoItem;
  descripcion: string;
  productoId?: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockDisponible?: number;
}

interface Venta {
  id: string;
  fecha: string;
  total: number;
  notas?: string;
  vendedor: string;
  tipoDoc: string;
  numeroDocumento: number | null;
  estado: string;
  _alerta?: string;
  rutCliente?: string | null;
  ventaReferenciaId?: string | null;
  items: {
    tipo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    unidad: string;
  }[];
}

// ─── Utils ────────────────────────────────────────────────────
const TOKEN_KEY = 'kmcvet_token';
let _uid = 0;
function uid() { return `l${++_uid}`; }
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}
function fmt(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// motivos se carga dinámicamente desde la API (ver VentasPage)

// ─── Generar HTML boleta para impresión ───────────────────────
const LABEL_TIPO: Record<string, string> = {
  boleta: 'BOLETA DE SERVICIO',
  factura: 'FACTURA',
  nota_credito: 'NOTA DE CRÉDITO',
};

function generarHtmlBoleta(venta: Venta, clinica: ClinicaInfo): string {
  const fmtNum = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 0 });
  const fmtMon = (n: number) => `$ ${fmtNum(n)}`;
  const fecha  = new Date(venta.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const tipoLabel = LABEL_TIPO[venta.tipoDoc] ?? venta.tipoDoc.toUpperCase();
  const folioNum  = venta.numeroDocumento != null ? String(venta.numeroDocumento) : 'S/N';
  const legacyId  = venta.id.toUpperCase().replace(/-/g, '').slice(-8);

  const itemsHtml = venta.items.map(it => `
    <tr>
      <td class="td">${it.tipo === 'SERVICIO' ? 'Servicio' : 'Producto'}</td>
      <td class="td">${it.descripcion}</td>
      <td class="td" style="text-align:center;">${it.cantidad} ${it.unidad ?? ''}</td>
      <td class="td" style="text-align:right;">${fmtMon(it.precioUnitario)}</td>
      <td class="td" style="text-align:right;font-weight:600;">${fmtMon(it.subtotal)}</td>
    </tr>`).join('');

  // Neto + IVA (19%) solo referencial, ya que los precios son con IVA incluido
  const neto  = Math.round(venta.total / 1.19);
  const iva   = venta.total - neto;

  const logoHtml = clinica.logoUrl
    ? `<img src="${window.location.origin}${clinica.logoUrl}" style="width:64px;height:64px;object-fit:contain;margin-right:14px;"/>` : '';

  const plantillaHtml = clinica.plantillaBoletaUrl
    ? `<div class="banner"><img src="${window.location.origin}${clinica.plantillaBoletaUrl}" style="width:100%;max-height:130px;object-fit:cover;object-position:top;display:block;"/></div>` : '';

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<title>${tipoLabel} N° ${folioNum}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;padding:18mm 20mm;color:#111;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;}
  @page{size:A4 portrait;margin:0;}
  @media print{body{padding:14mm 16mm;} .no-print{display:none;}}
  .header{display:flex;justify-content:space-between;align-items:flex-start;
    padding-bottom:14px;border-bottom:3px solid #111;margin-bottom:12px;}
  .clinic-info{display:flex;align-items:center;}
  .clinic-name{font-size:18px;font-weight:800;color:#111;}
  .clinic-sub{font-size:10px;color:#555;margin-top:3px;}
  .folio-box{border:2.5px solid #111;padding:10px 18px;text-align:center;
    border-radius:6px;min-width:160px;}
  .folio-label{font-size:9px;font-weight:700;letter-spacing:.1em;color:#111;text-transform:uppercase;}
  .folio-num{font-size:22px;font-weight:800;color:#111;margin-top:2px;}
  .meta-row{display:flex;justify-content:space-between;padding:8px 0;
    border-bottom:1px solid #ddd;margin-bottom:16px;font-size:11px;color:#555;}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;}
  thead tr{background:#111;}
  th{padding:8px 10px;text-align:left;font-size:10px;color:white;letter-spacing:.06em;}
  .td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;}
  .totals{display:flex;justify-content:flex-end;}
  .totals-box{min-width:240px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;}
  .total-row{display:flex;justify-content:space-between;padding:6px 12px;
    font-size:12px;color:#555;border-bottom:1px solid #f0f0f0;}
  .total-main{display:flex;justify-content:space-between;padding:10px 12px;
    background:#111;color:white;}
  .total-main span:last-child{font-size:18px;font-weight:800;}
  .notes{margin-top:14px;padding:10px 12px;background:#f9fafb;
    border:1px solid #e5e7eb;border-radius:6px;}
  .notes-label{font-size:9px;font-weight:700;color:#555;text-transform:uppercase;
    letter-spacing:.06em;margin-bottom:4px;}
  .footer{margin-top:28px;text-align:center;border-top:1px dashed #ccc;
    padding-top:12px;font-size:9px;color:#aaa;}
  .alerta-box{margin-bottom:12px;padding:8px 12px;background:#fff7ed;
    border:1px solid #fdba74;border-radius:6px;font-size:11px;color:#92400e;}
</style>
</head><body>
  ${plantillaHtml}
  <div class="header">
    <div class="clinic-info">
      ${logoHtml}
      <div>
        <div class="clinic-name">${clinica.nombre}</div>
        ${clinica.emailClinica ? `<div class="clinic-sub">Email: ${clinica.emailClinica}</div>` : ''}
        ${clinica.telefonos   ? `<div class="clinic-sub">Tel: ${clinica.telefonos}</div>` : ''}
      </div>
    </div>
    <div class="folio-box">
      <div class="folio-label">${tipoLabel}</div>
      <div class="folio-num">N° ${folioNum}</div>
      ${venta.numeroDocumento == null ? `<div style="font-size:8px;color:#999;margin-top:2px;">Ref: ${legacyId}</div>` : ''}
    </div>
  </div>

  ${venta._alerta ? `<div class="alerta-box">⚠ ${venta._alerta}</div>` : ''}

  <div class="meta-row">
    <span>Fecha: <strong>${fecha}</strong></span>
    <span>Atendido por: <strong>${venta.vendedor}</strong></span>
    ${(venta as any).rutCliente ? `<span>RUT: <strong>${(venta as any).rutCliente}</strong></span>` : ''}
  </div>

  ${venta.ventaReferenciaId && venta.tipoDoc === 'nota_credito' ? `<div class="meta-row" style="background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#92400e;">Anula documento ref.: <strong>${venta.ventaReferenciaId.toUpperCase().replace(/-/g,'').slice(-10)}</strong></div>` : ''}

  <table>
    <thead><tr>
      <th>TIPO</th>
      <th>DESCRIPCIÓN</th>
      <th style="text-align:center;">CANT.</th>
      <th style="text-align:right;">P. UNIT.</th>
      <th style="text-align:right;">SUBTOTAL</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Neto (ref.)</span><span>${fmtMon(neto)}</span></div>
      <div class="total-row"><span>IVA 19% (ref.)</span><span>${fmtMon(iva)}</span></div>
      <div class="total-main"><span style="font-size:14px;font-weight:700;">TOTAL</span><span>${fmtMon(venta.total)}</span></div>
    </div>
  </div>

  ${venta.notas ? `<div class="notes"><div class="notes-label">Notas</div><div style="font-size:11px;color:#333;">${venta.notas}</div></div>` : ''}

  <div class="footer">Documento generado por KMCVet &mdash; Gracias por su preferencia</div>
</body></html>`;
}

// ─── Modal Boleta PDF ─────────────────────────────────────────────
function ModalBoletaPDF({ venta, clinica, onClose }: { venta: Venta; clinica: ClinicaInfo; onClose: () => void }) {
  const tipoLabel = LABEL_TIPO[venta.tipoDoc] ?? venta.tipoDoc.toUpperCase();
  const folioNum  = venta.numeroDocumento != null ? String(venta.numeroDocumento) : venta.id.toUpperCase().replace(/-/g, '').slice(-8);
  const fecha = new Date(venta.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function abrirImpresion() {
    const html = generarHtmlBoleta(venta, clinica);
    const win = window.open('', '_blank', 'width=860,height=700,scrollbars=yes');
    if (!win) { alert('Permite ventanas emergentes para imprimir la boleta'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">¡Cobro registrado!</h2>
              <p className="text-xs text-gray-500">{tipoLabel} N° {folioNum} · {fecha}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        {/* Preview resumida */}
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
            {venta.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{it.descripcion}</p>
                  <p className="text-xs text-gray-400">{it.tipo === 'SERVICIO' ? 'Servicio' : 'Producto'} × {it.cantidad}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{fmt(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-white rounded-b-xl">
              <span className="font-bold text-gray-700">Total</span>
              <span className="text-lg font-bold text-green-700">{fmt(venta.total)}</span>
            </div>
          </div>
          {venta.notas && <p className="text-xs text-gray-500 italic px-1">{venta.notas}</p>}
        </div>

        {/* Acciones */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={abrirImpresion}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir / Guardar PDF
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Selector de producto con búsqueda ───────────────────────
function SelectorProducto({
  productos,
  onSelect,
  onClose,
}: {
  productos: Producto[];
  onSelect: (p: Producto) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtrados = productos.filter((p) =>
    [p.nombre, p.codigo].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[70vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Seleccionar producto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nombre o código..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtrados.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin resultados</p>
          )}
          {filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left px-5 py-3 hover:bg-green-50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                  {p.codigo && <p className="text-xs text-gray-400">{p.codigo}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">
                    {p.precioVenta ? fmt(p.precioVenta) : '—'}
                  </p>
                  <p className="text-xs text-gray-400">Stock: {p.stockActual}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal detalle venta ──────────────────────────────────────
function ModalDetalleVenta({ venta, onClose }: { venta: Venta; onClose: () => void }) {
  const srvc = venta.items.filter((i) => i.tipo === 'SERVICIO');
  const prod = venta.items.filter((i) => i.tipo !== 'SERVICIO');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Detalle de Cobro</h2>
            <p className="text-xs text-gray-500 mt-0.5">{fmtDate(venta.fecha)} · {venta.vendedor}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {srvc.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Servicios de atención</p>
              {srvc.map((it, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{it.descripcion} <span className="text-gray-400">×{it.cantidad}</span></span>
                  <span className="font-medium text-gray-800">{fmt(it.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
          {prod.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Productos</p>
              {prod.map((it, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{it.descripcion} <span className="text-gray-400">×{it.cantidad} {it.unidad}</span></span>
                  <span className="font-medium text-gray-800">{fmt(it.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
          {venta.notas && (
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 italic">{venta.notas}</p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-600">Total</span>
          <span className="text-xl font-bold text-green-700">{fmt(venta.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Fila editable de la boleta ───────────────────────────────
function FilaLinea({
  linea,
  onChange,
  onDelete,
  productos,
  onSelectProducto,
  motivos,
}: {
  linea: LineaVenta;
  onChange: (campo: keyof LineaVenta, valor: any) => void;
  onDelete: () => void;
  productos: Producto[];
  onSelectProducto: () => void;
  motivos: MotivoAtencion[];
}) {
  const isServicio = linea.tipo === 'SERVICIO';
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mostrar todos cuando el campo está vacío, filtrar cuando hay texto
  const sugerencias = isServicio
    ? motivos.filter((s) =>
        linea.descripcion.length === 0
          ? true
          : s.label.toLowerCase().includes(linea.descripcion.toLowerCase()),
      )
    : [];

  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      {/* Tipo badge */}
      <td className="pl-4 pr-2 py-2 w-28">
        <span
          className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
            isServicio
              ? 'bg-blue-100 text-blue-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isServicio ? 'Atención' : 'Producto'}
        </span>
      </td>

      {/* Descripción */}
      <td className="px-2 py-2 relative">
        {isServicio ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={linea.descripcion}
              onChange={(e) => { onChange('descripcion', e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 180)}
              placeholder="Selecciona o escribe un servicio..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {showSuggest && sugerencias.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-0.5 max-h-52 overflow-y-auto">
                {sugerencias.map((s) => (
                  <button
                    key={s.label}
                    onMouseDown={() => {
                      onChange('descripcion', s.label);
                      if (s.precio != null) onChange('precioUnitario', s.precio);
                      setShowSuggest(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                      linea.descripcion === s.label ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{s.label}</span>
                      {s.precio != null && (
                        <span className="text-xs text-blue-500 font-medium ml-2">{fmt(s.precio)}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onSelectProducto}
            className="w-full text-left text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-green-400 hover:bg-green-50 transition-colors truncate"
          >
            {linea.descripcion || <span className="text-gray-400">Seleccionar producto…</span>}
          </button>
        )}
      </td>

      {/* Cantidad */}
      <td className="px-2 py-2 w-24">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onChange('cantidad', Math.max(1, linea.cantidad - 1))}
            className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-medium"
          >−</button>
          <input
            type="number"
            min={1}
            max={linea.stockDisponible ?? 9999}
            value={linea.cantidad}
            onChange={(e) => {
              const v = Math.max(1, Math.min(parseInt(e.target.value) || 1, linea.stockDisponible ?? 9999));
              onChange('cantidad', v);
            }}
            className="w-10 text-center text-sm py-1.5 border-x border-gray-200 focus:outline-none"
          />
          <button
            onClick={() => onChange('cantidad', Math.min(linea.cantidad + 1, linea.stockDisponible ?? 9999))}
            className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-medium"
          >+</button>
        </div>
      </td>

      {/* Precio unitario */}
      <td className="px-2 py-2 w-36">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-400">
          <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5 select-none">$</span>
          <input
            type="number"
            min={0}
            value={linea.precioUnitario}
            onChange={(e) => onChange('precioUnitario', parseFloat(e.target.value) || 0)}
            className="flex-1 px-2 py-1.5 text-sm focus:outline-none text-right w-20"
          />
        </div>
      </td>

      {/* Subtotal */}
      <td className="px-2 py-2 w-32 text-right">
        <span className="text-sm font-semibold text-gray-800">{fmt(linea.subtotal)}</span>
      </td>

      {/* Eliminar */}
      <td className="pl-2 pr-4 py-2 w-10">
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── Modal Nota de Crédito ────────────────────────────────────
function ModalNotaCredito({ venta, onClose, onCreado }: {
  venta: Venta;
  onClose: () => void;
  onCreado: (nc: Venta) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [loadingNC, setLoadingNC] = useState(false);
  const [errorNC, setErrorNC] = useState('');

  async function confirmar() {
    if (!motivo.trim()) { setErrorNC('Ingresa el motivo de anulación'); return; }
    setLoadingNC(true);
    try {
      const r = await fetch(`/api/ventas/${venta.id}/nota-credito`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ motivo }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.message ?? 'Error al generar nota de crédito');
      }
      const nc: Venta = await r.json();
      onCreado(nc);
    } catch (e: any) {
      setErrorNC(e.message ?? 'Error al generar nota de crédito');
    } finally {
      setLoadingNC(false);
    }
  }

  const tipoLabel = LABEL_TIPO[venta.tipoDoc] ?? venta.tipoDoc.toUpperCase();
  const folioNum  = venta.numeroDocumento != null ? `N° ${venta.numeroDocumento}` : venta.id.slice(-6).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Generar Nota de Crédito</h2>
              <p className="text-xs text-gray-500">{tipoLabel} {folioNum} · {fmt(venta.total)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            ⚠ Se generará un documento de anulación que hace referencia a <strong>{tipoLabel} {folioNum}</strong> por <strong>{fmt(venta.total)}</strong>. Esta operación queda registrada en el historial.
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Motivo de anulación <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={motivo}
              onChange={e => { setMotivo(e.target.value); setErrorNC(''); }}
              placeholder="Ej: Error en monto, cobro duplicado, etc."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          {errorNC && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorNC}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={confirmar}
            disabled={loadingNC || !motivo.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loadingNC ? 'Generando...' : 'Confirmar Nota de Crédito'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function VentasPage() {
  const location = useLocation();
  const precarga = (location.state as { motivo?: string; mascota?: string; propietario?: string; rutPropietario?: string } | null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [motivos, setMotivos] = useState<MotivoAtencion[]>([]);
  const [lineas, setLineas] = useState<LineaVenta[]>(() => {
    // Si viene de la agenda con datos precargados, inicializar con esa línea
    if (precarga?.motivo) {
      return [{ _id: uid(), tipo: 'SERVICIO', descripcion: precarga.motivo, unidad: 'un.', cantidad: 1, precioUnitario: 0, subtotal: 0 }];
    }
    return [];
  });
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [notas, setNotas] = useState(() =>
    precarga?.mascota ? `Paciente: ${precarga.mascota}${precarga.propietario ? ` · Tutor: ${precarga.propietario}` : ''}` : ''
  );
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState<'nueva' | 'pendiente' | 'historial'>('nueva');
  const [selectorProdIdx, setSelectorProdIdx] = useState<number | null>(null);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [ventaCompletada, setVentaCompletada] = useState<Venta | null>(null);
  const [clinica, setClinica] = useState<ClinicaInfo>({ nombre: 'Veterinaria' });
  const [tipoDoc, setTipoDoc] = useState<'boleta' | 'factura'>('boleta');
  const [rutCliente, setRutCliente] = useState<string>(() => precarga?.rutPropietario ?? '');
  const [notaCreditoVenta, setNotaCreditoVenta] = useState<Venta | null>(null);
  const [reintentandoId, setReintentandoId] = useState<string | null>(null);

  // ── Warning si hay datos en el formulario al navegar ─────────
  const formaDirty = tab === 'nueva' && (lineas.length > 0 || notas.trim() !== '' || rutCliente.trim() !== '');
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    formaDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const cargarProductos = useCallback(async () => {
    try {
      const r = await fetch('/api/inventario', { headers: getHeaders() });
      if (r.ok) setProductos(await r.json());
    } catch {}
  }, []);

  const cargarMotivos = useCallback(async () => {
    try {
      const r = await fetch('/api/configuracion/tipos-atencion', { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        setMotivos(data.filter((t: any) => t.activo).map((t: any) => ({ label: t.label, precio: t.precio ?? null })));
      }
    } catch {}
  }, []);

  const cargarVentas = useCallback(async () => {
    try {
      const r = await fetch('/api/ventas', { headers: getHeaders() });
      if (r.ok) setVentas(await r.json());
    } catch {}
  }, []);

  // Cargar info clínica para la boleta
  useEffect(() => {
    fetch('/api/configuracion/clinica', { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClinica(d); })
      .catch(() => {});
  }, []);

  // Auto-rellenar precio cuando los motivos cargan (precarga desde agenda)
  useEffect(() => {
    if (!precarga?.motivo || motivos.length === 0) return;
    setLineas(prev => prev.map(l => {
      if (l.tipo !== 'SERVICIO' || l.precioUnitario !== 0) return l;
      const m = motivos.find(mx => mx.label === l.descripcion);
      if (!m?.precio) return l;
      return { ...l, precioUnitario: m.precio, subtotal: m.precio * l.cantidad };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivos]);

  useEffect(() => {
    cargarProductos();
    cargarMotivos();
    cargarVentas();
  }, [cargarProductos, cargarMotivos, cargarVentas]);

  // ── Gestión de líneas ────────────────────────────────────────
  function agregarServicio() {
    setLineas((prev) => [
      ...prev,
      { _id: uid(), tipo: 'SERVICIO', descripcion: '', unidad: 'un.', cantidad: 1, precioUnitario: 0, subtotal: 0 },
    ]);
  }

  function agregarProducto() {
    const idx = lineas.length;
    setLineas((prev) => [
      ...prev,
      { _id: uid(), tipo: 'PRODUCTO', descripcion: '', unidad: 'un.', cantidad: 1, precioUnitario: 0, subtotal: 0 },
    ]);
    setSelectorProdIdx(idx);
  }

  function actualizarLinea(idx: number, campo: keyof LineaVenta, valor: any) {
    setLineas((prev) => {
      const copia = [...prev];
      const linea = { ...copia[idx], [campo]: valor };
      if (campo === 'cantidad' || campo === 'precioUnitario') {
        linea.subtotal = linea.cantidad * linea.precioUnitario;
      }
      copia[idx] = linea;
      return copia;
    });
  }

  function eliminarLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }

  function seleccionarProducto(idx: number, p: Producto) {
    setLineas((prev) => {
      const copia = [...prev];
      const precio = p.precioVenta ?? 0;
      copia[idx] = {
        ...copia[idx],
        productoId: p.id,
        descripcion: p.nombre,
        unidad: p.unidad,
        precioUnitario: precio,
        subtotal: precio * copia[idx].cantidad,
        stockDisponible: p.stockActual,
      };
      return copia;
    });
    setSelectorProdIdx(null);
  }

  const total = lineas.reduce((acc, l) => acc + l.subtotal, 0);
  const hayServicios = lineas.some((l) => l.tipo === 'SERVICIO');
  const hayProductos = lineas.some((l) => l.tipo === 'PRODUCTO');

  // ── Realizar venta ───────────────────────────────────────────
  async function realizarVenta() {
    setErrorMsg('');
    if (lineas.length === 0) { setErrorMsg('Agrega al menos un ítem'); return; }
    const invalidas = lineas.filter((l) => !l.descripcion.trim() || l.precioUnitario < 0);
    if (invalidas.length > 0) { setErrorMsg('Completa la descripción y precio de todos los ítems'); return; }
    if (tipoDoc === 'factura' && !rutCliente.trim()) { setErrorMsg('El RUT del cliente es requerido para factura'); return; }

    setLoading(true);
    try {
      const body = {
        tipoDoc,
        rutCliente: rutCliente.trim() || undefined,
        items: lineas.map((l) => ({
          tipo: l.tipo,
          descripcion: l.descripcion,
          productoId: l.productoId ?? null,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
        notas,
      };
      const r = await fetch('/api/ventas', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message ?? 'Error al procesar el cobro');
      }
      const ventaNueva: Venta = await r.json();
      setLineas([]);
      setNotas('');
      setRutCliente('');
      setTipoDoc('boleta');
      // Si era un reintento, eliminar la venta pendiente original
      if (reintentandoId) {
        fetch(`/api/ventas/${reintentandoId}`, { method: 'DELETE', headers: getHeaders() }).catch(() => {});
        setReintentandoId(null);
      }
      cargarProductos();
      cargarVentas();
      if (ventaNueva.estado === 'PENDIENTE' || ventaNueva._alerta) {
        setTab('pendiente');
        setErrorMsg('');
      } else {
        setVentaCompletada(ventaNueva);
      }
    } catch (e: any) {
      setReintentandoId(null); // en caso de error, libera el bloqueo
      setErrorMsg(e.message ?? 'Error al realizar el cobro');
    } finally {
      setLoading(false);
    }
  }

  const productosSinStock = productos.filter((p) => p.stockActual === 0);
  const productosConStock = productos.filter((p) => p.stockActual > 0);
  // Ocultar optimísticamente la venta que se está reintentando
  const ventasPendientes   = ventas.filter((v) => v.estado === 'PENDIENTE' && v.id !== reintentandoId);
  const ventasCompletadas  = ventas.filter((v) => v.estado !== 'PENDIENTE');

  function recargarEnNuevoCobro(v: Venta) {
    setReintentandoId(v.id); // marcar el pendiente que se está reintentando
    setLineas(v.items.map(it => ({
      _id: uid(),
      tipo: it.tipo as TipoItem,
      descripcion: it.descripcion,
      unidad: it.unidad,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
      subtotal: it.subtotal,
    })));
    setNotas(v.notas ?? '');
    setTipoDoc(v.tipoDoc === 'factura' ? 'factura' : 'boleta');
    setRutCliente(v.rutCliente ?? '');
    setTab('nueva');
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Modal boleta PDF */}
      {ventaCompletada && (
        <ModalBoletaPDF
          venta={ventaCompletada}
          clinica={clinica}
          onClose={() => { setVentaCompletada(null); setTab('historial'); }}
        />
      )}

      {/* Modal confirmación navegación con venta activa */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">¿Salir del formulario?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Hay datos ingresados en el cobro activo. Si sales ahora se perderán.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.proceed?.()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Salir de todas formas
              </button>
              <button
                onClick={() => blocker.reset?.()}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Continuar aquí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Ventas</h1>
            <p className="text-sm text-gray-500">Servicios de Ventas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('nueva')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'nueva' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nuevo cobro
            </button>
            {ventasPendientes.length > 0 && (
              <button
                onClick={() => setTab('pendiente')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  tab === 'pendiente'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Pendiente
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === 'pendiente' ? 'bg-white/30 text-white' : 'bg-amber-200 text-amber-800'
                }`}>{ventasPendientes.length}</span>
              </button>
            )}
            <button
              onClick={() => setTab('historial')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'historial' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historial
              {ventasCompletadas.length > 0 && <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{ventasCompletadas.length}</span>}
            </button>
          </div>
        </div>
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{errorMsg}</div>
        )}
      </div>

      {tab === 'nueva' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">

            {/* Banner de reintento activo */}
            {reintentandoId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-blue-800">
                <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 15a9 9 0 0114.15-7.37M20 9a9 9 0 01-14.15 7.37" /></svg>
                <span><strong>Reintentando cobro pendiente</strong> — Al confirmar, el cobro pendiente original será eliminado.</span>
                <button onClick={() => { setReintentandoId(null); setLineas([]); setNotas(''); setRutCliente(''); }} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Cancelar</button>
              </div>
            )}

            {/* ── Tipo de documento + RUT cliente ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de documento</label>
                  <select
                    value={tipoDoc}
                    onChange={e => setTipoDoc(e.target.value as 'boleta' | 'factura')}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                  >
                    <option value="boleta">Boleta de Servicio</option>
                    <option value="factura">Factura</option>
                  </select>
                </div>
                <div className="flex-1 min-w-56">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    RUT cliente{' '}
                    {tipoDoc === 'factura'
                      ? <span className="text-red-500 font-semibold">*</span>
                      : <span className="text-gray-400 font-normal">(opcional)</span>}
                  </label>
                  <input
                    type="text"
                    value={rutCliente}
                    onChange={e => setRutCliente(e.target.value)}
                    placeholder={tipoDoc === 'factura' ? '12.345.678-9' : 'Opcional para boleta'}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            {/* ── Botones agregar ── */}
            <div className="flex items-center gap-3">
              <button
                onClick={agregarServicio}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Servicio de atención
              </button>
              <button
                onClick={agregarProducto}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Producto del inventario
              </button>
              {lineas.length > 0 && (
                <button
                  onClick={() => setLineas([])}
                  className="ml-auto text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {/* ── Tabla de líneas ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {lineas.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Usa los botones de arriba para agregar ítems al cobro</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="pl-4 pr-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Tipo</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Cant.</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">P. Unitario</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Total</th>
                      <th className="pl-2 pr-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lineas.map((linea, idx) => (
                      <FilaLinea
                        key={linea._id}
                        linea={linea}
                        onChange={(campo, valor) => actualizarLinea(idx, campo, valor)}
                        onDelete={() => eliminarLinea(idx)}
                        productos={productosConStock}
                        onSelectProducto={() => setSelectorProdIdx(idx)}
                        motivos={motivos}
                      />
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Subtotales visuales + total ── */}
              {lineas.length > 0 && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="flex flex-col items-end gap-1 max-w-xs ml-auto">
                    {hayServicios && (
                      <div className="flex justify-between w-full text-sm">
                        <span className="text-blue-600 font-medium">Servicios</span>
                        <span className="text-gray-700">{fmt(lineas.filter((l) => l.tipo === 'SERVICIO').reduce((a, l) => a + l.subtotal, 0))}</span>
                      </div>
                    )}
                    {hayProductos && (
                      <div className="flex justify-between w-full text-sm">
                        <span className="text-emerald-600 font-medium">Productos</span>
                        <span className="text-gray-700">{fmt(lineas.filter((l) => l.tipo === 'PRODUCTO').reduce((a, l) => a + l.subtotal, 0))}</span>
                      </div>
                    )}
                    <div className="flex justify-between w-full text-base font-bold border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-700">Total</span>
                      <span className="text-green-700 text-xl">{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Notas + confirmar ── */}
            {lineas.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notas u observaciones (opcional)</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Propietario Juan Pérez · Pago en efectivo"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <button
                  onClick={realizarVenta}
                  disabled={loading || lineas.length === 0}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm shadow-sm flex-shrink-0"
                >
                  {loading ? (
                    'Procesando...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Confirmar cobro
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'pendiente' ? (
        /* ── Pendientes ── */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <strong>⚠ Cobros pendientes</strong> — Estos cobros no pudieron completarse automáticamente. Usa «Reintentar» para volver a cargarlos en el formulario y enviarlo de nuevo.
            </div>
            {ventasPendientes.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 flex items-start gap-4">
                  {/* Icono y fecha */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mt-0.5">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {/* Info venta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{fmtDate(v.fecha)}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Sin folio</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.items.map((it, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                          it.tipo === 'SERVICIO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>{it.descripcion} ×{it.cantidad}</span>
                      ))}
                    </div>
                    {v.notas && <p className="text-xs text-gray-400 italic mt-1">{v.notas}</p>}
                  </div>
                  {/* Total + acción */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span className="text-lg font-bold text-amber-600">{fmt(v.total)}</span>
                    <button
                      onClick={() => recargarEnNuevoCobro(v)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 15a9 9 0 0114.15-7.37M20 9a9 9 0 01-14.15 7.37" /></svg>
                      Reintentar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Historial ── */
        <div className="flex-1 overflow-y-auto p-6">
          {ventasCompletadas.length === 0 ? (
            <div className="text-center pt-16 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm">Sin cobros registrados</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="pl-5 pr-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítems</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="pr-4 py-3 w-14" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ventasCompletadas.map((v) => (
                    <tr key={v.id} onClick={() => setVentaDetalle(v)} className="hover:bg-green-50 cursor-pointer transition-colors">
                      <td className="pl-5 pr-2 py-3">
                        <div className="text-sm text-gray-600 whitespace-nowrap">{fmtDate(v.fecha)}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            v.tipoDoc === 'nota_credito' ? 'bg-red-100 text-red-700' :
                            v.tipoDoc === 'factura' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {v.tipoDoc === 'nota_credito' ? 'NC' : v.tipoDoc === 'factura' ? 'FCT' : 'BOL'}
                          </span>
                          {v.numeroDocumento != null && <span className="text-xs text-gray-400">N° {v.numeroDocumento}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {v.items.some((i) => i.tipo === 'SERVICIO') && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {v.items.filter((i) => i.tipo === 'SERVICIO').length} servicio{v.items.filter((i) => i.tipo === 'SERVICIO').length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {v.items.some((i) => i.tipo !== 'SERVICIO') && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {v.items.filter((i) => i.tipo !== 'SERVICIO').length} producto{v.items.filter((i) => i.tipo !== 'SERVICIO').length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600">{v.vendedor}</td>
                      <td className="px-2 py-3 text-sm text-gray-400 italic max-w-xs truncate">{v.notas ?? '—'}</td>
                      <td className={`px-5 py-3 text-right text-base font-bold ${v.tipoDoc === 'nota_credito' ? 'text-red-600' : 'text-green-700'}`}>{fmt(v.total)}</td>
                      <td className="pr-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {v.tipoDoc !== 'nota_credito' && (
                          <button
                            onClick={() => setNotaCreditoVenta(v)}
                            title="Generar Nota de Crédito"
                            className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            NC
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {selectorProdIdx !== null && (
        <SelectorProducto
          productos={productosConStock}
          onSelect={(p) => seleccionarProducto(selectorProdIdx, p)}
          onClose={() => setSelectorProdIdx(null)}
        />
      )}
      {ventaDetalle && (
        <ModalDetalleVenta venta={ventaDetalle} onClose={() => setVentaDetalle(null)} />
      )}
      {notaCreditoVenta && (
        <ModalNotaCredito
          venta={notaCreditoVenta}
          onClose={() => setNotaCreditoVenta(null)}
          onCreado={(nc) => {
            setNotaCreditoVenta(null);
            cargarVentas();
            setVentaCompletada(nc);
          }}
        />
      )}
    </div>
  );
}

