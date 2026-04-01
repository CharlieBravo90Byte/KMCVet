import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../shared/lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.kmcvet.com');
  const [password, setPassword] = useState('Admin1234!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('kmcvet_token', res.data.accessToken);
      navigate('/dashboard');
    } catch {
      setError('Credenciales incorrectas o servidor no disponible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-700">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-xs text-center">
          <div className="w-24 h-24 bg-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <svg className="w-14 h-14 text-green-900" fill="currentColor" viewBox="0 0 24 24">
              <ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" />
              <ellipse cx="10" cy="4.5" rx="2" ry="2.5" />
              <ellipse cx="14" cy="4.5" rx="2" ry="2.5" />
              <ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" />
              <path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">KMCVet</h1>
          <p className="text-green-200 text-lg leading-relaxed">Sistema integral de gestión para clínicas veterinarias</p>
          <div className="mt-8 space-y-3 text-left">
            {['Registro de pacientes y fichas clínicas', 'Agenda de citas y atención', 'Control de inventario y stock'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-green-100">
                <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-900" fill="currentColor" viewBox="0 0 24 24">
                <ellipse cx="5.5" cy="6.5" rx="2" ry="2.5" />
                <ellipse cx="10" cy="4.5" rx="2" ry="2.5" />
                <ellipse cx="14" cy="4.5" rx="2" ry="2.5" />
                <ellipse cx="18.5" cy="6.5" rx="2" ry="2.5" />
                <path d="M12 9.5c-3.8 0-7 2.3-7 5.8 0 2.3 1.8 4.2 4 4.2h6c2.2 0 4-1.9 4-4.2 0-3.5-3.2-5.8-7-5.8z" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-800">KMCVet</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-7">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                placeholder="usuario@clinica.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
          <p className="text-xs text-center text-gray-400 mt-6 border-t border-gray-100 pt-4">
            Demo: <span className="font-medium text-gray-600">admin@demo.kmcvet.com</span> / Admin1234!
          </p>
          <div className="mt-4 text-center">
            <Link to="/reservar"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reservar hora en línea
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
