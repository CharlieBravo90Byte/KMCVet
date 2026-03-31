import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Tipos ────────────────────────────────────────────────────────
interface Consulta {
  id: string;
  mascotaId: string;
  citaId: string | null;
  veterinario: string | null;
  pesoKg: number | null;
  temperatura: number | null;
  diagnostico: string;
  tratamiento: string | null;
  notas: string | null;
  archivos: { id: string; nombre: string; url: string; mimetype: string; createdAt: string }[];
  createdAt: string;
}

interface Doctor { id: string; nombre: string; }

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Form de nueva/editar consulta ───────────────────────────────
function FormConsulta({
  mascotaId, doctores, initial, onSaved, onCancel,
}: {
  mascotaId: string;
  doctores: Doctor[];
  initial?: Consulta;
  onSaved: (c: Consulta) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    diagnostico:   initial?.diagnostico    ?? '',
    tratamiento:   initial?.tratamiento    ?? '',
    notas:         initial?.notas          ?? '',
    pesoKg:        initial?.pesoKg?.toString()     ?? '',
    temperatura:   initial?.temperatura?.toString() ?? '',
    veterinarioId: '',
    fecha:         initial ? initial.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400';

  async function submit() {
    if (!form.diagnostico.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        const { data } = await apiClient.put(`/consultas/${initial.id}`, form);
        onSaved(data);
      } else {
        const { data } = await apiClient.post('/consultas', { ...form, mascotaId });
        onSaved(data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
        {initial ? 'Editar consulta' : 'Nueva consulta'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
          <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Veterinario</label>
          <select value={form.veterinarioId} onChange={e => setForm(p => ({ ...p, veterinarioId: e.target.value }))} className={inp}>
            <option value="">Sin asignar</option>
            {doctores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Peso (kg)</label>
          <input type="number" step="0.1" value={form.pesoKg} onChange={e => setForm(p => ({ ...p, pesoKg: e.target.value }))} placeholder="Ej: 15.2" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Temperatura (°C)</label>
          <input type="number" step="0.1" value={form.temperatura} onChange={e => setForm(p => ({ ...p, temperatura: e.target.value }))} placeholder="Ej: 38.5" className={inp} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Diagnóstico <span className="text-red-400">*</span></label>
        <textarea value={form.diagnostico} onChange={e => setForm(p => ({ ...p, diagnostico: e.target.value }))}
          rows={2} placeholder="Describe el diagnóstico principal…" className={inp + ' resize-none'} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tratamiento / Procedimiento aplicado</label>
        <textarea value={form.tratamiento} onChange={e => setForm(p => ({ ...p, tratamiento: e.target.value }))}
          rows={2} placeholder="Medicamentos, dosis, procedimientos realizados…" className={inp + ' resize-none'} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notas adicionales</label>
        <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
          rows={1} placeholder="Observaciones, recomendaciones…" className={inp + ' resize-none'} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button
          onClick={submit}
          disabled={!form.diagnostico.trim() || saving}
          className="flex-1 py-2 text-sm rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-40 hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
        >
          {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Guardando…' : (initial ? 'Actualizar' : 'Registrar consulta')}
        </button>
      </div>
    </div>
  );
}

// ─── Tarjeta de una consulta ──────────────────────────────────────
function TarjetaConsulta({
  consulta, onEdit, onDelete, onUpload, onDeleteArchivo,
}: {
  consulta: Consulta;
  onEdit: () => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
  onDeleteArchivo: (archivoId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-700">{formatFecha(consulta.createdAt)}</p>
          {consulta.veterinario && (
            <p className="text-[10px] text-gray-400">Dr. {consulta.veterinario}</p>
          )}
        </div>
        <div className="flex gap-1">
          {/* Vitales */}
          {(consulta.pesoKg || consulta.temperatura) && (
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
              {consulta.pesoKg ? `${consulta.pesoKg} kg` : ''}{consulta.pesoKg && consulta.temperatura ? ' · ' : ''}{consulta.temperatura ? `${consulta.temperatura}°C` : ''}
            </span>
          )}
          <button onClick={onEdit} className="p-1 text-gray-300 hover:text-emerald-600 transition-colors" title="Editar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Diagnóstico */}
      <div>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Diagnóstico</p>
        <p className="text-sm text-gray-700">{consulta.diagnostico}</p>
      </div>

      {/* Tratamiento */}
      {consulta.tratamiento && (
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Tratamiento / Procedimiento</p>
          <p className="text-sm text-gray-600">{consulta.tratamiento}</p>
        </div>
      )}

      {/* Notas */}
      {consulta.notas && (
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 italic">{consulta.notas}</p>
        </div>
      )}

      {/* Archivos */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Documentos adjuntos</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] text-emerald-600 font-medium hover:text-emerald-800 flex items-center gap-0.5"
          >
            + Adjuntar PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
          />
        </div>
        {consulta.archivos.length === 0 ? (
          <p className="text-xs text-gray-300 italic">Sin documentos adjuntos</p>
        ) : (
          <div className="space-y-1">
            {consulta.archivos.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium truncate flex-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                  {a.nombre}
                </a>
                <button
                  onClick={() => onDeleteArchivo(a.id)}
                  className="ml-2 text-gray-300 hover:text-red-500 flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Ficha del Animal ───────────────────────────────────────
export function ModalFichaAnimal({
  animal,
  onClose,
}: {
  animal: any;
  onClose: () => void;
}) {
  const [consultas, setConsultas]       = useState<Consulta[]>([]);
  const [doctores, setDoctores]         = useState<Doctor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editConsulta, setEditConsulta] = useState<Consulta | null>(null);

  const esp = animal.especie ?? '';
  const EMOJIS: Record<string, string> = {
    DOG: '🐕', CAT: '🐈', BIRD: '🦜', RABBIT: '🐰', REPTIL: '🦎', REPTILE: '🦎', OTHER: '🐾',
  };
  const emoji = EMOJIS[esp] ?? '🐾';

  useEffect(() => {
    Promise.all([
      apiClient.get(`/consultas?mascotaId=${animal.id}`),
      apiClient.get('/configuracion/doctores'),
    ]).then(([c, d]) => {
      setConsultas(c.data);
      setDoctores(d.data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [animal.id]);

  function handleSaved(c: Consulta) {
    if (editConsulta) {
      setConsultas(p => p.map(x => x.id === c.id ? c : x));
      setEditConsulta(null);
    } else {
      setConsultas(p => [c, ...p]);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta consulta?')) return;
    try {
      await apiClient.delete(`/consultas/${id}`);
      setConsultas(p => p.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al eliminar');
    }
  }

  async function handleUpload(consultaId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await apiClient.post(`/consultas/${consultaId}/archivos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setConsultas(p => p.map(c =>
        c.id === consultaId ? { ...c, archivos: [...c.archivos, data] } : c,
      ));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al subir archivo');
    }
  }

  async function handleDeleteArchivo(consultaId: string, archivoId: string) {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await apiClient.delete(`/consultas/archivos/${archivoId}`);
      setConsultas(p => p.map(c =>
        c.id === consultaId ? { ...c, archivos: c.archivos.filter(a => a.id !== archivoId) } : c,
      ));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al eliminar archivo');
    }
  }

  const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function calcEdad(fecha: string) {
    if (!fecha) return '—';
    const diff = Date.now() - new Date(fecha).getTime();
    const meses = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    if (meses < 1)  return '< 1 mes';
    if (meses < 12) return `${meses} mes${meses > 1 ? 'es' : ''}`;
    const a = Math.floor(meses / 12);
    return `${a} año${a > 1 ? 's' : ''}`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-emerald-200 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
              {animal.foto
                ? <img src={animal.foto} alt={animal.nombre} className="w-full h-full object-cover" />
                : <span className="text-3xl">{emoji}</span>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-800">{animal.nombre}</h2>
              <p className="text-xs text-gray-500">
                {animal.raza || esp} · {calcEdad(animal.fechaNacimiento)}
                {animal.sexo === 'M' || animal.sexo === 'MALE' ? ' · ♂' : animal.sexo === 'F' || animal.sexo === 'FEMALE' ? ' · ♀' : ''}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">👤 {animal.tutor?.nombre ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Datos principales */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            {animal.microchip && <span>🔖 Microchip: <strong className="text-gray-700">{animal.microchip}</strong></span>}
            {animal.color     && <span>🎨 Color: <strong className="text-gray-700">{animal.color}</strong></span>}
            {animal.peso      && <span>⚖️ Último peso: <strong className="text-gray-700">{animal.peso} kg</strong></span>}
            {animal.tutor?.telefono && <span>📞 <strong className="text-gray-700">{animal.tutor.telefono}</strong></span>}
            {animal.alergias  && <span>⚠️ Alergias: <strong className="text-red-600">{animal.alergias}</strong></span>}
            {animal.condiciones && <span>📋 Condiciones: <strong className="text-gray-700">{animal.condiciones}</strong></span>}
          </div>
        </div>

        {/* Historial */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Título + botón */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Historial Clínico</h3>
              <p className="text-xs text-gray-400 mt-0.5">{consultas.length} atención(es) registrada(s)</p>
            </div>
            {!showForm && !editConsulta && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Nueva consulta
              </button>
            )}
          </div>

          {/* Formulario nueva consulta */}
          {(showForm && !editConsulta) && (
            <FormConsulta
              mascotaId={animal.id}
              doctores={doctores}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Formulario editar consulta */}
          {editConsulta && (
            <FormConsulta
              mascotaId={animal.id}
              doctores={doctores}
              initial={editConsulta}
              onSaved={handleSaved}
              onCancel={() => setEditConsulta(null)}
            />
          )}

          {/* Lista de consultas */}
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : consultas.length === 0 && !showForm ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
              <span className="text-4xl">📋</span>
              <p className="text-sm font-semibold text-gray-500 mt-2">Sin historial clínico</p>
              <p className="text-xs text-gray-400 mt-1">Registra la primera consulta usando el botón superior</p>
            </div>
          ) : (
            consultas.filter(c => !editConsulta || c.id !== editConsulta.id).map(c => (
              <TarjetaConsulta
                key={c.id}
                consulta={c}
                onEdit={() => { setEditConsulta(c); setShowForm(false); }}
                onDelete={() => handleDelete(c.id)}
                onUpload={file => handleUpload(c.id, file)}
                onDeleteArchivo={archivoId => handleDeleteArchivo(c.id, archivoId)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-full py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cerrar ficha
          </button>
        </div>
      </div>
    </div>
  );
}
