// Script: escribe AnimalesPage.tsx con UTF-8 correcto
const fs   = require('fs');
const path = require('path');
const dest = path.join(__dirname, '../apps/web/src/modules/animales/AnimalesPage.tsx');

const c = String.fromCharCode;
// Caracteres especiales
const oacute = c(243);  // ó
const aacute = c(225);  // á
const iacute = c(237);  // í
const uacute = c(250);  // ú
const ntilde = c(241);  // ñ
const eacute = c(233);  // é
const Aacute = c(193);  // Á
const Eacute = c(201);  // É
const Iacute = c(205);  // Í
const Oacute = c(211);  // Ó
const Uacute = c(218);  // Ú
const middot = c(183);  // ·
const hellip = '\u2026'; // …
const endash = '\u2013'; // –

const content = `import { useState } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────
interface Propietario {
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  documento: string;
}

interface Animal {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  fechaNacimiento: string;
  color: string;
  microchip: string;
  peso: string;
  alergias: string;
  condiciones: string;
  propietario: Propietario;
  foto: string;
}

type FormStep = 'propietario' | 'animal' | 'resumen';

const ESPECIES: Record<string, { label: string; emoji: string; borde: string; razas: string[] }> = {
  DOG:   { label: 'Perro',  emoji: '🐕', borde: 'border-amber-300 bg-amber-50 text-amber-700',
           razas: ['Mestizo','Labrador','Golden Retriever','Bulldog','Beagle','Pastor Alem${aacute}n','Poodle','Chihuahua','Shih Tzu','Schnauzer','Otro'] },
  CAT:   { label: 'Gato',   emoji: '🐈', borde: 'border-purple-300 bg-purple-50 text-purple-700',
           razas: ['Mestizo','Siames','Persa','Maine Coon','Ragdoll','Bengal\u00eda','British Shorthair','Angora','Sphynx','Otro'] },
  BIRD:  { label: 'Ave',    emoji: '🦜', borde: 'border-sky-300 bg-sky-50 text-sky-700',
           razas: ['Canario','Loro','Cotorra','Agapornis','Cacatua','Periquito','Otro'] },
  RABBIT:{ label: 'Conejo', emoji: '🐰', borde: 'border-pink-300 bg-pink-50 text-pink-700',
           razas: ['Mestizo','Rex','Holland Lop','Angora','Otro'] },
  REPTIL:{ label: 'Reptil', emoji: '🦎', borde: 'border-green-300 bg-green-50 text-green-700',
           razas: ['Iguana','Gecko','Tortuga','Serpiente','Otro'] },
  OTHER: { label: 'Otro',   emoji: '🐾', borde: 'border-gray-300 bg-gray-50 text-gray-600',
           razas: ['Especificar'] },
};

const EMPTY_FORM: Omit<Animal,'id'> = {
  nombre: '', especie: 'DOG', raza: '', sexo: '', fechaNacimiento: '',
  color: '', microchip: '', peso: '', alergias: '', condiciones: '',
  propietario: { nombre: '', telefono: '', email: '', direccion: '', documento: '' },
  foto: '',
};

// ─── Helper campo ─────────────────────────────────────────────────
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

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white';
const selectCls = inputCls;

// ─── Modal formulario mascota ─────────────────────────────────────
function ModalAnimal({
  onClose, onSave, initial,
}: {
  onClose: () => void;
  onSave: (a: Omit<Animal,'id'>) => void;
  initial?: Omit<Animal,'id'>;
}) {
  const [step, setStep] = useState<FormStep>('propietario');
  const [form, setForm] = useState<Omit<Animal,'id'>>(initial ?? EMPTY_FORM);
  const [fotoPreview, setFotoPreview] = useState<string>(initial?.foto ?? '');

  const set = (f: Partial<Omit<Animal,'id'>>) => setForm(p => ({ ...p, ...f }));
  const setProp = (f: Partial<Propietario>) => setForm(p => ({ ...p, propietario: { ...p.propietario, ...f } }));

  const espInfo = ESPECIES[form.especie] ?? ESPECIES.OTHER;

  const canNextProp = !!form.propietario.nombre && !!form.propietario.telefono;
  const canNextAnimal = !!form.nombre && !!form.especie && !!form.sexo;

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setFotoPreview(src);
      set({ foto: src });
    };
    reader.readAsDataURL(file);
  }

  const steps: FormStep[] = ['propietario', 'animal', 'resumen'];
  const stepIdx = steps.indexOf(step);
  const stepLabels = ['Propietario', 'Mascota', 'Resumen'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-base">
              {initial ? 'Editar ficha' : 'Registrar nueva mascota'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Completa todos los campos para crear la ficha del paciente</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-0 flex-1">
              <button
                onClick={() => {
                  if (i < stepIdx || (i === 1 && canNextProp) || (i === 2 && canNextProp && canNextAnimal)) setStep(s);
                }}
                className={\`flex items-center gap-2 \${i <= stepIdx ? 'text-emerald-700' : 'text-gray-400'}\`}
              >
                <span className={\`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 \${
                  i < stepIdx ? 'bg-emerald-600 text-white' :
                  i === stepIdx ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' :
                  'bg-gray-100 text-gray-400'
                }\`}>
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                <span className="text-xs font-medium hidden sm:block">{stepLabels[i]}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={\`flex-1 h-0.5 mx-2 \${i < stepIdx ? 'bg-emerald-400' : 'bg-gray-100'}\`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Paso 1: Propietario ── */}
          {step === 'propietario' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Datos del propietario</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre completo" required>
                  <input value={form.propietario.nombre} onChange={e => setProp({ nombre: e.target.value })}
                    placeholder="Ej: Mar${iacute}a Garc${iacute}a" className={inputCls} />
                </Field>
                <Field label="RUT / DNI / Documento" required>
                  <input value={form.propietario.documento} onChange={e => setProp({ documento: e.target.value })}
                    placeholder="Ej: 12.345.678-9" className={inputCls} />
                </Field>
                <Field label="Tel${eacute}fono" required>
                  <input value={form.propietario.telefono} onChange={e => setProp({ telefono: e.target.value })}
                    placeholder="+56 9 1234 5678" className={inputCls} type="tel" />
                </Field>
                <Field label="Correo electr${oacute}nico">
                  <input value={form.propietario.email} onChange={e => setProp({ email: e.target.value })}
                    placeholder="correo@ejemplo.com" className={inputCls} type="email" />
                </Field>
                <Field label="Direcci${oacute}n">
                  <input value={form.propietario.direccion} onChange={e => setProp({ direccion: e.target.value })}
                    placeholder="Calle 123, Ciudad" className={\`\${inputCls} col-span-2\`} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Paso 2: Datos de la mascota ── */}
          {step === 'animal' && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">Datos de la mascota</p>

              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{espInfo.emoji}</span>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Subir foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG hasta 5 MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre de la mascota" required>
                  <input value={form.nombre} onChange={e => set({ nombre: e.target.value })}
                    placeholder="Ej: Max" className={inputCls} />
                </Field>

                <Field label="Especie" required>
                  <select value={form.especie} onChange={e => set({ especie: e.target.value, raza: '' })} className={selectCls}>
                    {Object.entries(ESPECIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Raza">
                  <select value={form.raza} onChange={e => set({ raza: e.target.value })} className={selectCls}>
                    <option value="">Seleccionar raza</option>
                    {espInfo.razas.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>

                <Field label="Sexo" required>
                  <div className="flex gap-2">
                    {[{ v: 'M', l: '♂ Macho' }, { v: 'F', l: '♀ Hembra' }].map(({ v, l }) => (
                      <button
                        key={v}
                        onClick={() => set({ sexo: v })}
                        className={\`flex-1 py-2 rounded-lg text-sm font-medium border transition-all \${
                          form.sexo === v
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-emerald-400'
                        }\`}
                      >{l}</button>
                    ))}
                  </div>
                </Field>

                <Field label="Fecha de nacimiento">
                  <input type="date" value={form.fechaNacimiento} onChange={e => set({ fechaNacimiento: e.target.value })} className={inputCls} />
                </Field>

                <Field label="Color / Pelaje">
                  <input value={form.color} onChange={e => set({ color: e.target.value })}
                    placeholder="Ej: Negro con manchas blancas" className={inputCls} />
                </Field>

                <Field label="N\u00ba microchip">
                  <input value={form.microchip} onChange={e => set({ microchip: e.target.value })}
                    placeholder="15 d${iacute}gitos" className={inputCls} maxLength={15} />
                </Field>

                <Field label="Peso actual (kg)">
                  <input type="number" step="0.1" min="0" value={form.peso} onChange={e => set({ peso: e.target.value })}
                    placeholder="Ej: 12.5" className={inputCls} />
                </Field>
              </div>

              <Field label="Alergias conocidas">
                <textarea value={form.alergias} onChange={e => set({ alergias: e.target.value })}
                  rows={2} placeholder="Ej: Polen, penicilina${hellip} (dejar en blanco si no hay)"
                  className={\`\${inputCls} resize-none\`} />
              </Field>

              <Field label="Condiciones preexistentes / Observaciones">
                <textarea value={form.condiciones} onChange={e => set({ condiciones: e.target.value })}
                  rows={2} placeholder="Ej: Artritis cr${oacute}nica, operado de cadera${hellip}"
                  className={\`\${inputCls} resize-none\`} />
              </Field>
            </div>
          )}

          {/* ── Paso 3: Resumen ── */}
          {step === 'resumen' && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">Revisa la informaci${oacute}n antes de guardar</p>

              {/* Tarjeta mascota */}
              <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-300 flex items-center justify-center bg-white flex-shrink-0">
                  {fotoPreview
                    ? <img src={fotoPreview} alt="foto" className="w-full h-full object-cover" />
                    : <span className="text-3xl">{espInfo.emoji}</span>
                  }
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{form.nombre || '(sin nombre)'}</p>
                  <p className="text-sm text-gray-500">{espInfo.emoji} {espInfo.label} ${middot} {form.raza || 'Raza no especificada'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {form.sexo === 'M' ? '♂ Macho' : form.sexo === 'F' ? '♀ Hembra' : ''}
                    {form.peso ? \` ${middot} \${form.peso} kg\` : ''}
                    {form.fechaNacimiento ? \` ${middot} Nac. \${form.fechaNacimiento}\` : ''}
                  </p>
                </div>
              </div>

              {/* Datos propietario */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Propietario</p>
                <Row label="Nombre"  val={form.propietario.nombre} />
                <Row label="Documento" val={form.propietario.documento} />
                <Row label="Tel${eacute}fono"  val={form.propietario.telefono} />
                {form.propietario.email    && <Row label="Email"     val={form.propietario.email} />}
                {form.propietario.direccion && <Row label="Direcci${oacute}n" val={form.propietario.direccion} />}
              </div>

              {/* Detalles adicionales */}
              {(form.microchip || form.color || form.alergias || form.condiciones) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detalles adicionales</p>
                  {form.microchip   && <Row label="Microchip"   val={form.microchip} />}
                  {form.color       && <Row label="Color"       val={form.color} />}
                  {form.alergias    && <Row label="Alergias"    val={form.alergias} />}
                  {form.condiciones && <Row label="Condiciones" val={form.condiciones} />}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step !== 'propietario' && (
            <button
              onClick={() => setStep(steps[stepIdx - 1])}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Atr${aacute}s
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ml-auto">
            Cancelar
          </button>
          {step !== 'resumen' ? (
            <button
              onClick={() => setStep(steps[stepIdx + 1])}
              disabled={step === 'propietario' ? !canNextProp : !canNextAnimal}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={() => onSave(form)}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              ✓ Guardar ficha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-700 font-medium flex-1">{val}</span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function AnimalesPage() {
  const [animals, setAnimals] = useState<Animal[]>([
    {
      id: 1, nombre: 'Max', especie: 'DOG', raza: 'Mestizo', sexo: 'M',
      fechaNacimiento: '2023-03-10', color: 'Negro', microchip: '', peso: '12',
      alergias: '', condiciones: '',
      propietario: { nombre: 'Juan Gonz${aacute}lez', telefono: '+56 9 1234 5678', email: 'juan@demo.com', direccion: 'Calle Demo 123', documento: '12345678-9' },
      foto: '',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState('');

  function guardar(form: Omit<Animal,'id'>) {
    if (editAnimal) {
      setAnimals(p => p.map(a => a.id === editAnimal.id ? { ...form, id: editAnimal.id } : a));
    } else {
      setAnimals(p => [...p, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
    setEditAnimal(null);
  }

  function abrirEditar(a: Animal) {
    setEditAnimal(a);
    setShowModal(true);
  }

  function abrirNuevo() {
    setEditAnimal(null);
    setShowModal(true);
  }

  const filtrados = animals.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.nombre.toLowerCase().includes(q)
      || a.raza.toLowerCase().includes(q)
      || a.propietario.nombre.toLowerCase().includes(q);
    const matchEspecie = !filtroEspecie || a.especie === filtroEspecie;
    return matchSearch && matchEspecie;
  });

  const stats = {
    total: animals.length,
    DOG:  animals.filter(a => a.especie === 'DOG').length,
    CAT:  animals.filter(a => a.especie === 'CAT').length,
    otros: animals.filter(a => !['DOG','CAT'].includes(a.especie)).length,
  };

  function calcularEdad(fecha: string) {
    if (!fecha) return '—';
    const diff = Date.now() - new Date(fecha).getTime();
    const meses = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    if (meses < 1)  return '< 1 mes';
    if (meses < 12) return \`\${meses} mes\${meses > 1 ? 'es' : ''}\`;
    const a = Math.floor(meses / 12);
    return \`\${a} a\u00f1o\${a > 1 ? 's' : ''}\`;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Registro de Animales</h1>
          <p className="text-sm text-gray-400 mt-0.5">Fichas de pacientes de la cl${iacute}nica</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo animal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total pacientes', value: stats.total, icon: '🐾', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Perros',          value: stats.DOG,   icon: '🐕', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Gatos',           value: stats.CAT,   icon: '🐈', bg: 'bg-purple-50 text-purple-700 border-purple-100' },
          { label: 'Otras especies',  value: stats.otros, icon: '🦜', bg: 'bg-sky-50 text-sky-700 border-sky-100' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className={\`rounded-xl border p-4 \${bg}\`}>
            <span className="text-xl block mb-1">{icon}</span>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, raza o propietario${hellip}"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
        </div>
        <select
          value={filtroEspecie} onChange={e => setFiltroEspecie(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Todas las especies</option>
          {Object.entries(ESPECIES).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span className="col-span-4">Animal / Propietario</span>
          <span className="col-span-2">Especie / Raza</span>
          <span className="col-span-2">Edad</span>
          <span className="col-span-2">Peso</span>
          <span className="col-span-2 text-right">Acciones</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="text-5xl mb-3">🐾</span>
            <p className="font-semibold text-gray-600 text-sm">
              {search || filtroEspecie ? 'Sin resultados' : 'Sin pacientes registrados'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || filtroEspecie ? 'Intenta cambiar los filtros' : 'Agrega el primer paciente con el bot${oacute}n superior'}
            </p>
          </div>
        ) : (
          filtrados.map(a => {
            const esp = ESPECIES[a.especie] ?? ESPECIES.OTHER;
            return (
              <div key={a.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-b border-gray-50 hover:bg-emerald-50/40 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0 bg-emerald-50 flex items-center justify-center">
                    {a.foto
                      ? <img src={a.foto} alt={a.nombre} className="w-full h-full object-cover" />
                      : <span className="text-lg">{esp.emoji}</span>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.nombre}</p>
                    <p className="text-xs text-gray-400">👤 {a.propietario.nombre}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={\`inline-flex items-center text-xs font-medium border px-2 py-0.5 rounded-full \${esp.borde}\`}>
                    {esp.emoji} {esp.label}
                  </span>
                  {a.raza && <p className="text-xs text-gray-400 mt-0.5">{a.raza}</p>}
                </div>
                <div className="col-span-2 text-sm text-gray-600">{calcularEdad(a.fechaNacimiento)}</div>
                <div className="col-span-2 text-sm text-gray-600">{a.peso ? \`\${a.peso} kg\` : '—'}</div>
                <div className="col-span-2 flex justify-end gap-1">
                  <button
                    onClick={() => abrirEditar(a)}
                    className="text-xs text-gray-500 hover:text-emerald-700 font-medium px-2 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-300 transition-all"
                    title="Editar ficha"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    className="text-xs text-emerald-600 hover:text-white hover:bg-emerald-600 font-medium px-3 py-1.5 rounded-lg border border-emerald-200 hover:border-emerald-600 transition-all"
                  >
                    Ver ficha
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtrados.length} paciente(s) mostrado(s)</p>
          <p className="text-xs text-gray-400">{animals.length} en total</p>
        </div>
      </div>

      {showModal && (
        <ModalAnimal
          onClose={() => { setShowModal(false); setEditAnimal(null); }}
          onSave={guardar}
          initial={editAnimal ? editAnimal : undefined}
        />
      )}
    </div>
  );
}
`;

fs.writeFileSync(dest, content, { encoding: 'utf8' });
console.log('AnimalesPage.tsx OK (' + content.length + ' bytes)');
