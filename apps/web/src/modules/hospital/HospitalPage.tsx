import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Tipos ────────────────────────────────────────────────────
interface Hospedaje {
  id: string;
  petId: string;
  propietarioId: string;
  fechaEntrada: string;
  fechaSalidaEst?: string;
  fechaSalidaReal?: string;
  estado: string;
  tipoAlojamiento?: string;
  dieta?: string;
  cuidados?: string;
  observaciones?: string;
  precioPorNoche?: number;
  notas?: string;
  createdAt: string;
  updatedAt?: string;
  pet: { id: string; nombre: string; especie: string; raza?: string };
  propietario: { id: string; nombre: string; telefono: string };
}

interface Pet {
  id: string;
  nombre: string;
  especie: string;
  raza?: string;
  tutorId?: string;
  tutor: { id: string; nombre: string; telefono: string };
}

// ─── Helpers ──────────────────────────────────────────────────
const ESPECIES: Record<string, string> = {
  DOG: '🐶', CAT: '🐱', BIRD: '🐦', RABBIT: '🐰', REPTILE: '🦎', OTHER: '🐾'
};
const ESPECIE_LABEL: Record<string, string> = {
  DOG: 'Perro', CAT: 'Gato', BIRD: 'Ave', RABBIT: 'Conejo', REPTILE: 'Reptil', OTHER: 'Otro'
};
const TIPO_LABEL: Record<string, string> = {
  jaula_pequena: 'Jaula pequeña', jaula_mediana: 'Jaula mediana',
  jaula_grande: 'Jaula grande', area: 'Área libre',
};
const diasDiferencia = (a: string, b?: string) => {
  const d1 = new Date(a); const d2 = b ? new Date(b) : new Date();
  return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
};
const fmtFecha = (f?: string) => f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtPeso  = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

