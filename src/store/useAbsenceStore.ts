import { create } from 'zustand';
import { AbsenceWithWorker, CreateAbsenceInput } from '../domain/entities';
import { AbsenceRepository } from '../data/repositories';

interface AbsenceState {
  absences: AbsenceWithWorker[];
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;
  
  setSelectedDate: (date: Date) => void;
  fetchAbsencesByDate: (date: Date) => Promise<void>;
  addAbsence: (input: CreateAbsenceInput) => Promise<void>;
  deleteAbsence: (id: string) => Promise<void>;
}

export const useAbsenceStore = create<AbsenceState>((set, get) => ({
  absences: [],
  selectedDate: new Date(),
  isLoading: false,
  error: null,

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    get().fetchAbsencesByDate(date);
  },

  fetchAbsencesByDate: async (date: Date) => {
    set({ isLoading: true, error: null });
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const absences = await AbsenceRepository.getByDate(dateStr);
      set({ absences, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addAbsence: async (input: CreateAbsenceInput) => {
    set({ isLoading: true, error: null });
    try {
      await AbsenceRepository.create(input);
      const { selectedDate } = get();
      await get().fetchAbsencesByDate(selectedDate);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteAbsence: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await AbsenceRepository.delete(id);
      const { selectedDate } = get();
      await get().fetchAbsencesByDate(selectedDate);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
