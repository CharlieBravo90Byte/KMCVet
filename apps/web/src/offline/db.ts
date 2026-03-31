import Dexie, { type Table } from 'dexie';

// ── Tipos para IndexedDB local ────────────────────────────────

export interface LocalSyncItem {
  id?: number;
  operacion: 'create' | 'update' | 'delete';
  entidad: string;
  payload: Record<string, unknown>;
  timestampLocal: number;
  estado: 'pendiente' | 'enviando' | 'error';
  intentos: number;
}

export interface LocalAppointment {
  id: string;
  tenantId: string;
  mascotaId: string;
  veterinarioId: string;
  fechaHora: string;
  motivo: string;
  estado: string;
  _syncPendiente?: boolean;
  _updatedAt: number;
}

export interface LocalPet {
  id: string;
  tenantId: string;
  nombre: string;
  especie: string;
  propietarioId: string;
  _syncPendiente?: boolean;
  _updatedAt: number;
}

export interface LocalProduct {
  id: string;
  tenantId: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  _syncPendiente?: boolean;
  _updatedAt: number;
}

// ── KMCVet Dexie Database ─────────────────────────────────────

class KMCVetDB extends Dexie {
  syncQueue!: Table<LocalSyncItem>;
  citas!: Table<LocalAppointment>;
  mascotas!: Table<LocalPet>;
  productos!: Table<LocalProduct>;

  constructor() {
    super('kmcvet_offline');

    this.version(1).stores({
      syncQueue: '++id, entidad, estado, timestampLocal',
      citas: 'id, tenantId, mascotaId, estado, _syncPendiente',
      mascotas: 'id, tenantId, propietarioId, _syncPendiente',
      productos: 'id, tenantId, categoria, _syncPendiente',
    });
  }
}

export const db = new KMCVetDB();

export function initOfflineDb() {
  // Dexie abre la BD lazy en el primer acceso.
  // Esta función existe para llamarla explícitamente al inicio y detectar errores temprano.
  db.open().catch((err) => {
    console.error('[KMCVet] Error abriendo IndexedDB:', err);
  });
}