// ─── Modal Check-in ───────────────────────────────────────────
function ModalCheckin({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [todasMascotas, setTodasMascotas] = useState<Pet[]>([]);
  const [filtroEspecie, setFiltroEspecie]  = useState<string>('');
  const [filtroBuscar,  setFiltroBuscar]   = useState('');
  const [form, setForm] = useState({
    petId: '', propietarioId: '',
    fechaEntrada: new Date().toISOString().slice(0, 10),
    fechaSalidaEst: '',
    tipoAlojamiento: 'jaula_mediana',
    dieta: '', cuidados: '', observaciones: '',
    precioPorNoche: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/animales').then(r => {
      // El endpoint devuelve un array directo
      const arr = Array.isArray(r.data) ? r.data : (r.data.items ?? r.data.mascotas ?? []);
      setTodasMascotas(arr);
    });
  }, []);

  // Especies disponibles en la lista real
  const especiesDisponibles = Array.from(new Set(todasMascotas.map(p => p.especie))).sort();

  // Filtrado: por especie + búsqueda libre
  const mascotasFiltradas = todasMascotas.filter(p => {
    const matchEspecie = !filtroEspecie || p.especie === filtroEspecie;
    const q = filtroBuscar.toLowerCase();
    const matchBuscar = !q ||
      p.nombre.toLowerCase().includes(q) ||
      (p.raza ?? '').toLowerCase().includes(q) ||
      p.tutor?.nombre?.toLowerCase().includes(q);
    return matchEspecie && matchBuscar;
  });

  const selPet = todasMascotas.find(p => p.id === form.petId);

  const handlePetChange = (id: string) => {
    const p = todasMascotas.find(m => m.id === id);
    setForm(f => ({ ...f, petId: id, propietarioId: p?.tutor?.id ?? p?.tutorId ?? '' }));
  };

  const handleSave = async () => {
    if (!form.petId || !form.fechaEntrada) return;
    setSaving(true);
    try {
      await apiClient.post('/hospital', {
        ...form,
        precioPorNoche: form.precioPorNoche ? Number(form.precioPorNoche) : undefined,
        fechaSalidaEst: form.fechaSalidaEst || undefined,
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Nuevo ingreso — Check-in</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── Filtros de mascota ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Buscar mascota *</label>

            {/* Filtro por especie */}
            {especiesDisponibles.length > 1 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                <button onClick={() => setFiltroEspecie('')}
                  className={`text-xs px-3 py-1 rounded-full border font-semibold transition-colors ${!filtroEspecie ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                  Todas
                </button>
                {especiesDisponibles.map(e => (
                  <button key={e} onClick={() => { setFiltroEspecie(e); setForm(f => ({ ...f, petId: '', propietarioId: '' })); }}
                    className={`text-xs px-3 py-1 rounded-full border font-semibold transition-colors ${filtroEspecie === e ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                    {ESPECIES[e]} {ESPECIE_LABEL[e] ?? e}
                  </button>
                ))}
              </div>
            )}

            {/* Búsqueda libre */}
            <input type="text" placeholder="Buscar por nombre, raza o tutor…"
              value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2" />

            {/* Select de mascotas */}
            <select value={form.petId} onChange={e => handlePetChange(e.target.value)}
              size={Math.min(6, mascotasFiltradas.length + 1)}
              className="w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 overflow-auto">
              <option value="">— Seleccionar mascota —</option>
              {mascotasFiltradas.length === 0 && (
                <option disabled>Sin resultados para ese filtro</option>
              )}
              {mascotasFiltradas.map(p => (
                <option key={p.id} value={p.id}>
                  {ESPECIES[p.especie] ?? '🐾'} {p.nombre}{p.raza ? ` (${p.raza})` : ''} — {p.tutor?.nombre ?? ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {mascotasFiltradas.length} mascota{mascotasFiltradas.length !== 1 ? 's' : ''} · Formato: emoji Nombre (raza) — Tutor
            </p>
          </div>

          {/* Resumen mascota seleccionada */}
          {selPet && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 space-y-0.5">
              <p className="font-bold text-sm">{ESPECIES[selPet.especie]} {selPet.nombre} {selPet.raza ? <span className="font-normal text-blue-700">· {selPet.raza}</span> : ''}</p>
              <p>👤 Tutor: <strong>{selPet.tutor?.nombre}</strong> · 📞 {selPet.tutor?.telefono}</p>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha entrada *</label>
              <input type="date" value={form.fechaEntrada} onChange={e => setForm(f => ({ ...f, fechaEntrada: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Salida estimada</label>
              <input type="date" value={form.fechaSalidaEst} onChange={e => setForm(f => ({ ...f, fechaSalidaEst: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          {/* Alojamiento + precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo alojamiento</label>
              <select value={form.tipoAlojamiento} onChange={e => setForm(f => ({ ...f, tipoAlojamiento: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Precio / noche ($)</label>
              <input type="number" min={0} placeholder="0" value={form.precioPorNoche}
                onChange={e => setForm(f => ({ ...f, precioPorNoche: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          {/* Dieta */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Dieta / alimentación</label>
            <input type="text" placeholder="Ej: 3 cucharadas de croquetas 2x al día" value={form.dieta}
              onChange={e => setForm(f => ({ ...f, dieta: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Cuidados */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cuidados especiales</label>
            <input type="text" placeholder="Ej: Medicamento 12h, evitar estrés, …" value={form.cuidados}
              onChange={e => setForm(f => ({ ...f, cuidados: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Observaciones generales</label>
            <textarea rows={2} placeholder="Notas del propietario, condiciones previas, …" value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={handleSave} disabled={!form.petId || !form.fechaEntrada || saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Registrar ingreso'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de hospedaje activo ──────────────────────────────
function TarjetaHospedaje({ h, onCheckout, onUpdate }: {
  h: Hospedaje; onCheckout: (id: string) => void; onUpdate: () => void;
}) {
  const dias = diasDiferencia(h.fechaEntrada);
  const [notasEdit, setNotasEdit] = useState(false);
  const [nota, setNota] = useState(h.notas ?? '');
  const [saving, setSaving] = useState(false);

  const guardarNota = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/hospital/${h.id}`, { notas: nota });
      setNotasEdit(false); onUpdate();
    } finally { setSaving(false); }
  };

  const total = h.precioPorNoche ? h.precioPorNoche * dias : undefined;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ESPECIES[h.pet.especie] ?? '🐾'}</span>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{h.pet.nombre}</p>
            <p className="text-xs text-gray-500">{h.pet.raza ?? h.pet.especie?.toLowerCase()}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{dias}d</span>
          {h.tipoAlojamiento && <p className="text-xs text-gray-500 mt-0.5">{TIPO_LABEL[h.tipoAlojamiento] ?? h.tipoAlojamiento}</p>}
        </div>
      </div>
      {/* Body */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="flex items-start gap-2 text-sm">
          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span className="text-gray-700">{h.propietario.nombre} <span className="text-gray-400 text-xs">· {h.propietario.telefono}</span></span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>🗓️ Entrada: <strong className="text-gray-700">{fmtFecha(h.fechaEntrada)}</strong></span>
          {h.fechaSalidaEst && <span>📤 Sale: <strong className="text-gray-700">{fmtFecha(h.fechaSalidaEst)}</strong></span>}
        </div>
        {h.dieta && <p className="text-xs text-gray-600">🍽 <strong>Dieta:</strong> {h.dieta}</p>}
        {h.cuidados && <p className="text-xs text-gray-600">💊 <strong>Cuidados:</strong> {h.cuidados}</p>}
        {total !== undefined && (
          <p className="text-xs font-semibold text-blue-700">Total acumulado: {fmtPeso(total)} ({dias} noches)</p>
        )}
        {/* Notas rápidas */}
        <div>
          {notasEdit ? (
            <div className="space-y-1">
              <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              <div className="flex gap-1.5">
                <button onClick={guardarNota} disabled={saving}
                  className="text-xs text-white bg-blue-600 px-3 py-1 rounded-lg disabled:opacity-50">
                  {saving ? '…' : 'Guardar'}
                </button>
                <button onClick={() => { setNotasEdit(false); setNota(h.notas ?? ''); }}
                  className="text-xs text-gray-500 px-2 py-1">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNotasEdit(true)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              📝 {nota ? nota : 'Agregar nota del día…'}
            </button>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="px-5 pb-4">
        <button onClick={() => onCheckout(h.id)}
          className="w-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl transition-colors">
          ✅ Dar de alta (Check-out)
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function HospitalPage() {
  const [hospedajes, setHospedajes]   = useState<Hospedaje[]>([]);
  const [historial,  setHistorial]    = useState<Hospedaje[]>([]);
  const [stats,      setStats]        = useState({ activos: 0, total: 0 });
  const [loading,    setLoading]      = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [tab, setTab]                 = useState<'activos' | 'historial'>('activos');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      apiClient.get('/hospital?estado=activo'),
      apiClient.get('/hospital?estado=finalizado'),
      apiClient.get('/hospital/stats'),
    ]).then(([actvRes, histRes, statsRes]) => {
      if (actvRes.status === 'fulfilled') setHospedajes(actvRes.value.data ?? []);
      if (histRes.status === 'fulfilled') setHistorial(histRes.value.data ?? []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data ?? { activos: 0, total: 0 });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCheckout = async (id: string) => {
    if (!confirm('¿Confirmar alta del paciente?')) return;
    await apiClient.patch(`/hospital/${id}/checkout`, {});
    cargar();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            Hospital · Hospedaje
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestión de internaciones y cuidados</p>
        </div>
        <button onClick={() => setShowCheckin(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nuevo ingreso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Hospedados ahora', value: stats.activos, icon: '🏨', color: 'border-blue-100 bg-blue-50', text: 'text-blue-700' },
          { label: 'Egresos del mes', value: historial.filter(h => new Date(h.fechaSalidaReal ?? '').getMonth() === new Date().getMonth()).length, icon: '✅', color: 'border-emerald-100 bg-emerald-50', text: 'text-emerald-700' },
          { label: 'Total hospedajes', value: stats.total, icon: '📋', color: 'border-gray-100 bg-gray-50', text: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-xl p-5`}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <p className={`text-3xl font-bold ${s.text}`}>{loading ? '…' : s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        {(['activos', 'historial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'activos' ? `Activos (${hospedajes.length})` : `Historial (${historial.length})`}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'activos' ? (
        hospedajes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-3">🏨</div>
            <h3 className="font-semibold text-gray-700 mb-1">Sin pacientes hospedados</h3>
            <p className="text-sm text-gray-400">Registra un ingreso con el botón «Nuevo ingreso»</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hospedajes.map(h => (
              <TarjetaHospedaje key={h.id} h={h} onCheckout={handleCheckout} onUpdate={cargar} />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {historial.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Sin registros de hospedajes finalizados.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Mascota', 'Propietario', 'Entrada', 'Salida', 'Noches', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historial.map(h => {
                  const noches = diasDiferencia(h.fechaEntrada, h.fechaSalidaReal ?? h.updatedAt);
                  const total  = h.precioPorNoche ? h.precioPorNoche * noches : undefined;
                  return (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{ESPECIES[h.pet.especie]} {h.pet.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{h.propietario.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtFecha(h.fechaEntrada)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtFecha(h.fechaSalidaReal)}</td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{noches}d</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{total !== undefined ? fmtPeso(total) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCheckin && (
        <ModalCheckin onClose={() => setShowCheckin(false)} onSaved={() => { setShowCheckin(false); cargar(); }} />
      )}
    </div>
  );
}

