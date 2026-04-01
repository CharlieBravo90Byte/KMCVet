import { useState, useMemo, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Exportar a Excel (CSV UTF-8 con BOM — abre directo en Excel) ─
function exportarExcel(productos: Producto[], filtro: 'con' | 'sin' | 'todos') {
  const fecha = new Date().toISOString().split('T')[0];

  const fuente = filtro === 'con'
    ? productos.filter(p => p.stockActual > 0)
    : filtro === 'sin'
    ? productos.filter(p => p.stockActual === 0)
    : productos;

  const CATS: Record<string, string> = {
    medicamento: 'Medicamento', alimento: 'Alimento',
    accesorio: 'Accesorio', clinico: 'Material clínico', otro: 'Otro',
  };

  const fmtCLP = (n: number) => n > 0 ? n.toString() : '';

  const cabecera = ['Nombre', 'Código', 'Categoría', 'Unidad', 'Stock actual',
    'Stock mínimo', 'Precio compra (CLP)', 'Precio venta (CLP)',
    'Proveedor', 'Fecha vencimiento', 'Descripción'];

  const filas = fuente.map(p => [
    p.nombre,
    p.codigo,
    CATS[p.categoria] ?? p.categoria,
    p.unidad,
    p.stockActual.toString(),
    p.stockMinimo.toString(),
    fmtCLP(p.precioCompra),
    fmtCLP(p.precioVenta),
    p.proveedor,
    p.fechaVencimiento,
    p.descripcion,
  ]);

  const escapar = (v: string) => {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const csv = [cabecera, ...filas]
    .map(fila => fila.map(escapar).join(';'))
    .join('\r\n');

  // BOM UTF-8 para que Excel detecte la codificación correctamente
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario_${filtro}_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Modal selector de exportación ───────────────────────────────
function ModalExportar({
  onExport, onClose,
}: {
  onExport: (f: 'con' | 'sin' | 'todos') => void;
  onClose: () => void;
}) {
  const opciones: { key: 'con' | 'sin' | 'todos'; label: string; desc: string; icon: string }[] = [
    { key: 'con',   label: 'Con stock',    desc: 'Solo productos con stock disponible (> 0)', icon: '✅' },
    { key: 'sin',   label: 'Sin stock',    desc: 'Solo productos agotados (stock = 0)',        icon: '❌' },
    { key: 'todos', label: 'Todos',        desc: 'Todo el inventario sin filtrar',             icon: '📋' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Exportar inventario</h2>
              <p className="text-xs text-gray-400 mt-0.5">Selecciona qué productos incluir</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-2">
          {opciones.map(op => (
            <button
              key={op.key}
              onClick={() => { onExport(op.key); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left group"
            >
              <span className="text-2xl">{op.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700">{op.label}</p>
                <p className="text-xs text-gray-400">{op.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
        <div className="px-6 pb-5">
          <p className="text-[10px] text-gray-400 text-center">
            Se descargará un archivo .CSV compatible con Microsoft Excel
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────
type Categoria = 'medicamento' | 'alimento' | 'accesorio' | 'clinico' | 'otro';
type TipoDocumento = 'boleta' | 'factura' | 'nota_debito';
type UnidadMedida = 'unidad' | 'caja' | 'frasco' | 'ampolla' | 'kg' | 'g' | 'L' | 'mL';

interface ItemFactura {
  id: number;
  productoNombre: string;
  codigo: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

interface Producto {
  id: number;
  nombre: string;
  codigo: string;
  categoria: Categoria;
  unidad: UnidadMedida;
  stockActual: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  proveedor: string;
  fechaVencimiento: string;
  descripcion: string;
  // Datos del documento de ingreso
  tipoDoc: TipoDocumento;
  numeroDoc: string;
  fechaDoc: string;
  proveedorRut: string;
  proveedorDireccion: string;
}

const CATEGORIAS: Record<Categoria, { label: string; emoji: string; color: string }> = {
  medicamento: { label: 'Medicamento',   emoji: '💊', color: 'bg-green-50  border-green-200  text-green-700'  },
  alimento:    { label: 'Alimento',      emoji: '🥣', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  accesorio:   { label: 'Accesorio',     emoji: '🦮', color: 'bg-teal-50   border-teal-200   text-teal-700'   },
  clinico:     { label: 'Material clínico', emoji: '🩺', color: 'bg-cyan-50  border-cyan-200  text-cyan-700'  },
  otro:        { label: 'Otro',          emoji: '📦', color: 'bg-gray-50   border-gray-200   text-gray-600'   },
};

const UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja',   label: 'Caja'   },
  { value: 'frasco', label: 'Frasco' },
  { value: 'ampolla',label: 'Ampolla'},
  { value: 'kg',     label: 'kg'     },
  { value: 'g',      label: 'g'      },
  { value: 'L',      label: 'L'      },
  { value: 'mL',     label: 'mL'     },
];

const EMPTY_PRODUCTO: Omit<Producto,'id'> = {
  nombre: '', codigo: '', categoria: 'medicamento', unidad: 'unidad',
  stockActual: 0, stockMinimo: 5, precioCompra: 0, precioVenta: 0,
  proveedor: '', fechaVencimiento: '', descripcion: '',
  tipoDoc: 'boleta', numeroDoc: '', fechaDoc: new Date().toISOString().split('T')[0],
  proveedorRut: '', proveedorDireccion: '',
};

type FormTab = 'documento' | 'producto' | 'stock';

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white';
const selectCls = inputCls;

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Modal producto / factura ─────────────────────────────────────
function ModalProducto({
  onClose, onSave, initial, saving,
}: {
  onClose: () => void;
  onSave: (p: Omit<Producto,'id'>) => void;
  initial?: Omit<Producto,'id'>;
  saving?: boolean;
}) {
  const [tab, setTab] = useState<FormTab>('documento');
  const [form, setForm] = useState<Omit<Producto,'id'>>(initial ?? EMPTY_PRODUCTO);
  const [items, setItems] = useState<ItemFactura[]>([
    { id: 1, productoNombre: '', codigo: '', cantidad: 1, precioUnitario: 0, descuento: 0 },
  ]);

  const set = (f: Partial<Omit<Producto,'id'>>) => setForm(p => ({ ...p, ...f }));

  const subtotal     = items.reduce((s, it) => s + it.cantidad * it.precioUnitario * (1 - it.descuento / 100), 0);
  const iva          = subtotal * 0.19;
  const total        = subtotal + iva;
  const fmtCLP       = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  function addItem() {
    setItems(p => [...p, { id: Date.now(), productoNombre: '', codigo: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]);
  }

  function removeItem(id: number) {
    setItems(p => p.filter(it => it.id !== id));
  }

  function setItem(id: number, f: Partial<ItemFactura>) {
    setItems(p => p.map(it => it.id === id ? { ...it, ...f } : it));
  }

  // Sincronizar el primer item con el producto principal
  function syncFromItem() {
    const first = items[0];
    if (first?.productoNombre && !form.nombre) {
      set({ nombre: first.productoNombre, codigo: first.codigo, precioCompra: first.precioUnitario });
    }
  }

  const tabs: { key: FormTab; label: string; icon: string }[] = [
    { key: 'documento', label: 'Documento', icon: '🧾' },
    { key: 'producto',  label: 'Producto',  icon: '📦' },
    { key: 'stock',     label: 'Stock y precios', icon: '📊' },
  ];

  const canSaveDoc = !!form.proveedor && !!form.numeroDoc;
  const canSaveProd = !!form.nombre && !!form.categoria;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Registro de producto</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ingresa el documento de compra y los datos del producto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Tab Documento ── */}
          {tab === 'documento' && (
            <div className="space-y-5">
              {/* Tipo documento */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de documento *</label>
                <div className="flex gap-2">
                  {([
                    { v: 'boleta',     l: '🧾 Boleta'        },
                    { v: 'factura',    l: '📄 Factura'       },
                    { v: 'nota_debito',l: '📋 Nota de débito' },
                  ] as { v: TipoDocumento; l: string }[]).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => set({ tipoDoc: v })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                        form.tipoDoc === v
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                      }`}
                    >{l}</button>
                  ))}
                </div>
              </div>

              {/* Datos del documento */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Nº documento" required>
                  <input value={form.numeroDoc} onChange={e => set({ numeroDoc: e.target.value })}
                    placeholder="Ej: 00123456" className={inputCls} />
                </Field>
                <Field label="Fecha emisión">
                  <input type="date" value={form.fechaDoc} onChange={e => set({ fechaDoc: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Proveedor" required>
                  <input value={form.proveedor} onChange={e => set({ proveedor: e.target.value })}
                    placeholder="Nombre del proveedor" className={inputCls} />
                </Field>
                <Field label="RUT proveedor">
                  <input value={form.proveedorRut} onChange={e => set({ proveedorRut: e.target.value })}
                    placeholder="76.123.456-7" className={inputCls} />
                </Field>
                <Field label="Dirección proveedor">
                  <input value={form.proveedorDireccion} onChange={e => set({ proveedorDireccion: e.target.value })}
                    placeholder="Dirección fiscal" className={inputCls} />
                </Field>
              </div>

              {/* Detalle de ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Detalle de productos</label>
                  <button onClick={addItem} className="text-xs text-emerald-700 font-medium hover:text-emerald-800">+ Agregar línea</button>
                </div>

                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <span className="col-span-4">Producto</span>
                    <span className="col-span-2">Código</span>
                    <span className="col-span-1 text-center">Cant.</span>
                    <span className="col-span-2 text-right">Precio unit.</span>
                    <span className="col-span-1 text-center">Desc.%</span>
                    <span className="col-span-1 text-right">Total</span>
                    <span className="col-span-1" />
                  </div>

                  {items.map(it => (
                    <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-gray-50">
                      <div className="col-span-4">
                        <input
                          value={it.productoNombre}
                          onChange={e => setItem(it.id, { productoNombre: e.target.value })}
                          placeholder="Nombre del producto"
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          value={it.codigo}
                          onChange={e => setItem(it.id, { codigo: e.target.value })}
                          placeholder="Cód."
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min="1" value={it.cantidad}
                          onChange={e => setItem(it.id, { cantidad: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" value={it.precioUnitario}
                          onChange={e => setItem(it.id, { precioUnitario: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min="0" max="100" value={it.descuento}
                          onChange={e => setItem(it.id, { descuento: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-1 text-xs text-right text-gray-600 font-medium">
                        {fmtCLP(it.cantidad * it.precioUnitario * (1 - it.descuento / 100))}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(it.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Totales */}
                  <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-end">
                      <div className="w-56 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Subtotal (neto)</span>
                          <span>{fmtCLP(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>IVA (19%)</span>
                          <span>{fmtCLP(iva)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                          <span>Total</span>
                          <span className="text-emerald-700">{fmtCLP(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab Producto ── */}
          {tab === 'producto' && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">Datos del producto principal</p>

              {items.length > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium">
                    ℹ️ Tienes {items.length} productos en el documento. Completa los datos del producto principal que deseas registrar en inventario.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre del producto" required>
                  <input value={form.nombre} onChange={e => set({ nombre: e.target.value })}
                    placeholder="Ej: Amoxicilina 250mg" className={inputCls} />
                </Field>
                <Field label="Código interno">
                  <input value={form.codigo} onChange={e => set({ codigo: e.target.value })}
                    placeholder="Ej: MED-001" className={inputCls} />
                </Field>

                <Field label="Categoría" required>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(CATEGORIAS) as [Categoria, typeof CATEGORIAS[Categoria]][]).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => set({ categoria: k })}
                        className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          form.categoria === k
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                        }`}
                      >
                        <span>{v.emoji}</span>{v.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="space-y-4">
                  <Field label="Unidad de medida">
                    <select value={form.unidad} onChange={e => set({ unidad: e.target.value as UnidadMedida })} className={selectCls}>
                      {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Fecha de vencimiento">
                    <input type="date" value={form.fechaVencimiento} onChange={e => set({ fechaVencimiento: e.target.value })} className={inputCls} />
                  </Field>
                </div>
              </div>

              <Field label="Descripción / Observaciones">
                <textarea value={form.descripcion} onChange={e => set({ descripcion: e.target.value })}
                  rows={3} placeholder="Descripción del producto, indicaciones, precauciones…"
                  className={`${inputCls} resize-none`} />
              </Field>
            </div>
          )}

          {/* ── Tab Stock y precios ── */}
          {tab === 'stock' && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">Control de stock y precios</p>

              {/* Cantidades */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Stock que ingresa" required>
                  <div className="relative">
                    <input type="number" min="0" value={form.stockActual}
                      onChange={e => set({ stockActual: Number(e.target.value) })}
                      className={inputCls} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{form.unidad}</span>
                  </div>
                </Field>
                <Field label="Stock mínimo (alerta)">
                  <div className="relative">
                    <input type="number" min="0" value={form.stockMinimo}
                      onChange={e => set({ stockMinimo: Number(e.target.value) })}
                      className={inputCls} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{form.unidad}</span>
                  </div>
                </Field>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col justify-center">
                  <p className="text-xs text-amber-700 font-medium">Alerta de stock</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Se activará cuando el stock caiga a {form.stockMinimo} {form.unidad}(s) o menos.
                  </p>
                </div>
              </div>

              {/* Precios */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Precios (CLP)</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Precio de compra">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <input type="number" min="0" value={form.precioCompra}
                        onChange={e => set({ precioCompra: Number(e.target.value) })}
                        className={`${inputCls} pl-7`} />
                    </div>
                  </Field>
                  <Field label="Precio de venta">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <input type="number" min="0" value={form.precioVenta}
                        onChange={e => set({ precioVenta: Number(e.target.value) })}
                        className={`${inputCls} pl-7`} />
                    </div>
                  </Field>
                  <div className={`rounded-xl p-3 border flex flex-col justify-center ${
                    form.precioVenta > form.precioCompra && form.precioCompra > 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className="text-xs text-gray-500 font-medium">Margen</p>
                    {form.precioCompra > 0 && form.precioVenta > 0 ? (
                      <>
                        <p className={`text-lg font-bold ${form.precioVenta >= form.precioCompra ? 'text-emerald-700' : 'text-red-600'}`}>
                          {(((form.precioVenta - form.precioCompra) / form.precioCompra) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">{fmtCLP(form.precioVenta - form.precioCompra)} por unidad</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Ingresa ambos precios</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen del documento */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-800 mb-2">Resumen del documento</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span className="text-gray-500">Tipo:</span>
                  <span className="font-medium text-gray-700 capitalize">{form.tipoDoc.replace('_',' ')}</span>
                  <span className="text-gray-500">Nº:</span>
                  <span className="font-medium text-gray-700">{form.numeroDoc || '—'}</span>
                  <span className="text-gray-500">Proveedor:</span>
                  <span className="font-medium text-gray-700">{form.proveedor || '—'}</span>
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-medium text-gray-700">{form.fechaDoc}</span>
                  <span className="text-gray-500">Total documento:</span>
                  <span className="font-bold text-emerald-700">{fmtCLP(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-2 h-2 rounded-full transition-all ${tab === t.key ? 'bg-emerald-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            {tab !== 'stock' ? (
              <button
                onClick={() => setTab(tab === 'documento' ? 'producto' : 'stock')}
                disabled={tab === 'documento' && !canSaveDoc}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={() => { syncFromItem(); onSave(form); }}
                disabled={!canSaveProd || !canSaveDoc || saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {saving ? 'Guardando...' : '✓ Registrar producto'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [editProd, setEditProd]   = useState<Producto | null>(null);
  const [search, setSearch]       = useState('');
  const [filtrocat, setFiltrocat] = useState<Categoria | ''>('');

  useEffect(() => {
    apiClient.get('/inventario')
      .then(r => setProductos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function guardar(form: Omit<Producto,'id'>) {
    setSaving(true);
    try {
      if (editProd) {
        const { data } = await apiClient.put(`/inventario/${editProd.id}`, form);
        setProductos(p => p.map(x => x.id === editProd.id ? data : x));
      } else {
        const { data } = await apiClient.post('/inventario', form);
        setProductos(p => [data, ...p]);
      }
      setShowModal(false);
      setEditProd(null);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const filtrados = useMemo(() => productos.filter(p => {
    const q = search.toLowerCase();
    const ms = !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.proveedor.toLowerCase().includes(q);
    const mc = !filtrocat || p.categoria === filtrocat;
    return ms && mc;
  }), [productos, search, filtrocat]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { medicamento: 0, alimento: 0, accesorio: 0, clinico: 0, otro: 0 };
    productos.forEach(p => { base[p.categoria] = (base[p.categoria] || 0) + 1; });
    return base;
  }, [productos]);

  const fmtCLP = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-400 mt-0.5">Control de productos y stock</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportar(true)}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Exportar Excel
          </button>
          <button
            onClick={() => { setEditProd(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Registrar entrada
          </button>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {(Object.entries(CATEGORIAS) as [Categoria, typeof CATEGORIAS[Categoria]][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFiltrocat(filtrocat === k ? '' : k)}
            className={`rounded-xl border p-4 text-left transition-all cursor-pointer hover:shadow-md ${v.color} ${
              filtrocat === k ? 'ring-2 ring-offset-1 ring-emerald-400 shadow-md' : ''
            }`}
          >
            <span className="text-xl block mb-1">{v.emoji}</span>
            <p className="text-2xl font-bold leading-none">{counts[k] ?? 0}</p>
            <p className="text-xs font-medium mt-1">{v.label}</p>
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-700 text-sm flex-shrink-0">
            {filtrocat ? `${CATEGORIAS[filtrocat].emoji} ${CATEGORIAS[filtrocat].label}` : 'Todos los productos'}
            {' '}<span className="text-gray-400 font-normal text-xs">({filtrados.length})</span>
          </h2>
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span className="col-span-4">Producto</span>
          <span className="col-span-2">Categoría</span>
          <span className="col-span-1 text-center">Stock</span>
          <span className="col-span-2 text-right">P. Compra</span>
          <span className="col-span-2 text-right">P. Venta</span>
          <span className="col-span-1 text-right">Acc.</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-400">Cargando inventario...</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-600 text-sm">
              {search || filtrocat ? 'Sin resultados' : 'Sin productos registrados'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || filtrocat ? 'Cambia los filtros' : 'Registra el primer producto con el botón superior'}
            </p>
          </div>
        ) : (
          filtrados.map(p => {
            const cat = CATEGORIAS[p.categoria];
            const bajoStock = p.stockActual <= p.stockMinimo;
            const vence = p.fechaVencimiento && new Date(p.fechaVencimiento) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return (
              <div key={p.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <div className="col-span-4">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.codigo && <span className="text-[10px] text-gray-400">{p.codigo}</span>}
                    {p.proveedor && <span className="text-[10px] text-gray-400">· {p.proveedor}</span>}
                    {vence && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Vence pronto</span>}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${cat.color}`}>
                    {cat.emoji} {cat.label}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-sm font-bold ${bajoStock ? 'text-red-600' : 'text-gray-700'}`}>
                    {p.stockActual}
                  </span>
                  <p className="text-[10px] text-gray-400">{p.unidad}</p>
                  {bajoStock && <span className="text-[10px] text-red-500 font-medium">⚠ bajo</span>}
                </div>
                <div className="col-span-2 text-right text-sm text-gray-600">{p.precioCompra > 0 ? fmtCLP(p.precioCompra) : '—'}</div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-700">{p.precioVenta > 0 ? fmtCLP(p.precioVenta) : '—'}</div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => { setEditProd(p); setShowModal(true); }}
                    className="text-gray-400 hover:text-emerald-700 transition-colors p-1"
                    title="Editar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtrados.length} producto(s) mostrado(s)</p>
          <p className="text-xs text-gray-400">{productos.length} en total</p>
        </div>
      </div>

      {showModal && (
        <ModalProducto
          onClose={() => { setShowModal(false); setEditProd(null); }}
          onSave={guardar}
          initial={editProd ? editProd : undefined}
          saving={saving}
        />
      )}

      {showExportar && (
        <ModalExportar
          onExport={filtro => exportarExcel(productos, filtro)}
          onClose={() => setShowExportar(false)}
        />
      )}
    </div>
  );
}
