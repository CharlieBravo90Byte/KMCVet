import { useState, useEffect, useRef } from 'react';
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
  precio?: number | null;
  activo: boolean;
  orden: number;
}

interface ClinicaConfig {
  nombre: string;
  logoUrl?: string | null;
  emailClinica?: string | null;
  telefonos?: string | null;
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
  const [tipos, setTipos]         = useState<TipoAtencion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPrecio, setEditPrecio] = useState('');

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
      const precio = nuevoPrecio !== '' ? parseFloat(nuevoPrecio) : undefined;
      const { data } = await apiClient.post('/configuracion/tipos-atencion', {
        label: nuevoLabel.trim(),
        ...(precio !== undefined ? { precio } : {}),
      });
      setTipos(p => [...p, data]);
      setNuevoLabel('');
      setNuevoPrecio('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function actualizar(id: string) {
    if (!editLabel.trim()) return;
    try {
      const precio = editPrecio !== '' ? parseFloat(editPrecio) : null;
      const { data } = await apiClient.put(`/configuracion/tipos-atencion/${id}`, {
        label: editLabel.trim(),
        precio,
      });
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
      <div className="px-6 py-4 border-b border-gray-50 flex gap-2 items-center">
        <input
          value={nuevoLabel}
          onChange={e => setNuevoLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Ej: Castración, Vacuna rabia, Pelaje…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="relative w-36 flex-shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">$</span>
          <input
            type="number"
            min={0}
            value={nuevoPrecio}
            onChange={e => setNuevoPrecio(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregar()}
            placeholder="Precio"
            className="w-full text-sm border border-gray-200 rounded-lg pl-6 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button
          onClick={agregar}
          disabled={!nuevoLabel.trim() || saving}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40 flex-shrink-0"
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
                <div className="flex flex-1 gap-2 items-center">
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && actualizar(t.id)}
                    className="flex-1 text-sm border border-emerald-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    autoFocus
                  />
                  <div className="relative w-28 flex-shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">$</span>
                    <input
                      type="number"
                      min={0}
                      value={editPrecio}
                      onChange={e => setEditPrecio(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && actualizar(t.id)}
                      placeholder="Precio"
                      className="w-full text-sm border border-emerald-300 rounded-lg pl-5 pr-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <button onClick={() => actualizar(t.id)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg font-medium">Guardar</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg">Cancelar</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2">
                    <p className={`text-sm ${t.activo ? 'text-gray-700' : 'line-through text-gray-400'}`}>{t.label}</p>
                    {t.precio != null && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                        ${t.precio.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditId(t.id); setEditLabel(t.label); setEditPrecio(t.precio != null ? String(t.precio) : ''); }}
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

// ─── Sección Clínica ──────────────────────────────────────────
function SeccionClinica() {
  const [data, setData]           = useState<ClinicaConfig>({ nombre: '', logoUrl: null, emailClinica: null, telefonos: null });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]         = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get('/configuracion/clinica')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function guardar() {
    if (!data.nombre.trim()) return;
    setSaving(true);
    try {
      const r = await apiClient.put('/configuracion/clinica', {
        nombre:       data.nombre,
        emailClinica: data.emailClinica || null,
        telefonos:    data.telefonos    || null,
      });
      setData(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function subirArchivo(endpoint: string, file: File, field: 'logoUrl', setUpl: (v: boolean) => void) {
    setUpl(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('kmcvet_token');
      const res = await fetch(`/api/configuracion/clinica/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.status === 401) {
        localStorage.removeItem('kmcvet_token');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Error al subir archivo');
      const json = await res.json();
      setData(p => ({ ...p, [field]: json[field] }));
    } catch (err: any) {
      alert(err.message ?? 'Error al subir archivo');
    } finally {
      setUpl(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16"><span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-800">Datos de la Clínica</h2>
        <p className="text-xs text-gray-400 mt-0.5">Información general de tu veterinaria</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Logo */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Logo / Imagen de la clínica</p>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if(f) subirArchivo('logo', f, 'logoUrl', setUploading); fileRef.current && (fileRef.current.value=''); }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                {uploading ? <><span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"/>Subiendo…</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Subir imagen</>}
              </button>
              <p className="text-[11px] text-gray-400">PNG, JPG o SVG · máx. 2MB</p>
            </div>
          </div>
        </div>

        {/* Información */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Información de la clínica</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nombre de la veterinaria <span className="text-red-400">*</span></label>
              <input value={data.nombre} onChange={e => setData(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Clínica Veterinaria San Patricio" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
              <input type="email" value={data.emailClinica ?? ''} onChange={e => setData(p => ({ ...p, emailClinica: e.target.value }))}
                placeholder="contacto@clinica.cl" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfonos de contacto</label>
              <input value={data.telefonos ?? ''} onChange={e => setData(p => ({ ...p, telefonos: e.target.value }))}
                placeholder="+56 2 1234 5678 / +56 9 8765 4321" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button onClick={guardar} disabled={!data.nombre.trim() || saving}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center gap-2">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Guardado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sección Documentos ───────────────────────────────────────────
type TipoDocumento = 'boleta' | 'factura' | 'nota_credito';

interface DocumentoConfig {
  plantillaBoletaUrl?: string | null;
  plantillaFacturaUrl?: string | null;
  plantillaNotaCreditoUrl?: string | null;
}

function SeccionDocumentos() {
  const [docs, setDocs] = useState<DocumentoConfig>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<TipoDocumento | null>(null);
  const refs = {
    boleta:        useRef<HTMLInputElement>(null),
    factura:       useRef<HTMLInputElement>(null),
    nota_credito:  useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    apiClient.get('/configuracion/clinica')
      .then(r => setDocs({
        plantillaBoletaUrl:      r.data.plantillaBoletaUrl,
        plantillaFacturaUrl:     r.data.plantillaFacturaUrl,
        plantillaNotaCreditoUrl: r.data.plantillaNotaCreditoUrl,
      }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function subirPlantilla(tipo: TipoDocumento, file: File) {
    setUploading(tipo);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(`/configuracion/clinica/plantilla?tipo=${tipo}`, fd);
      const field = tipo === 'boleta' ? 'plantillaBoletaUrl'
        : tipo === 'factura'          ? 'plantillaFacturaUrl'
        : 'plantillaNotaCreditoUrl';
      setDocs(p => ({ ...p, [field]: res.data[field] }));
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(null);
    }
  }

  async function quitarPlantilla(tipo: TipoDocumento) {
    const field = tipo === 'boleta' ? 'plantillaBoletaUrl'
      : tipo === 'factura'          ? 'plantillaFacturaUrl'
      : 'plantillaNotaCreditoUrl';
    await apiClient.put('/configuracion/clinica', { [field]: null });
    setDocs(p => ({ ...p, [field]: null }));
  }

  const DOCS: { tipo: TipoDocumento; label: string; desc: string }[] = [
    { tipo: 'boleta',       label: 'Boleta',         desc: 'Plantilla HTML o imagen de encabezado para boletas' },
    { tipo: 'factura',      label: 'Factura',         desc: 'Plantilla HTML o imagen de encabezado para facturas' },
    { tipo: 'nota_credito', label: 'Nota de Crédito', desc: 'Plantilla HTML o imagen de encabezado para notas de crédito' },
  ];

  const urlFor = (tipo: TipoDocumento) =>
    tipo === 'boleta'       ? docs.plantillaBoletaUrl
    : tipo === 'factura'    ? docs.plantillaFacturaUrl
    : docs.plantillaNotaCreditoUrl;

  if (loading) return <div className="flex items-center justify-center h-40"><span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Plantillas de documentos</h2>
        <p className="text-sm text-gray-400 mt-0.5">Sube un archivo HTML con la plantilla completa (usa <code className="bg-gray-100 px-1 rounded text-xs">{'{{VARIABLE}}'}</code> para datos dinámicos) o una imagen de membrete que aparecerá en el encabezado del documento.</p>
      </div>

      {DOCS.map(({ tipo, label, desc }) => {
        const url = urlFor(tipo);
        const ref = refs[tipo];
        const isUploading = uploading === tipo;
        return (
          <div key={tipo} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
              </div>
              {url && (
                <button onClick={() => quitarPlantilla(tipo)}
                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors">
                  Quitar
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {url ? (
                /\.html?$/i.test(url) ? (
                  <div className="flex-1 border border-gray-200 rounded-lg bg-gray-50 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{url.split('/').pop()}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Plantilla HTML cargada</p>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-[11px] text-emerald-600 hover:underline whitespace-nowrap">Ver</a>
                  </div>
                ) : (
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 max-h-20">
                    <img src={url} alt={`Plantilla ${label}`} className="w-full h-20 object-cover object-top" />
                  </div>
                )
              ) : (
                <div className="flex-1 border border-dashed border-gray-200 rounded-lg h-16 flex items-center justify-center bg-gray-50">
                  <p className="text-xs text-gray-400">Sin plantilla cargada</p>
                </div>
              )}
              <div className="flex-shrink-0">
                <input ref={ref} type="file" accept="image/*,.html,.htm" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) subirPlantilla(tipo, f); if (ref.current) ref.current.value = ''; }} />
                <button onClick={() => ref.current?.click()} disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 whitespace-nowrap">
                  {isUploading
                    ? <><span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />Subiendo…</>
                    : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>{url ? 'Cambiar plantilla' : 'Subir plantilla'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Folios / numeración de documentos ── */}
    </div>
  );
}

// ─── Sección Folios ───────────────────────────────────────────────
interface FolioRange { id: string; tipo: string; desde: number; hasta: number; actual: number; activo: boolean; fechaVencimiento?: string | null; createdAt?: string }
interface FolioStatus { disponibles: number; siguiente: number | null; estado: 'ok' | 'sin_folios' | 'agotado' }

function SeccionFolios() {
  const [folios, setFolios]   = useState<FolioRange[]>([]);
  const [status, setStatus]   = useState<Record<string, FolioStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ tipo: 'boleta', desde: '', hasta: '', fechaVencimiento: '' });

  const TIPOS = [
    { key: 'boleta',       label: 'Boleta' },
    { key: 'factura',      label: 'Factura' },
    { key: 'nota_credito', label: 'Nota de Crédito' },
  ];

  function fmtFecha(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function cargar() {
    setLoading(true);
    Promise.all([
      apiClient.get('/configuracion/folios'),
      apiClient.get('/configuracion/folios/estado'),
    ]).then(([fRes, sRes]) => {
      setFolios(fRes.data);
      setStatus(sRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []);

  async function agregar() {
    const desde = parseInt(form.desde);
    const hasta = parseInt(form.hasta);
    if (!form.tipo || isNaN(desde) || isNaN(hasta) || desde > hasta) {
      alert('Ingresa un rango válido (número inicial ≤ número final)');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/configuracion/folios', {
        tipo: form.tipo, desde, hasta,
        fechaVencimiento: form.fechaVencimiento || null,
      });
      setForm(p => ({ ...p, desde: '', hasta: '', fechaVencimiento: '' }));
      cargar();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Error al agregar folio');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este rango de folios?')) return;
    await apiClient.delete(`/configuracion/folios/${id}`);
    cargar();
  }

  const estadoColor = (e: string) =>
    e === 'ok' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    e === 'agotado' ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-red-700 bg-red-50 border-red-200';

  const estadoLabel = (e: string, d: number) =>
    e === 'ok' ? `${d} folio${d !== 1 ? 's' : ''} disponible${d !== 1 ? 's' : ''}` :
    e === 'agotado' ? 'Folios agotados' : 'Sin folios cargados';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Folios / Numeración de documentos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Define los rangos de números para cada tipo de documento tributario.</p>
        </div>
      </div>

      {/* Estado actual por tipo */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIPOS.map(({ key, label }) => {
            const s = status[key];
            const folioActivo = folios.find(f => f.tipo === key && f.activo && f.actual <= f.hasta);
            const venc = folioActivo?.fechaVencimiento;
            const vencido = venc ? new Date(venc) < new Date() : false;
            const proxVencer = venc && !vencido ? (new Date(venc).getTime() - Date.now()) < 30 * 24 * 3600000 : false;
            return (
              <div key={key} className={`border rounded-xl p-3 ${s ? estadoColor(s.estado) : 'border-gray-200'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
                {s ? (
                  <>
                    <p className="text-sm font-bold">{estadoLabel(s.estado, s.disponibles)}</p>
                    {s.siguiente && <p className="text-[11px] mt-0.5">Próximo N°: <strong>{s.siguiente}</strong></p>}
                    {folioActivo && (
                      <p className="text-[11px] mt-0.5">
                        Rango: {folioActivo.desde}–{folioActivo.hasta} &middot; Quedan: <strong>{Math.max(0, folioActivo.hasta - folioActivo.actual + 1)}</strong>
                      </p>
                    )}
                    {venc && (
                      <p className={`text-[11px] mt-0.5 font-semibold ${vencido ? 'text-red-600' : proxVencer ? 'text-amber-600' : ''}`}>
                        Venc.: {fmtFecha(venc)}{vencido ? ' ⚠ VENCIDO' : proxVencer ? ' ⚠ próximo' : ''}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm">Sin datos</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario nuevo rango */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Agregar rango de folios</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {TIPOS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Desde (N° inicial)</label>
            <input type="number" min={1} value={form.desde} onChange={e => setForm(p => ({ ...p, desde: e.target.value }))}
              placeholder="Ej: 1" className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Hasta (N° final)</label>
            <input type="number" min={1} value={form.hasta} onChange={e => setForm(p => ({ ...p, hasta: e.target.value }))}
              placeholder="Ej: 100" className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Fecha vencimiento (opcional)</label>
            <input type="date" value={form.fechaVencimiento} onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <button onClick={agregar} disabled={saving || !form.desde || !form.hasta}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center gap-2">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Agregar
          </button>
        </div>
      </div>

      {/* Lista/historial de rangos cargados */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historial de rangos asignados</h3>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No hay rangos de folios cargados</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-center font-semibold">Desde</th>
                  <th className="px-4 py-2 text-center font-semibold">Hasta</th>
                  <th className="px-4 py-2 text-center font-semibold">Van</th>
                  <th className="px-4 py-2 text-center font-semibold">Quedan</th>
                  <th className="px-4 py-2 text-center font-semibold">F. Carga</th>
                  <th className="px-4 py-2 text-center font-semibold">F. Vencimiento</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {folios.map(f => {
                  const disponibles = Math.max(0, f.hasta - f.actual + 1);
                  const agotado = disponibles === 0;
                  const vencido = f.fechaVencimiento ? new Date(f.fechaVencimiento) < new Date() : false;
                  const proxVencer = f.fechaVencimiento && !vencido
                    ? (new Date(f.fechaVencimiento).getTime() - Date.now()) < 30 * 24 * 3600000 : false;
                  return (
                    <tr key={f.id} className={agotado ? 'bg-gray-50' : vencido ? 'bg-red-50' : proxVencer ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-2 capitalize font-medium text-gray-700">{f.tipo.replace('_', ' ')}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{f.desde}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{f.hasta}</td>
                      <td className="px-4 py-2 text-center font-semibold text-gray-800">{agotado ? '—' : f.actual - 1 <= f.desde ? 0 : f.actual - f.desde}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          agotado ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                        }`}>{disponibles}</span>
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500 text-xs">{fmtFecha(f.createdAt)}</td>
                      <td className="px-4 py-2 text-center">
                        {f.fechaVencimiento ? (
                          <span className={`text-xs font-medium ${
                            vencido ? 'text-red-600' : proxVencer ? 'text-amber-600' : 'text-gray-600'
                          }`}>
                            {fmtFecha(f.fechaVencimiento)}
                            {vencido ? ' ⚠' : proxVencer ? ' ⚠' : ''}
                          </span>
                        ) : <span className="text-gray-300">Sin fecha</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => eliminar(f.id)} className="text-[11px] text-red-400 hover:text-red-600">Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function ConfiguracionPage() {
  const [tab, setTab] = useState<'clinica' | 'doctores' | 'tipos' | 'documentos' | 'folios' | 'hospital'>('clinica');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Configuración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Datos de la clínica, personal médico y parámetros</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: 'clinica',     label: 'Mi Clínica' },
          { key: 'doctores',    label: 'Atención Doctores' },
          { key: 'tipos',       label: 'Tipos de Atención' },
          { key: 'documentos',  label: 'Documentos' },
          { key: 'folios',      label: 'Folios' },
          { key: 'hospital',    label: 'Hospital' },
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

      {tab === 'clinica'     && <SeccionClinica />}
      {tab === 'doctores'    && <SeccionDoctores />}
      {tab === 'tipos'       && <SeccionTiposAtencion />}
      {tab === 'documentos'  && <SeccionDocumentos />}
      {tab === 'folios'      && <SeccionFolios />}
      {tab === 'hospital'    && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-1">Módulo Hospital</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Aquí podrás configurar salas de hospitalización, camas, dietas y protocolos de internación. Próximamente disponible.
          </p>
        </div>
      )}
    </div>
  );
}
