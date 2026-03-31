import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';

// ─── Tipos ────────────────────────────────────────────────────────
interface Doctor {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  color: string;
}

interface TipoAtencion {
  id: string;
  label: string;
  activo: boolean;
  orden: number;
}

const COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500', teal: 'bg-teal-500', cyan: 'bg-cyan-600',
  blue: 'bg-blue-500', violet: 'bg-violet-500', rose: 'bg-rose-500',
  amber: 'bg-amber-500', orange: 'bg-orange-500',
};

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400';

// ─── Sección Doctores ─────────────────────────────────────────────
function SeccionDoctores() {
  const [doctores, setDoctores]       = useState<Doctor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editDoc, setEditDoc]         = useState<Doctor | null>(null);
  const [saving, setSaving]           = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', password: '' });

  useEffect(() => {
    apiClient.get('/configuracion/doctores')
      .then(r => setDoctores(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function abrirNuevo() {
    setEditDoc(null);
    setForm({ nombre: '', email: '', telefono: '', password: '' });
    setShowForm(true);
  }

  function abrirEditar(d: Doctor) {
    setEditDoc(d);
    setForm({ nombre: d.nombre, email: d.email, telefono: d.telefono ?? '', password: '' });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editDoc) {
        const payload: any = { nombre: form.nombre, email: form.email, telefono: form.telefono || null };
        if (form.password.trim()) payload.password = form.password;
        const { data } = await apiClient.put(`/configuracion/doctores/${editDoc.id}`, payload);
        setDoctores(p => p.map(d => d.id === editDoc.id ? data : d));
      } else {
        if (!form.password.trim()) { alert('Ingresa una contraseña para el nuevo doctor'); return; }
        const { data } = await apiClient.post('/configuracion/doctores', { ...form, telefono: form.telefono || null });
        setDoctores(p => [...p, data]);
      }
      setShowForm(false);
      setEditDoc(null);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(id: string) {
    if (!confirm('¿Desactivar este doctor? Dejará de aparecer en la agenda pero se conservará el registro.')) return;
    try {
      await apiClient.delete(`/configuracion/doctores/${id}`);
      setDoctores(p => p.map(d => d.id === id ? { ...d, activo: false } : d));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  async function reactivar(id: string) {
    try {
      const { data } = await apiClient.put(`/configuracion/doctores/${id}`, { activo: true });
      setDoctores(p => p.map(d => d.id === id ? data : d));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  async function eliminarDoctor(id: string) {
    if (!confirm('¿Eliminar este registro definitivamente? Esta acción no se puede deshacer.')) return;
    try {
      await apiClient.delete(`/configuracion/doctores/${id}/eliminar`);
      setDoctores(p => p.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-800">Personal Médico / Doctores</h2>
          <p className="text-xs text-gray-400 mt-0.5">Gestiona los veterinarios disponibles en la agenda</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo doctor
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            {editDoc ? 'Editar doctor' : 'Registrar nuevo doctor'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre completo <span className="text-red-400">*</span></label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Dr. Juan Pérez" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono de contacto</label>
              <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+56 9 1234 5678" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email <span className="text-red-400">*</span></label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="doctor@clinica.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Contraseña {editDoc ? '(dejar vacío = no cambiar)' : <span className="text-red-400">*</span>}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={editDoc ? '••••••••' : 'Mínimo 8 caracteres'} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setEditDoc(null); }} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600">Cancelar</button>
            <button
              onClick={guardar}
              disabled={!form.nombre.trim() || !form.email.trim() || saving}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-40 inline-flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Guardando…' : (editDoc ? 'Actualizar' : 'Registrar')}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : doctores.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">Sin doctores registrados</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {doctores.map(d => (
            <div key={d.id} className={`flex items-center justify-between px-6 py-4 ${!d.activo ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${COLORS[d.color] ?? 'bg-emerald-500'}`}>
                  {d.nombre.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{d.nombre}</p>
                    {!d.activo && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-400">{d.email}</p>
                  {d.telefono && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    {d.telefono}
                  </p>}
                </div>
              </div>
              <div className="flex gap-2">
                {d.activo ? (
                  <>
                    <button onClick={() => abrirEditar(d)} className="text-xs border border-gray-200 text-gray-500 hover:text-emerald-700 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-all">Editar</button>
                    <button onClick={() => desactivar(d.id)} className="text-xs border border-amber-200 text-amber-500 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all">Desactivar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => reactivar(d.id)} className="text-xs border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all">Reactivar</button>
                    <button onClick={() => eliminarDoctor(d.id)} className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">Eliminar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sección Tipos de Atención ────────────────────────────────────
function SeccionTiposAtencion() {
  const [tipos, setTipos]       = useState<TipoAtencion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    apiClient.get('/configuracion/tipos-atencion')
      .then(r => setTipos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function agregar() {
    if (!nuevoLabel.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiClient.post('/configuracion/tipos-atencion', { label: nuevoLabel.trim() });
      setTipos(p => [...p, data]);
      setNuevoLabel('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function actualizar(id: string) {
    if (!editLabel.trim()) return;
    try {
      const { data } = await apiClient.put(`/configuracion/tipos-atencion/${id}`, { label: editLabel.trim() });
      setTipos(p => p.map(t => t.id === id ? data : t));
      setEditId(null);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  async function toggleActivo(t: TipoAtencion) {
    try {
      const { data } = await apiClient.put(`/configuracion/tipos-atencion/${t.id}`, { activo: !t.activo });
      setTipos(p => p.map(x => x.id === t.id ? data : x));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este tipo de atención?')) return;
    try {
      await apiClient.delete(`/configuracion/tipos-atencion/${id}`);
      setTipos(p => p.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  async function seedDefaults() {
    try {
      await apiClient.post('/configuracion/tipos-atencion/seed-defaults');
      const { data } = await apiClient.get('/configuracion/tipos-atencion');
      setTipos(data);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-800">Tipos de Atención / Motivos de Cita</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define los motivos disponibles al agendar una cita</p>
        </div>
        {tipos.filter(t => !t.id.startsWith('default')).length === 0 && (
          <button
            onClick={seedDefaults}
            className="text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 font-medium"
          >
            Cargar defaults
          </button>
        )}
      </div>

      {/* Agregar nuevo */}
      <div className="px-6 py-4 border-b border-gray-50 flex gap-2">
        <input
          value={nuevoLabel}
          onChange={e => setNuevoLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Ej: Castración, Vacuna rabia, Pelaje…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          onClick={agregar}
          disabled={!nuevoLabel.trim() || saving}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40"
        >
          + Agregar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : tipos.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-gray-400">Sin tipos de atención. Agrega uno arriba o carga los defaults.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {tipos.map((t, i) => (
            <div key={t.id} className={`flex items-center gap-3 px-6 py-3 ${!t.activo ? 'opacity-40' : ''}`}>
              <span className="text-xs text-gray-300 w-5 text-right">{i + 1}</span>
              {editId === t.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && actualizar(t.id)}
                    className="flex-1 text-sm border border-emerald-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    autoFocus
                  />
                  <button onClick={() => actualizar(t.id)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg font-medium">Guardar</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg">Cancelar</button>
                </div>
              ) : (
                <>
                  <p className={`flex-1 text-sm ${t.activo ? 'text-gray-700' : 'line-through text-gray-400'}`}>{t.label}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditId(t.id); setEditLabel(t.label); }}
                      className="text-[11px] border border-gray-200 text-gray-500 hover:text-emerald-700 hover:border-emerald-300 px-2.5 py-1 rounded-lg transition-all"
                    >Editar</button>
                    <button
                      onClick={() => toggleActivo(t)}
                      className={`text-[11px] border px-2.5 py-1 rounded-lg transition-all ${
                        t.activo
                          ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >{t.activo ? 'Ocultar' : 'Activar'}</button>
                    {!t.id.startsWith('default') && (
                      <button
                        onClick={() => eliminar(t.id)}
                        className="text-[11px] border border-red-200 text-red-400 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all"
                      >Eliminar</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function ConfiguracionPage() {
  const [tab, setTab] = useState<'doctores' | 'tipos'>('doctores');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Configuración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Personal médico y parámetros de la clínica</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'doctores', label: 'Personal / Doctores' },
          { key: 'tipos',    label: 'Tipos de Atención' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'doctores' && <SeccionDoctores />}
      {tab === 'tipos'    && <SeccionTiposAtencion />}
    </div>
  );
}
