import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/lib/api';

// â”€â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SLUG        = 'demo';
const HORA_INICIO = 9 * 60;
const HORA_FIN    = 21 * 60;
const DIAS_ES     = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];
const MESES_ES    = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const PALETTE = [
  { color: 'bg-emerald-500', colorLight: 'bg-emerald-50', colorText: 'text-emerald-700', border: 'border-emerald-300' },
  { color: 'bg-teal-500',    colorLight: 'bg-teal-50',    colorText: 'text-teal-700',    border: 'border-teal-300'    },
  { color: 'bg-cyan-600',    colorLight: 'bg-cyan-50',    colorText: 'text-cyan-700',    border: 'border-cyan-300'    },
  { color: 'bg-blue-500',    colorLight: 'bg-blue-50',    colorText: 'text-blue-700',    border: 'border-blue-300'    },
  { color: 'bg-violet-500',  colorLight: 'bg-violet-50',  colorText: 'text-violet-700',  border: 'border-violet-300'  },
];

type Duracion = 30 | 60;
interface Doctor { id: string; nombre: string; color: string; colorLight: string; colorText: string; border: string; }
interface Motivo  { id: string; label: string; }
interface CitaOcupada { doctorId: string; fecha: string; hora: number; duracion: number; }
interface ClinicaInfo { nombre: string; logoUrl?: string | null; telefonos?: string | null; }

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getWeekDates(base: Date): Date[] {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}
function offsetToHora(offset: number) {
  const t = HORA_INICIO + offset;
  return `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;
}
function isOcupado(ocupadas: CitaOcupada[], docId: string, fecha: string, hora: number, dur: number) {
  return ocupadas.some(c => c.doctorId === docId && c.fecha === fecha && hora < c.hora + c.duracion && hora + dur > c.hora);
}
const HORAS = Array.from({ length: (HORA_FIN - HORA_INICIO) / 60 }, (_, i) => i * 60);

// â”€â”€â”€ Modal de reserva (formulario + confirmaciÃ³n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalReserva({
  doctor, fecha, hora, motivos, ocupadas, clinicaTel,
  onClose, onSuccess,
}: {
  doctor: Doctor; fecha: string; hora: number;
  motivos: Motivo[]; ocupadas: CitaOcupada[];
  clinicaTel?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [duracion,  setDuracion]  = useState<Duracion>(30);
  const [mascota,   setMascota]   = useState('');
  const [propiet,   setPropiet]   = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [motivoId,  setMotivoId]  = useState('');
  const [custom,    setCustom]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const diaD    = new Date(fecha + 'T12:00:00');
  const diaLbl  = `${DIAS_ES[diaD.getDay()]} ${diaD.getDate()} de ${MESES_ES[diaD.getMonth()]}`;
  const esOtro  = motivos.find(m => m.id === motivoId)?.label.toLowerCase().startsWith('otro') ?? false;
  const durOk   = (d: Duracion) => !isOcupado(ocupadas, doctor.id, fecha, hora, d);
  const canSave = !!mascota.trim() && !!propiet.trim() && !!motivoId && (esOtro ? !!custom.trim() : true);
  const waNum   = clinicaTel ? clinicaTel.replace(/\D/g, '') : '';
  const waLink  = waNum ? `https://wa.me/${waNum}` : null;

  async function confirmar() {
    if (!canSave) return;
    setSaving(true); setError('');
    const motivo = esOtro ? custom.trim() : (motivos.find(m => m.id === motivoId)?.label ?? '');
    try {
      await apiClient.post(`/reserva?slug=${SLUG}`, {
        fecha, hora, duracion,
        nombreMascota:       mascota.trim(),
        nombrePropietario:   propiet.trim(),
        telefonoPropietario: telefono.trim() || undefined,
        motivo, doctorId: doctor.id,
      });
      setConfirmado(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al registrar. Intenta de nuevo.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${doctor.colorLight} border-b ${doctor.border} flex-shrink-0`}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-3 h-3 rounded-full ${doctor.color}`} />
              <span className={`font-bold text-base ${doctor.colorText}`}>{doctor.nombre}</span>
            </div>
            <p className="text-xs text-gray-500">{diaLbl} Â· {offsetToHora(hora)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {confirmado ? (
          /* â”€â”€ ConfirmaciÃ³n â”€â”€ */
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Â¡Hora reservada!</h3>
              <p className="text-sm text-gray-500 mt-1">{diaLbl} a las {offsetToHora(hora)} â€” {duracion} min</p>
              <p className="text-sm text-gray-700 mt-0.5 font-medium">con {doctor.nombre}</p>
              <p className="text-sm text-gray-500 mt-0.5">{mascota} Â· {propiet}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-1.5">
              <p className="text-xs font-semibold text-amber-800">Â¿Necesitas cancelar o modificar?</p>
              <p className="text-xs text-amber-700">
                Las horas solo pueden cancelarse contactando directamente a la clÃ­nica.
                La hora permanecerÃ¡ tomada hasta que el equipo la libere.
              </p>
              {waLink
                ? <a href={waLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.502 3.934 1.385 5.61L0 24l6.615-1.733A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.863 0-3.608-.488-5.117-1.344l-.367-.214-3.795.995.995-3.68-.235-.38A9.964 9.964 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    Contactar por WhatsApp
                  </a>
                : clinicaTel && <p className="text-xs text-amber-700 font-medium mt-1">ðŸ“ž {clinicaTel}</p>
              }
            </div>
            <button onClick={onClose}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white ${doctor.color} hover:opacity-90 transition-opacity`}>
              Cerrar
            </button>
          </div>
        ) : (
          /* â”€â”€ Formulario â”€â”€ */
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* DuraciÃ³n */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">DuraciÃ³n de la consulta</label>
              <div className="flex gap-2">
                {([30, 60] as Duracion[]).map(d => (
                  <button key={d} onClick={() => setDuracion(d)} disabled={!durOk(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      duracion === d ? `${doctor.color} text-white border-transparent shadow-sm` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {d === 60 ? '1 hora' : `${d} min`}
                  </button>
                ))}
              </div>
            </div>
            {/* Motivo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Motivo de consulta</label>
              <div className="grid grid-cols-2 gap-1.5">
                {motivos.map(m => (
                  <button key={m.id} onClick={() => setMotivoId(m.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium text-left border transition-all ${
                      motivoId === m.id
                        ? `${doctor.colorLight} ${doctor.colorText} border-current font-semibold`
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {esOtro && (
                <input type="text" value={custom} onChange={e => setCustom(e.target.value)}
                  placeholder="Describe el motivo..."
                  className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              )}
            </div>
            {/* Mascota */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre de la mascota <span className="text-red-400">*</span></label>
              <input type="text" value={mascota} onChange={e => setMascota(e.target.value)}
                placeholder="Ej: Max, Luna, Pelusaâ€¦"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {/* Propietario */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre del tutor / propietario <span className="text-red-400">*</span></label>
              <input type="text" value={propiet} onChange={e => setPropiet(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {/* TelÃ©fono */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">TelÃ©fono de contacto <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={confirmar} disabled={saving || !canSave}
              className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 ${doctor.color} hover:opacity-90`}>
              {saving ? 'Reservandoâ€¦' : 'Confirmar reserva'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ReservaPublicaPage() {
  const navigate  = useNavigate();
  const hoy       = new Date();
  const hoyStr    = dateKey(hoy);
  const hoyMed    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const [navBase,   setNavBase]   = useState(hoy);
  const [doctores,  setDoctores]  = useState<Doctor[]>([]);
  const [motivos,   setMotivos]   = useState<Motivo[]>([]);
  const [ocupadas,  setOcupadas]  = useState<CitaOcupada[]>([]);
  const [clinica,   setClinica]   = useState<ClinicaInfo>({ nombre: 'Veterinaria' });
  const [loading,   setLoading]   = useState(true);
  const [modalSlot, setModalSlot] = useState<{ doc: Doctor; fecha: string; hora: number } | null>(null);
  const [booked,    setBooked]    = useState(0);

  const dias = getWeekDates(navBase);
  const N    = doctores.length;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get(`/reserva/doctores?slug=${SLUG}`),
      apiClient.get(`/reserva/motivos?slug=${SLUG}`),
      apiClient.get(`/reserva/clinica?slug=${SLUG}`),
    ]).then(([dRes, mRes, cRes]) => {
      setDoctores((dRes.data as { id: string; nombre: string }[]).map((r, i) => ({
        ...r, ...PALETTE[i % PALETTE.length],
      })));
      setMotivos(mRes.data);
      if (cRes.data) setClinica(cRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (dias.length === 0) return;
    const desde = dateKey(dias[0]);
    const hasta  = dateKey(dias[6]);
    apiClient.get(`/reserva/disponibilidad?slug=${SLUG}&desde=${desde}&hasta=${hasta}`)
      .then(r => setOcupadas(r.data))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navBase, booked]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-emerald-700">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-green-200">Cargando calendarioâ€¦</p>
      </div>
    </div>
  );

  const waNum  = clinica.telefonos ? clinica.telefonos.replace(/\D/g, '') : '';
  const waLink = waNum ? `https://wa.me/${waNum}` : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* â”€â”€ Header â”€â”€ */}
      <header className="bg-green-900 text-white px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {clinica.logoUrl
              ? <img src={clinica.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover bg-white/10 flex-shrink-0" />
              : (
                <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-900" fill="currentColor" viewBox="0 0 24 24">
                    <ellipse cx="5.5" cy="6.5" rx="2" ry="2.5"/><ellipse cx="10" cy="4.5" rx="2" ry="2.5"/>
                    <ellipse cx="14" cy="4.5" rx="2" ry="2.5"/><ellipse cx="18.5" cy="6.5" rx="2" ry="2.5"/>
                    <path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z"/>
                  </svg>
                </div>
              )
            }
            <div>
              <p className="font-bold text-base leading-tight">{clinica.nombre}</p>
              <p className="text-xs text-green-300 leading-tight">Reserva de hora en lÃ­nea</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {clinica.telefonos && <span className="text-xs text-green-300 hidden md:block">{clinica.telefonos}</span>}
            <button onClick={() => navigate('/login')}
              className="text-green-200 hover:text-white text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              <span className="hidden sm:inline">Personal / Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* â”€â”€ Sub-barra: navegaciÃ³n semana + leyenda doctores â”€â”€ */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setNavBase(b => { const d = new Date(b); d.setDate(d.getDate() - 7); return d; })}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[170px] text-center">
              {dias[0].getDate()} {MESES_ES[dias[0].getMonth()]} â€“ {dias[6].getDate()} {MESES_ES[dias[6].getMonth()]} {dias[6].getFullYear()}
            </span>
            <button onClick={() => setNavBase(b => { const d = new Date(b); d.setDate(d.getDate() + 7); return d; })}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => setNavBase(new Date())}
              className="text-xs text-emerald-600 font-medium border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
              Hoy
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {doctores.map(doc => (
              <div key={doc.id} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${doc.color}`} />
                {doc.nombre}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />Ocupado
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Grid del calendario â”€â”€ */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-auto">
          {N === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">No hay doctores disponibles</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${N * 7}, minmax(38px, 1fr))` }}>

              {/* â”€â”€ Encabezado â”€â”€ */}
              <div className="bg-gray-50 border-b border-r border-gray-200 py-3" />
              {dias.map((d, di) => {
                const isHoy  = dateKey(d) === hoyStr;
                const pasado = d < hoyMed;
                return doctores.map((doc, doci) => (
                  <div key={`hdr-${di}-${doci}`}
                    className={`border-b border-r border-gray-100 py-2 px-0.5 text-center ${
                      doci === 0 ? 'border-l border-gray-200' : ''
                    } ${isHoy ? 'bg-emerald-50' : pasado ? 'bg-gray-50/60' : 'bg-white'}`}>
                    {doci === Math.floor(N / 2)
                      ? <div className={`text-xs font-bold mb-0.5 ${isHoy ? 'text-emerald-700' : pasado ? 'text-gray-300' : 'text-gray-700'}`}>
                          {DIAS_ES[d.getDay()]} {d.getDate()}
                        </div>
                      : <div className="h-[18px]" />
                    }
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${doc.color} ${pasado ? 'opacity-30' : ''}`} />
                      <span className={`text-[9px] font-medium ${doc.colorText} ${pasado ? 'opacity-30' : ''}`}>
                        {doc.nombre.split(' ')[0].slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ));
              })}

              {/* â”€â”€ Filas de horas â”€â”€ */}
              {HORAS.map(hora => (
                <Fragment key={hora}>
                  <div className="border-b border-r border-gray-100 bg-gray-50 flex items-center justify-end pr-2 py-1.5">
                    <span className="text-[10px] text-gray-400 font-mono">{offsetToHora(hora)}</span>
                  </div>
                  {dias.flatMap((d, di) => {
                    const fecha  = dateKey(d);
                    const pasado = new Date(`${fecha}T${offsetToHora(hora)}:00`) < new Date();
                    return doctores.map((doc, doci) => {
                      const ocup = isOcupado(ocupadas, doc.id, fecha, hora, 30);
                      return (
                        <button
                          key={`${di}-${doci}-${hora}`}
                          disabled={pasado || ocup}
                          onClick={() => setModalSlot({ doc, fecha, hora })}
                          title={pasado ? 'Hora pasada' : ocup ? `Ocupado â€” ${doc.nombre}` : `Reservar con ${doc.nombre}`}
                          className={[
                            'border-b border-r border-gray-100 h-10 transition-all text-[10px] font-medium',
                            doci === 0 ? 'border-l border-gray-200' : '',
                            pasado ? 'bg-gray-50 cursor-not-allowed' :
                            ocup   ? `${doc.colorLight} text-red-400 cursor-not-allowed` :
                                     `${doc.colorLight} ${doc.colorText} hover:opacity-60 cursor-pointer`,
                          ].join(' ')}
                        >
                          {ocup && <span className="opacity-50">Ã—</span>}
                        </button>
                      );
                    });
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Nota cancelaciÃ³n */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-amber-800">
            <strong>Â¿Necesitas cancelar o cambiar tu hora?</strong>
            {' '}Las reservas solo pueden cancelarse contactando directamente a la clÃ­nica.
            {clinica.telefonos && <span className="ml-1">Tel: <strong>{clinica.telefonos}</strong>.</span>}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-green-700 font-semibold hover:text-green-800 underline">
                Contactar por WhatsApp â†’
              </a>
            )}
            {' '}La hora permanece tomada hasta que el equipo la cancele.
          </p>
        </div>
      </div>

      {/* Modal */}
      {modalSlot && (
        <ModalReserva
          doctor={modalSlot.doc}
          fecha={modalSlot.fecha}
          hora={modalSlot.hora}
          motivos={motivos}
          ocupadas={ocupadas}
          clinicaTel={clinica.telefonos ?? undefined}
          onClose={() => setModalSlot(null)}
          onSuccess={() => setBooked(b => b + 1)}
        />
      )}
    </div>
  );
}
