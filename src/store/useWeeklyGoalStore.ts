import { create } from 'zustand';
import { WeeklyGoal, CreateWeeklyGoalInput, WeeklyGoalWithDetails } from '../domain/entities';
import { WeeklyGoalRepository } from '../data/repositories/WeeklyGoalRepository';

interface WeeklyGoalState {
  goals: WeeklyGoalWithDetails[];
  isLoading: boolean;
  error: string | null;
  selectedWeekStart: string;
  
  setSelectedWeekStart: (weekStart: string) => void;
  fetchGoals: () => Promise<void>;
  addGoal: (input: CreateWeeklyGoalInput) => Promise<WeeklyGoal>;
  addGoalForBlocks: (input: Omit<CreateWeeklyGoalInput, 'block'>, blocks: string[]) => Promise<void>;
  updateGoal: (id: string, input: Partial<CreateWeeklyGoalInput>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useWeeklyGoalStore = create<WeeklyGoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,
  selectedWeekStart: '',

  setSelectedWeekStart: (weekStart: string) => {
    set({ selectedWeekStart: weekStart });
    get().fetchGoals();
  },

  fetchGoals: async () => {
    const { selectedWeekStart } = get();
    if (!selectedWeekStart) return;
    
    set({ isLoading: true, error: null });
    try {
      const goals = await WeeklyGoalRepository.getWithDetails(selectedWeekStart);
      set({ goals, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar metas semanales', isLoading: false });
    }
  },

  addGoal: async (input: CreateWeeklyGoalInput) => {
    set({ isLoading: true, error: null });
    try {
      const goal = await WeeklyGoalRepository.create(input);
      await get().fetchGoals();
      set({ isLoading: false });
      return goal;
    } catch (error) {
      set({ error: 'Error al crear meta semanal', isLoading: false });
      throw error;
    }
  },

  addGoalForBlocks: async (input: Omit<CreateWeeklyGoalInput, 'block'>, blocks: string[]) => {
    set({ isLoading: true, error: null });
    try {
      for (const block of blocks) {
        await WeeklyGoalRepository.create({
          ...input,
          block: block.trim(),
        });
      }
      await get().fetchGoals();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al crear metas semanales', isLoading: false });
      throw error;
    }
  },

  updateGoal: async (id: string, input: Partial<CreateWeeklyGoalInput>) => {
    set({ isLoading: true, error: null });
    try {
      await WeeklyGoalRepository.update(id, input);
      await get().fetchGoals();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al actualizar meta semanal', isLoading: false });
      throw error;
    }
  },

  deleteGoal: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await WeeklyGoalRepository.delete(id);
      await get().fetchGoals();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al eliminar meta semanal', isLoading: false });
      throw error;
    }
  },
}));
