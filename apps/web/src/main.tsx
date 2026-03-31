import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { initOfflineDb } from './offline/db';
import './index.css';

// Inicializar IndexedDB (Dexie) antes de montar la app
initOfflineDb();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
