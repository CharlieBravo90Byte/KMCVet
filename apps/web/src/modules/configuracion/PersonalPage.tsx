import { useState, useEffect, Fragment } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Tipos ────────────────────────────────────────────────────
interface StaffMember {
  id: string; nombre: string; cargo: string;
  email?: string | null; telefono?: string | null;
  notas?: string | null; activo: boolean; color: string;
}

interface Turno {
  id: string; staffId: string; fecha: string; tipo: string; notas?: string | null;
  staff?: { id: string; nombre: string; cargo: string; color: string };
}

// ─── Constantes ───────────────────────────────────────────────
const CARGOS: Record<string, string> = {
  MEDICO_VETERINARIO: 'Médico Veterinario',
  ASISTENTE:          'Asistente Veterinario',
  ENFERMERO:          'Enfermero/a',
  RECEPCIONISTA:      'Recepcionista',
  TECNICO:            'Técnico Veterinario',
  OTRO:               'Otro',
};

const TURNOS_INFO: Record<string, { label: string; color: string; textColor: string }> = {
  MAÑANA:  { label: 'Mañana',      color: 'bg-amber-100',   textColor: 'text-amber-800'   },
  TARDE:   { label: 'Tarde',       color: 'bg-blue-100',    textColor: 'text-blue-800'    },
  NOCHE:   { label: 'Noche',       color: 'bg-indigo-100',  textColor: 'text-indigo-800'  },
  DIA:     { label: 'Día completo',color: 'bg-emerald-100', textColor: 'text-emerald-800' },
  LIBRE:   { label: 'Libre',       color: 'bg-gray-100',    textColor: 'text-gray-500'    },
  BORRAR:  { label: 'Sin turno',   color: '',               textColor: ''                 },
};

const STAFF_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
};

