import { db } from './db';
import { apiClient } from '../shared/lib/api';

// ── Cola de sincronización offline ────────────────────────────

export async function enqueueSync(
  operacion: 'create' | 'update' | 'delete',
  entidad: string,
  payload: Record<string, unknown>,
) {
  await db.syncQueue.add({
    operacion,
    entidad,
    payload,
    timestampLocal: Date.now(),
    estado: 'pendiente',
    intentos: 0,
  });
}

export async function processSyncQueue() {
  const pendientes = await db.syncQueue
    .where('estado')
    .equals('pendiente')
    .sortBy('timestampLocal');

  for (const item of pendientes) {
    try {
      await db.syncQueue.update(item.id!, { estado: 'enviando' });

      const endpointMap: Record<string, string> = {
        cita: '/atencion/citas',
        mascota: '/atencion/mascotas',
        propietario: '/atencion/propietarios',
        consulta: '/atencion/consultas',
        producto: '/inventario/productos',
        movimientoStock: '/inventario/movimientos',
      };

      const endpoint = endpointMap[item.entidad];
      if (!endpoint) throw new Error(`Entidad desconocida: ${item.entidad}`);

      if (item.operacion === 'create') {
        await apiClient.post(endpoint, item.payload);
      } else if (item.operacion === 'update') {
        await apiClient.patch(`${endpoint}/${item.payload['id']}`, item.payload);
      } else if (item.operacion === 'delete') {
        await apiClient.delete(`${endpoint}/${item.payload['id']}`);
      }

      await db.syncQueue.delete(item.id!);
    } catch {
      const intentos = (item.intentos ?? 0) + 1;
      await db.syncQueue.update(item.id!, {
        estado: intentos >= 3 ? 'error' : 'pendiente',
        intentos,
      });
    }
  }
}

// Escucha el evento de reconexión del navegador
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[KMCVet] Conexión restaurada — sincronizando cola...');
    processSyncQueue();
  });
}
