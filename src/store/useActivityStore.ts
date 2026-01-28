import { create } from 'zustand';
import { Activity, CreateActivityInput } from '../domain/entities';
import { ActivityRepository } from '../data/repositories';

interface ActivityState {
  activities: Activity[];
  inactiveActivities: Activity[];
  isLoading: boolean;
  error: string | null;
  
  fetchActivities: () => Promise<void>;
  fetchInactiveActivities: () => Promise<void>;
  addActivity: (input: CreateActivityInput) => Promise<Activity>;
  updateActivity: (id: string, input: Partial<CreateActivityInput>) => Promise<void>;
  deactivateActivity: (id: string) => Promise<void>;
  restoreActivity: (id: string) => Promise<void>;
  permanentDeleteActivity: (id: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  inactiveActivities: [],
  isLoading: false,
  error: null,

  fetchActivities: async () => {
    set({ isLoading: true, error: null });
    try {
      const activities = await ActivityRepository.getActive();
      set({ activities, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar actividades', isLoading: false });
    }
  },

  fetchInactiveActivities: async () => {
    try {
      const inactiveActivities = await ActivityRepository.getInactive();
      set({ inactiveActivities });
    } catch (error) {
      set({ error: 'Error al cargar actividades inactivas' });
    }
  },

  addActivity: async (input: CreateActivityInput) => {
    set({ isLoading: true, error: null });
    try {
      const activity = await ActivityRepository.create(input);
      set(state => ({ 
        activities: [...state.activities, activity], 
        isLoading: false 
      }));
      return activity;
    } catch (error) {
      set({ error: 'Error al crear actividad', isLoading: false });
      throw error;
    }
  },

  updateActivity: async (id: string, input: Partial<CreateActivityInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await ActivityRepository.update(id, input);
      if (updated) {
        set(state => ({
          activities: state.activities.map(a => a.id === id ? updated : a),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Error al actualizar actividad', isLoading: false });
      throw error;
    }
  },

  deactivateActivity: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ActivityRepository.softDelete(id);
      set(state => ({
        activities: state.activities.filter(a => a.id !== id),
        isLoading: false,
      }));
      await get().fetchInactiveActivities();
    } catch (error) {
      set({ error: 'Error al desactivar actividad', isLoading: false });
      throw error;
    }
  },

  restoreActivity: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ActivityRepository.restore(id);
      await get().fetchActivities();
      await get().fetchInactiveActivities();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al restaurar actividad', isLoading: false });
      throw error;
    }
  },

  permanentDeleteActivity: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ActivityRepository.permanentDelete(id);
      set(state => ({
        inactiveActivities: state.inactiveActivities.filter(a => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Error al eliminar actividad', isLoading: false });
      throw error;
    }
  },
}));