const DIAS_ES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getWeekDates(base: Date): Date[] {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

// ─── Modal formulario personal ────────────────────────────────
function ModalPersonal({
  staff, onClose, onSaved,
}: {
  staff: StaffMember | null;
  onClose: () => void;
  onSaved: (s: StaffMember) => void;
}) {
  const [form, setForm] = useState({
    nombre:   staff?.nombre   ?? '',
    cargo:    staff?.cargo    ?? 'MEDICO_VETERINARIO',
    email:    staff?.email    ?? '',
    telefono: staff?.telefono ?? '',
    notas:    staff?.notas    ?? '',
    color:    staff?.color    ?? 'emerald',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        cargo: form.cargo,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        notas: form.notas.trim() || null,
        color: form.color,
      };
      const { data } = staff
        ? await apiClient.put(`/personal/${staff.id}`, payload)
        : await apiClient.post('/personal', payload);
      onSaved(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  }

  const colorInfo = STAFF_COLORS[form.color] ?? STAFF_COLORS.emerald;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[94vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{staff ? 'Editar personal' : 'Agregar personal'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre completo <span className="text-red-400">*</span></label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              placeholder="Ej: Dr. Juan Pérez"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Cargo</label>
            <select value={form.cargo} onChange={e => setForm(f => ({...f, cargo: e.target.value}))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              {Object.entries(CARGOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="correo@ejemplo.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono</label>
              <input type="tel" value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
                placeholder="+56 9..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))}
              rows={2} placeholder="Especialidad, observaciones..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Color de identificación</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STAFF_COLORS).map(c => (
                <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                  className={`w-8 h-8 rounded-full ${STAFF_COLORS[c].dot} transition-all ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={guardar} disabled={saving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 ${colorInfo.dot} hover:opacity-90`}>
            {saving ? 'Guardando...' : (staff ? 'Guardar cambios' : 'Agregar personal')}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pestaña Personal ─────────────────────────────────────────
function TabPersonal({ staff, setStaff }: { staff: StaffMember[]; setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>> }) {
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<StaffMember | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState<'todos' | string>('todos');

  useEffect(() => {
    apiClient.get('/personal')
      .then(r => setStaff(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleActivo(s: StaffMember) {
    try {
      const { data } = await apiClient.put(`/personal/${s.id}`, { activo: !s.activo });
      setStaff(p => p.map(x => x.id === s.id ? data : x));
    } catch {}
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este miembro del personal? También se borrarán sus turnos.')) return;
    try {
      await apiClient.delete(`/personal/${id}`);
      setStaff(p => p.filter(x => x.id !== id));
    } catch {}
  }

  const cargosPresentes = [...new Set(staff.map(s => s.cargo))];
  const filtrados = filtro === 'todos' ? staff : staff.filter(s => s.cargo === filtro);
  const activos   = filtrados.filter(s => s.activo);
  const inactivos = filtrados.filter(s => !s.activo);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === 'todos' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todos ({staff.length})
          </button>
          {cargosPresentes.map(c => (
            <button key={c} onClick={() => setFiltro(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === c ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {CARGOS[c] ?? c}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Agregar personal
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <p className="text-sm text-gray-400">Sin personal registrado</p>
          <button onClick={() => { setEditItem(null); setShowForm(true); }}
            className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Agregar el primero</button>
        </div>
      ) : (
        <>
          {activos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Activos · {activos.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activos.map(s => <TarjetaPersonal key={s.id} s={s} onEdit={() => { setEditItem(s); setShowForm(true); }} onToggle={() => toggleActivo(s)} onDelete={() => eliminar(s.id)} />)}
              </div>
            </div>
          )}
          {inactivos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Inactivos · {inactivos.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
                {inactivos.map(s => <TarjetaPersonal key={s.id} s={s} onEdit={() => { setEditItem(s); setShowForm(true); }} onToggle={() => toggleActivo(s)} onDelete={() => eliminar(s.id)} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ModalPersonal
          staff={editItem}
          onClose={() => setShowForm(false)}
          onSaved={s => {
            setStaff(p => editItem ? p.map(x => x.id === s.id ? s : x) : [...p, s]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function TarjetaPersonal({ s, onEdit, onToggle, onDelete }: {
  s: StaffMember;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const colors = STAFF_COLORS[s.color] ?? STAFF_COLORS.emerald;
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 ${!s.activo ? 'opacity-70' : ''}`}>
      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-sm font-bold ${colors.text}`}>{s.nombre.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</p>
          {!s.activo && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactivo</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{CARGOS[s.cargo] ?? s.cargo}</p>
        {s.telefono && <p className="text-xs text-gray-400 mt-0.5">{s.telefono}</p>}
        {s.email    && <p className="text-xs text-gray-400">{s.email}</p>}
        {s.notas    && <p className="text-xs text-gray-400 italic mt-0.5 truncate">{s.notas}</p>}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={onEdit} title="Editar"
          className="w-7 h-7 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.071-6.071a2 2 0 012.829 2.829L11.828 13.9a4 4 0 01-1.414.93l-2.828.707.707-2.828A4 4 0 019 11z"/></svg>
        </button>
        <button onClick={onToggle} title={s.activo ? 'Desactivar' : 'Activar'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${s.activo ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          {s.activo
            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          }
        </button>
        <button onClick={onDelete} title="Eliminar"
          className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Pestaña Turnos ───────────────────────────────────────────
function TabTurnos({ staff }: { staff: StaffMember[] }) {
  const [navBase, setNavBase] = useState(new Date());
  const [turnos,  setTurnos]  = useState<Turno[]>([]);
  const [popover, setPopover] = useState<{ staffId: string; fecha: string } | null>(null);
  const hoy = dateKey(new Date());

  const dias = getWeekDates(navBase);

  useEffect(() => {
    if (staff.length === 0) return;
    const desde = dateKey(dias[0]);
    const hasta  = dateKey(dias[6]);
    apiClient.get(`/personal/turnos?desde=${desde}&hasta=${hasta}`)
      .then(r => setTurnos(r.data))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navBase, staff.length]);

  function getTurno(staffId: string, fecha: string) {
    return turnos.find(t => t.staffId === staffId && t.fecha === fecha);
  }

  async function asignarTurno(staffId: string, fecha: string, tipo: string) {
    setPopover(null);
    try {
      if (tipo === 'BORRAR') {
        await apiClient.post(`/personal/${staffId}/turnos`, { fecha, tipo: 'BORRAR' });
        setTurnos(p => p.filter(t => !(t.staffId === staffId && t.fecha === fecha)));
      } else {
        const { data } = await apiClient.post(`/personal/${staffId}/turnos`, { fecha, tipo });
        setTurnos(p => {
          const sin = p.filter(t => !(t.staffId === staffId && t.fecha === fecha));
          return [...sin, { ...data, staff: undefined }];
        });
      }
    } catch {}
  }

  const activos = staff.filter(s => s.activo);

  return (
    <div className="space-y-4">
      {/* Navegación semana */}
      <div className="flex items-center gap-3">
        <button onClick={() => setNavBase(b => { const d = new Date(b); d.setDate(d.getDate()-7); return d; })}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
          {dias[0].getDate()} {MESES_ES[dias[0].getMonth()]} – {dias[6].getDate()} {MESES_ES[dias[6].getMonth()]} {dias[6].getFullYear()}
        </span>
        <button onClick={() => setNavBase(b => { const d = new Date(b); d.setDate(d.getDate()+7); return d; })}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <button onClick={() => setNavBase(new Date())}
          className="text-xs text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50">
          Hoy
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TURNOS_INFO).filter(([k]) => k !== 'BORRAR').map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span className={`w-3 h-3 rounded-full ${v.color}`} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Tabla de turnos */}
      {activos.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">Agrega personal activo para gestionar turnos</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">Personal</th>
                {dias.map((d, i) => {
                  const isHoy = dateKey(d) === hoy;
                  return (
                    <th key={i} className={`py-3 border-b border-gray-100 text-center text-xs font-semibold ${isHoy ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                      <p className="font-bold">{DIAS_ES[d.getDay()]}</p>
                      <p className={`text-base font-bold ${isHoy ? 'text-emerald-600' : 'text-gray-700'}`}>{d.getDate()}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activos.map(s => {
                const colors = STAFF_COLORS[s.color] ?? STAFF_COLORS.emerald;
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{s.nombre}</p>
                          <p className="text-[10px] text-gray-400 truncate">{CARGOS[s.cargo] ?? s.cargo}</p>
                        </div>
                      </div>
                    </td>
                    {dias.map((d, di) => {
                      const fecha  = dateKey(d);
                      const turno  = getTurno(s.id, fecha);
                      const info   = turno ? (TURNOS_INFO[turno.tipo] ?? TURNOS_INFO.DIA) : null;
                      const isOpen = popover?.staffId === s.id && popover.fecha === fecha;
                      return (
                        <td key={di} className="px-1 py-1.5 text-center relative">
                          <button
                            onClick={() => setPopover(isOpen ? null : { staffId: s.id, fecha })}
                            title="Click para asignar turno"
                            className={`w-full h-9 rounded-lg text-[10px] font-semibold transition-all ${
                              info
                                ? `${info.color} ${info.textColor} hover:opacity-80`
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-300'
                            }`}>
                            {info ? info.label : '–'}
                          </button>
                          {isOpen && (
                            <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[140px]">
                              {Object.entries(TURNOS_INFO).map(([k, v]) => (
                                <button key={k} onClick={() => asignarTurno(s.id, fecha, k)}
                                  className={`w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-gray-50 font-medium transition-colors ${
                                    turno?.tipo === k ? 'bg-gray-100 font-bold' : ''
                                  }`}>
                                  {k === 'BORRAR' ? '🗑 Quitar turno' : v.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista global del día */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vista global — hoy {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        {activos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin personal activo</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activos.map(s => {
              const turno = getTurno(s.id, hoy);
              const info  = turno ? (TURNOS_INFO[turno.tipo] ?? TURNOS_INFO.DIA) : null;
              const colors = STAFF_COLORS[s.color] ?? STAFF_COLORS.emerald;
              return (
                <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                  info ? `${info.color} border-transparent ${info.textColor}` : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span>{s.nombre.split(' ')[0]}</span>
                  {info && <span className="opacity-70">· {info.label}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cerrar popover al hacer click fuera */}
      {popover && (
        <div className="fixed inset-0 z-20" onClick={() => setPopover(null)} />
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function PersonalPage() {
  const [tab, setTab]     = useState<'personal' | 'turnos'>('personal');
  const [staff, setStaff] = useState<StaffMember[]>([]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Personal</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestión del equipo de trabajo y turnos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('personal')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'personal' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Personal
        </button>
        <button onClick={() => setTab('turnos')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'turnos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Turnos
        </button>
      </div>

      {tab === 'personal' && <TabPersonal staff={staff} setStaff={setStaff} />}
      {tab === 'turnos'   && <TabTurnos staff={staff} />}
    </div>
  );
}
