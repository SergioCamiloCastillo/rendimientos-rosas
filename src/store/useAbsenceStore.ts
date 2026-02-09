import { create } from 'zustand';
import { Absence, CreateAbsenceInput } from '../domain/entities';
import { AbsenceRepository } from '../data/repositories';
import { format } from 'date-fns';

interface AbsenceState {
  absence: Absence | null;
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;
  
  setSelectedDate: (date: Date) => void;
  fetchAbsenceByDate: (date: Date) => Promise<void>;
  saveAbsence: (input: CreateAbsenceInput) => Promise<void>;
  deleteAbsence: () => Promise<void>;
}

export const useAbsenceStore = create<AbsenceState>((set, get) => ({
  absence: null,
  selectedDate: new Date(),
  isLoading: false,
  error: null,

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    get().fetchAbsenceByDate(date);
  },

  fetchAbsenceByDate: async (date: Date) => {
    set({ isLoading: true, error: null });
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const absence = await AbsenceRepository.getByDate(dateStr);
      set({ absence, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveAbsence: async (input: CreateAbsenceInput) => {
    set({ isLoading: true, error: null });
    try {
      await AbsenceRepository.createOrUpdate(input);
      const { selectedDate } = get();
      await get().fetchAbsenceByDate(selectedDate);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteAbsence: async () => {
    const { absence, selectedDate } = get();
    if (!absence) return;
    set({ isLoading: true, error: null });
    try {
      await AbsenceRepository.delete(absence.id);
      await get().fetchAbsenceByDate(selectedDate);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
