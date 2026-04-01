import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/lib/api';
// ─── Tipos ────────────────────────────────────────────────────────
type Duration = 15 | 30 | 60;
type Vista = 'semana' | 'mes';

interface Doctor {
  id: string;
  nombre: string;
  color: string;
  colorLight: string;
  colorText: string;
  hoverBg: string;
  borderColor: string;
}

interface TipoAtencion {
  id: string;
  label: string;
  activo: boolean;
}

interface Cita {
  id: string;
  fecha: string;     // "YYYY-MM-DD"
  hora: number;      // minutos desde HORA_INICIO (0 = 09:00)
  duracion: Duration;
  mascota: string;
  mascotaId: string;
  propietario: string;
  motivo: string;
  doctorId: string;
  doctorNombre?: string;
}

interface FormCita {
  fecha: string;
  hora: number;
  duracion: Duration;
  mascota: string;
  propietario: string;
  mascotaId: string;
  motivoKey: string;
  motivoCustom: string;
  doctorId: string; // '' = no asignado (origen vista mensual)
}

// ─── Constantes ───────────────────────────────────────────────────
const HORA_INICIO = 9 * 60;
const HORA_FIN    = 21 * 60;
const SLOT_PX     = 64;

// Paleta de colores por índice (para doctores dinámicos)
const PALETTE = [
  { color: 'bg-emerald-500', colorLight: 'bg-emerald-50', colorText: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100/70', borderColor: 'border-emerald-300' },
  { color: 'bg-teal-500',    colorLight: 'bg-teal-50',    colorText: 'text-teal-700',    hoverBg: 'hover:bg-teal-100/70',    borderColor: 'border-teal-300'    },
  { color: 'bg-cyan-600',    colorLight: 'bg-cyan-50',    colorText: 'text-cyan-700',    hoverBg: 'hover:bg-cyan-100/70',    borderColor: 'border-cyan-300'    },
  { color: 'bg-blue-500',    colorLight: 'bg-blue-50',    colorText: 'text-blue-700',    hoverBg: 'hover:bg-blue-100/70',    borderColor: 'border-blue-300'    },
  { color: 'bg-violet-500',  colorLight: 'bg-violet-50',  colorText: 'text-violet-700',  hoverBg: 'hover:bg-violet-100/70',  borderColor: 'border-violet-300'  },
  { color: 'bg-rose-500',    colorLight: 'bg-rose-50',    colorText: 'text-rose-700',    hoverBg: 'hover:bg-rose-100/70',    borderColor: 'border-rose-300'    },
];

function buildDoctores(raw: { id: string; nombre: string }[]): Doctor[] {
  return raw.map((r, i) => ({
    id: r.id,
    nombre: r.nombre,
    ...PALETTE[i % PALETTE.length],
  }));
}

// Motivos default (fallback si la API no devuelve tipos)
const MOTIVOS_DEFAULT = [
  { id: 'control',    label: 'Control anual'         },
  { id: 'vacuna',     label: 'Vacunación'            },
  { id: 'desparasit', label: 'Desparasitación'       },
  { id: 'cirugia',    label: 'Cirugía programada'    },
  { id: 'urgencia',   label: 'Urgencia / Emergencia' },
  { id: 'revision',   label: 'Revisión post-op'      },
  { id: 'dental',     label: 'Limpieza dental'       },
  { id: 'derma',      label: 'Dermatología'          },
  { id: 'otro',       label: 'Otro motivo…'          },
];

const DIAS    = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_C = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// ─── Helpers ──────────────────────────────────────────────────────
function minToHms(min: number): string {
  const t = HORA_INICIO + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseFechaLabel(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return `${DIAS[dow]} ${d} ${MESES_C[m - 1]}`;
}

function getWeekDates(base: Date): Date[] {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function getMonthGrid(base: Date): (Date | null)[][] {
  const y = base.getFullYear(), m = base.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const lastDay  = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => new Date(y, m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

function isOcupado(
  citas: Cita[], docId: string, fecha: string, inicio: number, dur: number,
): boolean {
  return citas.some(
    c => c.doctorId === docId && c.fecha === fecha &&
         inicio < c.hora + c.duracion && inicio + dur > c.hora,
  );
}

// ─── Modal detalle de cita ────────────────────────────────────────
function ModalDetalleCita({
  cita,
  doctores,
  onClose,
  onEliminar,
  onCobrar,
}: {
  cita: Cita;
  doctores: Doctor[];
  onClose: () => void;
  onEliminar: (id: string) => void;
  onCobrar: (cita: Cita) => void;
}) {
  const [historial, setHistorial] = useState<Cita[]>([]);
  const [loadingH, setLoadingH]   = useState(false);

  const doc = doctores.find(d => d.id === cita.doctorId);

  useEffect(() => {
    if (!cita.mascotaId) return;
    setLoadingH(true);
    apiClient.get(`/citas/historial/${cita.mascotaId}`)
      .then(({ data }) => setHistorial((data as Cita[]).filter(c => c.id !== cita.id)))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [cita.mascotaId, cita.id]);

  const headerBg     = doc?.colorLight  ?? 'bg-gray-50';
  const headerBorder = doc?.borderColor ?? 'border-gray-200';
  const headerText   = doc?.colorText   ?? 'text-gray-700';
  const btnColor     = doc?.color       ?? 'bg-emerald-600';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${headerBg} border-b ${headerBorder} rounded-t-2xl flex-shrink-0`}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-3 h-3 rounded-full inline-block ${doc?.color ?? 'bg-gray-400'}`} />
              <span className={`font-bold text-base ${headerText}`}>{doc?.nombre ?? cita.doctorNombre ?? 'Sin doctor asignado'}</span>
            </div>
            <p className="text-xs text-gray-500">
              {parseFechaLabel(cita.fecha)} · {minToHms(cita.hora)} · {cita.duracion === 60 ? '1 hora' : `${cita.duracion} min`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Paciente + tutor */}
          <div className={`${headerBg} rounded-xl p-4 space-y-3 border ${headerBorder}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐾</span>
              <div>
                <p className={`font-bold text-lg ${headerText}`}>{cita.mascota}</p>
                <p className="text-xs text-gray-500">
                  {cita.propietario ? `Tutor: ${cita.propietario}` : 'Sin tutor registrado'}
                </p>
              </div>
            </div>
            <div className="border-t border-white/60 pt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Motivo de consulta</p>
              <p className="text-sm font-medium text-gray-700">{cita.motivo}</p>
            </div>
          </div>

          {/* Historial de atenciones */}
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <span>Historial de atenciones</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ${btnColor}`}>
                {cita.mascota}
              </span>
            </h3>

            {!cita.mascotaId ? (
              <p className="text-xs text-gray-400 text-center py-3 italic">
                Mascota ingresada manualmente — sin historial vinculado
              </p>
            ) : loadingH ? (
              <div className="flex justify-center py-6">
                <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400">Sin atenciones anteriores</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {historial.map(h => {
                  const hDoc = doctores.find(d => d.id === h.doctorId);
                  return (
                    <div key={h.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${hDoc?.color ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-700">{parseFechaLabel(h.fecha)}</p>
                          <p className="text-[10px] text-gray-400 flex-shrink-0">{minToHms(h.hora)}</p>
                        </div>
                        <p className="text-[10px] text-gray-600 truncate">{h.motivo}</p>
                        <p className={`text-[10px] font-medium ${hDoc?.colorText ?? 'text-gray-500'}`}>
                          {hDoc?.nombre ?? 'Doctor desconocido'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => { onEliminar(cita.id); onClose(); }}
            className="py-2 px-3 rounded-lg text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={() => { onCobrar(cita); onClose(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cobrar
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 ${btnColor}`}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Modal nueva cita ─────────────────────────────────────────────
function ModalNuevaCita({
  form, citas, doctores, motivos, onClose, onChange, onSave, saving,
}: {
  form: FormCita;
  citas: Cita[];
  doctores: Doctor[];
  motivos: { id: string; label: string }[];
  onClose: () => void;
  onChange: (p: Partial<FormCita>) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const doc         = doctores.find(d => d.id === form.doctorId);
  const preAsignado = !!doc;
  const selectedMotivoLabel = motivos.find(m => m.id === form.motivoKey)?.label ?? '';
  const esOtro      = form.motivoKey === 'otro' || selectedMotivoLabel.toLowerCase().startsWith('otro');
  const motivoLabel = selectedMotivoLabel;
  const slots       = Array.from({ length: (HORA_FIN - HORA_INICIO) / 15 }, (_, i) => i * 15);
  const durOk       = (d: Duration) => !doc || !isOcupado(citas, doc.id, form.fecha, form.hora, d);
  const canSave     = !!form.doctorId && !!form.mascota && !!form.propietario &&
                      (esOtro ? !!form.motivoCustom.trim() : !!form.motivoKey);

  const headerBg     = doc?.colorLight   ?? 'bg-gray-50';
  const headerBorder = doc?.borderColor  ?? 'border-gray-200';
  const headerText   = doc?.colorText    ?? 'text-gray-700';
  const btnColor     = doc?.color        ?? 'bg-emerald-600';

  // ─── Estado interno para búsqueda de tutor ─────────────────────
  interface TutorResult {
    id: string; nombre: string; documento: string; telefono: string;
    mascotas: { id: string; nombre: string; especie: string; raza: string }[];
  }
  const [rutInput, setRutInput]           = useState('');
  const [searching, setSearching]         = useState(false);
  const [tutorResult, setTutorResult]     = useState<TutorResult | null>(null);
  const [tutorNotFound, setTutorNotFound] = useState(false);
  const [manualMode, setManualMode]       = useState(false);
  const [showMiniForm, setShowMiniForm]   = useState(false);
  const [miniNombre, setMiniNombre]       = useState('');
  const [miniEspecie, setMiniEspecie]     = useState('DOG');
  const [miniSexo, setMiniSexo]           = useState('M');
  const [savingMini, setSavingMini]       = useState(false);

  const ESPECIES_MINI = [
    { k: 'DOG', e: '🐕' }, { k: 'CAT', e: '🐈' }, { k: 'BIRD', e: '🦜' },
    { k: 'RABBIT', e: '🐰' }, { k: 'REPTIL', e: '🦎' }, { k: 'OTHER', e: '🐾' },
  ];

  async function buscarTutor() {
    if (!rutInput.trim()) return;
    setSearching(true);
    setTutorResult(null);
    setTutorNotFound(false);
    setManualMode(false);
    setShowMiniForm(false);
    try {
      const { data } = await apiClient.get(`/animales/buscar-tutor?rut=${encodeURIComponent(rutInput.trim())}`);
      if (data) {
        setTutorResult(data);
      } else {
        setTutorNotFound(true);
      }
    } catch {
      setTutorNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  function seleccionarMascota(m: TutorResult['mascotas'][0], tutor: TutorResult) {
    onChange({ mascota: m.nombre, propietario: tutor.nombre, mascotaId: m.id });
    setShowMiniForm(false);
  }

  async function crearMascota() {
    if (!tutorResult || !miniNombre.trim()) return;
    setSavingMini(true);
    try {
      const { data } = await apiClient.post('/animales', {
        nombre: miniNombre.trim(),
        especie: miniEspecie,
        sexo: miniSexo,
        raza: '', color: '', microchip: '', peso: '',
        alergias: '', condiciones: '', foto: '', fechaNacimiento: '',
        tutor: {
          nombre: tutorResult.nombre,
          documento: tutorResult.documento,
          telefono: tutorResult.telefono,
          email: '', direccion: '',
        },
      });
      setTutorResult(prev => prev
        ? { ...prev, mascotas: [...prev.mascotas, { id: data.id, nombre: data.nombre, especie: data.especie, raza: data.raza }] }
        : prev);
      onChange({ mascota: data.nombre, propietario: tutorResult.nombre, mascotaId: data.id });
      setShowMiniForm(false);
      setMiniNombre('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al crear mascota');
    } finally {
      setSavingMini(false);
    }
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[94vh]">

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${headerBg} border-b ${headerBorder} rounded-t-2xl flex-shrink-0`}>
          <div>
            {preAsignado && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-3 h-3 rounded-full inline-block ${doc!.color}`} />
                <span className={`font-bold text-base ${headerText}`}>{doc!.nombre}</span>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {parseFechaLabel(form.fecha)} · {minToHms(form.hora)}
              {!preAsignado && ' · Elige doctor abajo'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* Doctor — solo si no viene pre-asignado (vista mensual) */}
          {!preAsignado && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Doctor</label>
              <div className="grid grid-cols-3 gap-2">
                {doctores.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onChange({ doctorId: d.id })}
                    className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      form.doctorId === d.id
                        ? `${d.color} text-white border-transparent shadow-md`
                        : `${d.colorLight} ${d.colorText} border-transparent hover:border-current`
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${form.doctorId === d.id ? 'bg-white/60' : d.color}`} />
                    {d.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hora — solo si no viene pre-asignada (vista mensual) */}
          {!preAsignado && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
              <select
                value={form.hora}
                onChange={e => onChange({ hora: Number(e.target.value) })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {slots.map(m => <option key={m} value={m}>{minToHms(m)}</option>)}
              </select>
            </div>
          )}

          {/* Duración */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Duración</label>
            <div className="flex gap-2">
              {([15, 30, 60] as Duration[]).map(d => (
                <button
                  key={d}
                  disabled={!durOk(d)}
                  onClick={() => onChange({ duracion: d })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                    form.duracion === d
                      ? `${btnColor} text-white border-transparent shadow-sm`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {d === 60 ? '1 hora' : `${d} min`}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tutor / Paciente ─── */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Tutor / Paciente</label>

            {/* Buscador por RUT */}
            <div className="flex gap-2 mb-3">
              <input
                value={rutInput}
                onChange={e => setRutInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarTutor()}
                placeholder="RUT del tutor (ej: 12.345.678-9)"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={buscarTutor}
                disabled={searching || !rutInput.trim()}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 flex-shrink-0 ${btnColor}`}
              >
                {searching
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  : 'Buscar'}
              </button>
            </div>

            {/* Tutor encontrado */}
            {tutorResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">👤 {tutorResult.nombre}</p>
                    <p className="text-[10px] text-emerald-600">{tutorResult.documento} · {tutorResult.telefono}</p>
                  </div>
                  <button
                    onClick={() => { setTutorResult(null); onChange({ mascota: '', propietario: '', mascotaId: '' }); }}
                    className="text-emerald-400 hover:text-emerald-600 text-xs"
                  >✕</button>
                </div>

                {tutorResult.mascotas.length > 0 ? (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1.5 font-medium">Selecciona la mascota:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorResult.mascotas.map(m => (
                        <button
                          key={m.id}
                          onClick={() => seleccionarMascota(m, tutorResult)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            form.mascotaId === m.id
                              ? `${btnColor} text-white border-transparent`
                              : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          🐾 {m.nombre}{m.raza ? ` (${m.raza})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Este tutor no tiene mascotas registradas.</p>
                )}

                {!showMiniForm && (
                  <button
                    onClick={() => setShowMiniForm(true)}
                    className="text-xs text-emerald-600 font-medium hover:text-emerald-800 flex items-center gap-1"
                  >
                    + Agregar nueva mascota a este tutor
                  </button>
                )}

                {/* Mini formulario nueva mascota */}
                {showMiniForm && (
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2 mt-1">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Nueva mascota</p>
                    <input
                      value={miniNombre}
                      onChange={e => setMiniNombre(e.target.value)}
                      placeholder="Nombre de la mascota *"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {ESPECIES_MINI.map(({ k, e }) => (
                        <button key={k} onClick={() => setMiniEspecie(k)}
                          className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                            miniEspecie === k ? `${btnColor} text-white border-transparent` : 'border-gray-200 text-gray-600'
                          }`}>{e} {k}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {[{v:'M', l:'♂ Macho'},{v:'F', l:'♀ Hembra'}].map(({v,l}) => (
                        <button key={v} onClick={() => setMiniSexo(v)}
                          className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all ${
                            miniSexo === v ? `${btnColor} text-white border-transparent` : 'border-gray-200 text-gray-600'
                          }`}>{l}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowMiniForm(false)} className="flex-1 py-1 text-xs rounded-lg border border-gray-200 text-gray-500">Cancelar</button>
                      <button
                        onClick={crearMascota}
                        disabled={!miniNombre.trim() || savingMini}
                        className={`flex-1 py-1 text-xs rounded-lg text-white font-medium disabled:opacity-40 inline-flex items-center justify-center gap-1 ${btnColor}`}
                      >
                        {savingMini && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tutor no encontrado */}
            {tutorNotFound && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-2">
                <p className="font-medium">⚠ Tutor no encontrado con ese RUT.</p>
                <p className="mt-0.5">Regístralo primero en <strong>Animales</strong>, o ingresa los datos manualmente.</p>
                <button
                  onClick={() => { setTutorNotFound(false); setManualMode(true); }}
                  className="text-amber-600 underline mt-1"
                >Ingresar manualmente</button>
              </div>
            )}

            {/* Badge de selección — solo cuando se seleccionó una mascota real desde búsqueda */}
            {form.mascotaId && (
              <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 text-xs mb-2">
                <span className="text-gray-700">🐾 <strong>{form.mascota}</strong> · Tutor: {form.propietario || '—'}</span>
                <button
                  onClick={() => { onChange({ mascota: '', propietario: '', mascotaId: '' }); setTutorResult(null); }}
                  className="text-gray-400 hover:text-red-500 ml-2"
                >✕</button>
              </div>
            )}

            {/* Ingreso rápido manual — visible siempre que no haya tutor buscado ni mascota seleccionada por búsqueda */}
            {(manualMode || (!tutorResult && !tutorNotFound && !form.mascotaId)) && (
              <div className="space-y-2">
                {manualMode && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Ingreso manual</span>
                    <button
                      onClick={() => { setManualMode(false); onChange({ mascota: '', propietario: '', mascotaId: '' }); }}
                      className="text-[10px] text-gray-400 hover:text-red-500"
                    >Cancelar</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Mascota {manualMode && <span className="text-red-400">*</span>}</label>
                    <input
                      value={form.mascota}
                      onChange={e => onChange({ mascota: e.target.value })}
                      placeholder="Nombre"
                      className={inputCls + ' text-xs py-1.5'}
                      autoFocus={manualMode}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Tutor {manualMode && <span className="text-red-400">*</span>}</label>
                    <input
                      value={form.propietario}
                      onChange={e => onChange({ propietario: e.target.value })}
                      placeholder="Nombre"
                      className={inputCls + ' text-xs py-1.5'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Motivo de consulta</label>
            <div className="grid grid-cols-3 gap-1.5">
              {motivos.map(m => (
                <button
                  key={m.id}
                  onClick={() => onChange({ motivoKey: m.id, motivoCustom: '' })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left leading-tight ${
                    form.motivoKey === m.id
                      ? `${btnColor} text-white border-transparent`
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {esOtro && (
              <textarea
                value={form.motivoCustom}
                onChange={e => onChange({ motivoCustom: e.target.value })}
                placeholder="Describe el motivo de la consulta…"
                rows={2}
                autoFocus
                className="w-full mt-2 text-sm border border-emerald-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            )}
            {form.motivoKey && !esOtro && (
              <p className={`text-xs font-medium mt-1.5 ${doc?.colorText ?? 'text-emerald-700'}`}>✓ {motivoLabel}</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors ${btnColor} hover:opacity-90 inline-flex items-center justify-center gap-2`}
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cita'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Vista mensual ────────────────────────────────────────────────
function VistaMonthly({
  citas, base, hoy, selectedFecha, doctores, onSelectFecha, onNuevaCita,
}: {
  citas: Cita[];
  base: Date;
  hoy: Date;
  selectedFecha: string;
  doctores: Doctor[];
  onSelectFecha: (f: string) => void;
  onNuevaCita: (fecha: string) => void;
}) {
  const hoyKey = dateKey(hoy);
  const grid   = getMonthGrid(base);

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Cabecera días */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DIAS.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Filas de semanas */}
        {grid.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 divide-x divide-gray-50">
            {semana.map((d, di) => {
              if (!d) {
                return <div key={di} className="min-h-[110px] bg-gray-50/60 border-t border-gray-50" />;
              }
              const fk       = dateKey(d);
              const isHoy    = fk === hoyKey;
              const isSel    = fk === selectedFecha;
              const citasDia = citas.filter(c => c.fecha === fk);
              const MAX_VIS  = 3;
              const visibles = citasDia.slice(0, MAX_VIS);
              const resto    = citasDia.length - MAX_VIS;

              return (
                <div
                  key={di}
                  className={`min-h-[110px] p-1.5 border-t border-gray-50 cursor-pointer transition-colors group ${
                    isSel  ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' :
                    isHoy  ? 'bg-emerald-50/50' :
                    'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectFecha(fk)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                      isHoy ? 'bg-emerald-600 text-white' :
                      isSel ? 'bg-emerald-100 text-emerald-700' :
                      'text-gray-700 group-hover:bg-gray-100'
                    }`}>
                      {d.getDate()}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onNuevaCita(fk); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100 transition-all"
                      title={`Nueva cita ${parseFechaLabel(fk)}`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {visibles.map(c => {
                      const doc = doctores.find(x => x.id === c.doctorId);
                      return (
                        <div
                          key={c.id}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded truncate text-white leading-tight ${doc?.color ?? 'bg-gray-400'}`}
                        >
                          {minToHms(c.hora)} {c.mascota}
                        </div>
                      );
                    })}
                    {resto > 0 && (
                      <div className="text-[9px] font-medium text-gray-400 px-1">+{resto} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function AgendaPage() {
  const hoy = new Date();
  const navigate = useNavigate();

  const [vista, setVista]                 = useState<Vista>('semana');
  const [navBase, setNavBase]             = useState(hoy);
  const [citas, setCitas]                 = useState<Cita[]>([]);
  const [doctores, setDoctores]           = useState<Doctor[]>([]);
  const [motivos, setMotivos]             = useState<{ id: string; label: string }[]>(MOTIVOS_DEFAULT);
  const [loadingCitas, setLoadingCitas]   = useState(false);
  const [savingCita, setSavingCita]       = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [citaDetalle, setCitaDetalle]     = useState<Cita | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string>(dateKey(hoy));
  const [form, setForm] = useState<FormCita>({
    fecha: dateKey(hoy), hora: 0, duracion: 30,
    mascota: '', propietario: '', mascotaId: '', motivoKey: '', motivoCustom: '', doctorId: '',
  });

  // ── Cargar doctores y tipos de atención al montar ──
  useEffect(() => {
    apiClient.get('/configuracion/doctores')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setDoctores(buildDoctores(data.filter((d: any) => d.activo)));
        }
      })
      .catch(() => {});
    apiClient.get('/configuracion/tipos-atencion')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setMotivos(data.filter((t: TipoAtencion) => t.activo).map((t: TipoAtencion) => ({ id: t.id, label: t.label })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Cargar citas del rango visible ──
  const cargarCitas = useCallback(async (base: Date, v: Vista) => {
    setLoadingCitas(true);
    try {
      let desde: string, hasta: string;
      if (v === 'semana') {
        const dias = getWeekDates(base);
        desde = dateKey(dias[0]);
        hasta = dateKey(dias[6]);
      } else {
        const y = base.getFullYear(), m = base.getMonth();
        desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        hasta = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
      }
      const { data } = await apiClient.get(`/citas?desde=${desde}&hasta=${hasta}`);
      setCitas(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoadingCitas(false);
    }
  }, []);

  useEffect(() => {
    cargarCitas(navBase, vista);
  }, [navBase, vista, cargarCitas]);

  // ── Cálculos semana ──
  const dias     = useMemo(() => getWeekDates(navBase), [navBase]);
  const horas    = useMemo(() => Array.from({ length: (HORA_FIN - HORA_INICIO) / 60 }, (_, i) => HORA_INICIO / 60 + i), []);
  const todayIdx = dias.findIndex(d => dateKey(d) === dateKey(hoy));
  const pxMin    = SLOT_PX / 60;
  const gridH    = horas.length * SLOT_PX;
  const semLabel = `${dias[0].getDate()} ${MESES_C[dias[0].getMonth()]} – ${dias[6].getDate()} ${MESES_C[dias[6].getMonth()]} ${dias[6].getFullYear()}`;
  const mesLabel = `${MESES[navBase.getMonth()]} ${navBase.getFullYear()}`;

  // ── Disponibilidad hoy (sidebar) ──
  const resumenDisp = useMemo(() => {
    const hoyKey = dateKey(hoy);
    return doctores.map(doc => {
      const total    = (HORA_FIN - HORA_INICIO) / 15;
      const ocupados = Array.from({ length: total }, (_, i) => i * 15)
        .filter(m => isOcupado(citas, doc.id, hoyKey, m, 15)).length;
      return { doc, libres: total - ocupados, total };
    });
  }, [citas, doctores]);

  function prevPeriodo() {
    const d = new Date(navBase);
    if (vista === 'semana') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setNavBase(d);
  }

  function nextPeriodo() {
    const d = new Date(navBase);
    if (vista === 'semana') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setNavBase(d);
  }

  function irHoy() {
    setNavBase(hoy);
    setSelectedFecha(dateKey(hoy));
  }

  // Click en slot de vista semanal: doctor + fecha + hora pre-asignados
  function clickSlotSemana(fecha: string, minutos: number, doctorId: string) {
    setSelectedFecha(fecha);
    setForm({ fecha, hora: minutos, duracion: 30, mascota: '', propietario: '', mascotaId: '', motivoKey: '', motivoCustom: '', doctorId });
    setShowModal(true);
  }

  // Nueva cita desde vista mensual: solo fecha pre-asignada
  function clickNuevaCitaMes(fecha: string) {
    setForm({ fecha, hora: 0, duracion: 30, mascota: '', propietario: '', mascotaId: '', motivoKey: '', motivoCustom: '', doctorId: '' });
    setShowModal(true);
  }

  async function guardarCita() {
    const motivoSelLabel = motivos.find(m => m.id === form.motivoKey)?.label ?? '';
    const esOtro = form.motivoKey === 'otro' || motivoSelLabel.toLowerCase().startsWith('otro');
    const motivo = esOtro
      ? form.motivoCustom.trim()
      : motivoSelLabel;
    if (!form.mascota || !form.propietario || !motivo || !form.doctorId) return;
    setSavingCita(true);
    try {
      const { data } = await apiClient.post('/citas', {
        fecha: form.fecha,
        hora: form.hora,
        duracion: form.duracion,
        mascota: form.mascota,
        propietario: form.propietario,
        mascotaId: form.mascotaId || undefined,
        motivo,
        doctorId: form.doctorId,
      });
      setCitas(p => [...p, data]);
      setShowModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar la cita');
    } finally {
      setSavingCita(false);
    }
  }

  async function eliminarCita(id: string) {
    try {
      await apiClient.delete(`/citas/${id}`);
      setCitas(p => p.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al eliminar');
    }
  }

  const citasDiaSel = citas.filter(c => c.fecha === selectedFecha).sort((a, b) => a.hora - b.hora);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Atención al Paciente</h1>
          <p className="text-sm text-gray-400">
            {vista === 'semana' ? `Semana · ${semLabel}` : `Mes · ${mesLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">

          {/* Toggle semana / mes */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            {(['semana', 'mes'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  vista === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <button onClick={prevPeriodo} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button onClick={irHoy} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Hoy
          </button>
          <button onClick={nextPeriodo} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Vista mensual / semanal ── */}
        {vista === 'mes' ? (
          <VistaMonthly
            citas={citas}
            base={navBase}
            hoy={hoy}
            selectedFecha={selectedFecha}
            doctores={doctores}
            onSelectFecha={setSelectedFecha}
            onNuevaCita={clickNuevaCitaMes}
          />
        ) : (
          /* ── Vista semanal ── */
          <div className="flex-1 overflow-auto bg-gray-50">
            <div style={{ minWidth: 900 }}>

              {/* Cabecera días con sub-columnas de doctores */}
              <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                <div className="w-14 flex-shrink-0 border-r border-gray-100" />
                {dias.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className={`flex-1 min-w-[168px] flex flex-col border-l border-gray-200 ${dIdx === todayIdx ? 'bg-emerald-50' : ''}`}
                  >
                    <div
                      className="text-center py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedFecha(dateKey(d))}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${dIdx === todayIdx ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {DIAS[dIdx]}
                      </p>
                      <p className={`font-bold mt-0.5 ${
                        dIdx === todayIdx
                          ? 'text-sm w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto'
                          : dateKey(d) === selectedFecha
                          ? 'text-base text-emerald-600'
                          : 'text-base text-gray-700'
                      }`}>
                        {d.getDate()}
                      </p>
                    </div>
                    <div className="flex divide-x divide-white/60">
                      {doctores.map((doc) => (
                        <div key={doc.id} className={`flex-1 text-center py-1.5 ${doc.colorLight}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${doc.colorText}`}>
                            Dr. {doc.nombre.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cuadrícula horas */}
              <div className="flex">
                <div className="w-14 flex-shrink-0 border-r border-gray-100">
                  {horas.map(h => (
                    <div key={h} style={{ height: SLOT_PX }} className="relative border-t border-gray-100">
                      <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 font-medium select-none">
                        {String(h).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {dias.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className={`flex flex-1 min-w-[168px] border-l border-gray-200 ${dIdx === todayIdx ? 'bg-emerald-50/20' : ''}`}
                    style={{ height: gridH }}
                  >
                    {doctores.map((doc, docIdx) => {
                      const fk       = dateKey(d);
                      const citasDoc = citas.filter(c => c.fecha === fk && c.doctorId === doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`relative flex-1 ${docIdx > 0 ? 'border-l border-gray-100' : ''}`}
                          style={{ height: gridH }}
                        >
                          {horas.map((_, hi) => (
                            <div key={hi} className="absolute w-full border-t border-gray-100" style={{ top: hi * SLOT_PX }} />
                          ))}
                          {Array.from({ length: (HORA_FIN - HORA_INICIO) / 15 }, (_, si) => si * 15).map(minOff => {
                            const ocupado = isOcupado(citas, doc.id, fk, minOff, 15);
                            return (
                              <div
                                key={minOff}
                                className={`absolute w-full transition-colors ${
                                  ocupado ? 'cursor-default' : `cursor-pointer ${doc.hoverBg}`
                                }`}
                                style={{ top: minOff * pxMin, height: 15 * pxMin }}
                                onClick={() => !ocupado && clickSlotSemana(fk, minOff, doc.id)}
                                title={ocupado ? '' : `${doc.nombre} – ${minToHms(minOff)}`}
                              />
                            );
                          })}
                          {citasDoc.map(cita => {
                            const top    = cita.hora * pxMin;
                            const height = Math.max(cita.duracion * pxMin - 2, 14);
                            return (
                              <div
                                key={cita.id}
                                className={`absolute inset-x-0.5 rounded-md ${doc.color} text-white overflow-hidden shadow-sm group z-10 cursor-pointer`}
                                style={{ top: top + 1, height }}
                                onClick={() => setCitaDetalle(cita)}
                                title={`${cita.mascota} · ${minToHms(cita.hora)}`}
                              >
                                <div className="px-1 pt-0.5 h-full flex flex-col gap-px">
                                  <p className="text-[9px] font-bold leading-tight truncate">{cita.mascota}</p>
                                  {height >= 26 && <p className="text-[8px] opacity-75 truncate">{minToHms(cita.hora)}</p>}
                                  {height >= 44 && <p className="text-[8px] opacity-60 truncate">{cita.motivo}</p>}
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); eliminarCita(cita.id); }}
                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ── Panel lateral ── */}
        <div className="w-56 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">

          {/* Disponibilidad de hoy */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Disponibilidad hoy
            </h3>
            <div className="space-y-1.5">
              {resumenDisp.map(({ doc, libres, total }) => {
                const pct = total > 0 ? libres / total : 0;
                return (
                  <div key={doc.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${doc.color}`} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{doc.nombre}</span>
                    <span className={`text-xs font-semibold ${
                      pct >= 0.7 ? 'text-emerald-600' : pct >= 0.3 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {libres === total ? 'Libre' : libres === 0 ? 'Lleno' : `${libres}/${total}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctores</h3>
            <div className="space-y-1.5">
              {doctores.map(doc => (
                <div key={doc.id} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded flex-shrink-0 ${doc.color}`} />
                  <span className="text-xs text-gray-600">{doc.nombre}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Citas del día seleccionado */}
          <div className="px-4 pt-3 pb-1.5 border-b border-gray-100">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              {parseFechaLabel(selectedFecha)}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{citasDiaSel.length} cita(s)</p>
          </div>

          <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
            {citasDiaSel.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">Sin citas este día</p>
                <button
                  onClick={() => clickNuevaCitaMes(selectedFecha)}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Agregar cita
                </button>
              </div>
            ) : (
              citasDiaSel.map(c => {
                const doc = doctores.find(d => d.id === c.doctorId);
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setCitaDetalle(c)}
                  >
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${doc?.color ?? 'bg-gray-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 truncate">{c.mascota}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {minToHms(c.hora)} · {c.duracion === 60 ? '1h' : `${c.duracion}m`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{c.propietario}</p>
                      <p className={`text-[10px] font-medium truncate ${doc?.colorText ?? ''}`}>{doc?.nombre}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); eliminarCita(c.id); }}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100">
            <div className={`rounded-xl p-3 ${vista === 'mes' ? 'bg-teal-50 border border-teal-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              {vista === 'mes' ? (
                <>
                  <p className="text-xs font-semibold text-teal-800">Vista mensual</p>
                  <p className="text-xs text-teal-600 mt-0.5">Clic en un día para ver citas o usa + para agregar.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-emerald-800">Haz clic en la columna</p>
                  <p className="text-xs text-emerald-600 mt-0.5">del doctor en un slot libre para agendar.</p>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal nueva cita */}
      {showModal && (
        <ModalNuevaCita
          form={form}
          citas={citas}
          doctores={doctores}
          motivos={motivos}
          onClose={() => setShowModal(false)}
          onChange={p => setForm(f => ({ ...f, ...p }))}
          onSave={guardarCita}
          saving={savingCita}
        />
      )}

      {/* Modal detalle de cita */}
      {citaDetalle && (
        <ModalDetalleCita
          cita={citaDetalle}
          doctores={doctores}
          onClose={() => setCitaDetalle(null)}
          onEliminar={id => { eliminarCita(id); setCitaDetalle(null); }}
          onCobrar={(cita) => {
            setCitaDetalle(null);
            navigate('/ventas', { state: { motivo: cita.motivo, mascota: cita.mascota, propietario: cita.propietario } });
          }}
        />
      )}
    </div>
  );
}
