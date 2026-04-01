import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './shared/components/layout/AppLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { AgendaPage } from './modules/atencion/AgendaPage';
import { AnimalesPage } from './modules/animales/AnimalesPage';
import { InventarioPage } from './modules/inventario/InventarioPage';
import { ConfiguracionPage } from './modules/configuracion/ConfiguracionPage';
import { VentasPage } from './modules/ventas/VentasPage';
import { ReservaPublicaPage } from './modules/atencion/ReservaPublicaPage';
import { PersonalPage } from './modules/configuracion/PersonalPage';

function PrivateRoute() {
  const token = localStorage.getItem('kmcvet_token');
  if (!token) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/reservar',
    element: <ReservaPublicaPage />,
  },
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'atencion/*', element: <AgendaPage /> },
      { path: 'animales/*', element: <AnimalesPage /> },
      { path: 'inventario/*', element: <InventarioPage /> },
      { path: 'configuracion/*', element: <ConfiguracionPage /> },
      { path: 'ventas/*', element: <VentasPage /> },
      { path: 'personal/*', element: <PersonalPage /> },
    ],
  },
]);
