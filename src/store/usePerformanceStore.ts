import { create } from 'zustand';
import { PerformanceRecord, CreatePerformanceRecordInput, PerformanceRecordWithDetails } from '../domain/entities';
import { PerformanceRepository, PerformanceFilters } from '../data/repositories';

interface PerformanceState {
  records: PerformanceRecordWithDetails[];
  todayRecords: PerformanceRecordWithDetails[];
  selectedDateRecords: PerformanceRecordWithDetails[];
  selectedDate: Date;
  stats: {
    total: number;
    metGoal: number;
    notMetGoal: number;
    percentage: number;
  };
  filters: PerformanceFilters;
  isLoading: boolean;
  error: string | null;
  
  fetchRecords: () => Promise<void>;
  fetchTodayRecords: () => Promise<void>;
  fetchRecordsByDate: (date: Date) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchStatsByDate: (date: Date) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  addRecord: (input: CreatePerformanceRecordInput) => Promise<PerformanceRecord>;
  updateRecord: (id: string, input: Partial<CreatePerformanceRecordInput>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  setFilters: (filters: PerformanceFilters) => void;
  clearFilters: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  records: [],
  todayRecords: [],
  selectedDateRecords: [],
  selectedDate: new Date(),
  stats: {
    total: 0,
    metGoal: 0,
    notMetGoal: 0,
    percentage: 0,
  },
  filters: {},
  isLoading: false,
  error: null,

  fetchRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const records = await PerformanceRepository.getWithDetails(filters);
      set({ records, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar registros', isLoading: false });
    }
  },

  fetchTodayRecords: async () => {
    try {
      const todayRecords = await PerformanceRepository.getTodayRecords();
      set({ todayRecords });
    } catch (error) {
      set({ error: 'Error al cargar registros de hoy' });
    }
  },

  fetchRecordsByDate: async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const selectedDateRecords = await PerformanceRepository.getWithDetails({
        startDate: dateString,
        endDate: dateString,
      });
      set({ selectedDateRecords });
    } catch (error) {
      set({ error: 'Error al cargar registros de la fecha' });
    }
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    get().fetchRecordsByDate(date);
    get().fetchStatsByDate(date);
  },

  fetchStats: async () => {
    try {
      const { filters } = get();
      const stats = await PerformanceRepository.getStats(filters);
      set({ stats });
    } catch (error) {
      set({ error: 'Error al cargar estadísticas' });
    }
  },

  fetchStatsByDate: async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const stats = await PerformanceRepository.getStats({
        startDate: dateString,
        endDate: dateString,
      });
      set({ stats });
    } catch (error) {
      set({ error: 'Error al cargar estadísticas' });
    }
  },

  addRecord: async (input: CreatePerformanceRecordInput) => {
    set({ isLoading: true, error: null });
    try {
      const record = await PerformanceRepository.create(input);
      await get().fetchRecords();
      await get().fetchTodayRecords();
      await get().fetchStats();
      set({ isLoading: false });
      return record;
    } catch (error) {
      set({ error: 'Error al crear registro', isLoading: false });
      throw error;
    }
  },

  updateRecord: async (id: string, input: Partial<CreatePerformanceRecordInput>) => {
    set({ isLoading: true, error: null });
    try {
      await PerformanceRepository.update(id, input);
      await get().fetchRecords();
      await get().fetchTodayRecords();
      await get().fetchStats();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al actualizar registro', isLoading: false });
      throw error;
    }
  },

  deleteRecord: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await PerformanceRepository.softDelete(id);
      await get().fetchRecords();
      await get().fetchTodayRecords();
      await get().fetchStats();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al eliminar registro', isLoading: false });
      throw error;
    }
  },

  setFilters: (filters: PerformanceFilters) => {
    set({ filters });
    get().fetchRecords();
    get().fetchStats();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchRecords();
    get().fetchStats();
  },
}));
