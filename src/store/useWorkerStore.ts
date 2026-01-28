import { create } from 'zustand';
import { Worker, CreateWorkerInput } from '../domain/entities';
import { WorkerRepository } from '../data/repositories';

interface WorkerState {
  workers: Worker[];
  inactiveWorkers: Worker[];
  isLoading: boolean;
  error: string | null;
  
  fetchWorkers: () => Promise<void>;
  fetchInactiveWorkers: () => Promise<void>;
  addWorker: (input: CreateWorkerInput) => Promise<Worker>;
  updateWorker: (id: string, input: Partial<CreateWorkerInput>) => Promise<void>;
  deactivateWorker: (id: string) => Promise<void>;
  restoreWorker: (id: string) => Promise<void>;
  permanentDeleteWorker: (id: string) => Promise<void>;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  inactiveWorkers: [],
  isLoading: false,
  error: null,

  fetchWorkers: async () => {
    set({ isLoading: true, error: null });
    try {
      const workers = await WorkerRepository.getActive();
      set({ workers, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar trabajadores', isLoading: false });
    }
  },

  fetchInactiveWorkers: async () => {
    try {
      const inactiveWorkers = await WorkerRepository.getInactive();
      set({ inactiveWorkers });
    } catch (error) {
      set({ error: 'Error al cargar trabajadores inactivos' });
    }
  },

  addWorker: async (input: CreateWorkerInput) => {
    set({ isLoading: true, error: null });
    try {
      const worker = await WorkerRepository.create(input);
      set(state => ({ 
        workers: [...state.workers, worker], 
        isLoading: false 
      }));
      return worker;
    } catch (error) {
      set({ error: 'Error al crear trabajador', isLoading: false });
      throw error;
    }
  },

  updateWorker: async (id: string, input: Partial<CreateWorkerInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await WorkerRepository.update(id, input);
      if (updated) {
        set(state => ({
          workers: state.workers.map(w => w.id === id ? updated : w),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Error al actualizar trabajador', isLoading: false });
      throw error;
    }
  },

  deactivateWorker: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await WorkerRepository.softDelete(id);
      set(state => ({
        workers: state.workers.filter(w => w.id !== id),
        isLoading: false,
      }));
      await get().fetchInactiveWorkers();
    } catch (error) {
      set({ error: 'Error al desactivar trabajador', isLoading: false });
      throw error;
    }
  },

  restoreWorker: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await WorkerRepository.restore(id);
      await get().fetchWorkers();
      await get().fetchInactiveWorkers();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al restaurar trabajador', isLoading: false });
      throw error;
    }
  },

  permanentDeleteWorker: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await WorkerRepository.permanentDelete(id);
      set(state => ({
        inactiveWorkers: state.inactiveWorkers.filter(w => w.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Error al eliminar trabajador', isLoading: false });
      throw error;
    }
  },
}));
