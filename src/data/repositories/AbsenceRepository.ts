import { Absence, CreateAbsenceInput, AbsenceSchema } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import uuid from 'react-native-uuid';

export class AbsenceRepository {
  static async getAll(): Promise<Absence[]> {
    const absences = await AsyncStorageAdapter.getItem<Absence[]>(STORAGE_KEYS.ABSENCES);
    return absences || [];
  }

  static async getByDate(date: string): Promise<Absence | null> {
    const absences = await this.getAll();
    return absences.find(a => a.date === date) || null;
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Absence[]> {
    const absences = await this.getAll();
    return absences
      .filter(a => a.date >= startDate && a.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static async createOrUpdate(input: CreateAbsenceInput): Promise<Absence> {
    const absences = await this.getAll();
    const now = new Date().toISOString();
    
    const existingIndex = absences.findIndex(a => a.date === input.date);
    
    if (existingIndex !== -1) {
      const updated: Absence = {
        ...absences[existingIndex],
        entries: input.entries || [],
        peopleCount: input.peopleCount,
        hoursPerPerson: input.hoursPerPerson,
        hoursLost: input.hoursLost,
        updatedAt: now,
      };
      const validated = AbsenceSchema.parse(updated);
      absences[existingIndex] = validated;
      await AsyncStorageAdapter.setItem(STORAGE_KEYS.ABSENCES, absences);
      return validated;
    }
    
    const newAbsence: Absence = {
      ...input,
      id: uuid.v4() as string,
      createdAt: now,
      updatedAt: now,
    };

    const validated = AbsenceSchema.parse(newAbsence);
    absences.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ABSENCES, absences);
    
    return validated;
  }

  static async delete(id: string): Promise<boolean> {
    const absences = await this.getAll();
    const index = absences.findIndex(a => a.id === id);
    
    if (index === -1) return false;

    absences.splice(index, 1);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ABSENCES, absences);
    return true;
  }
}
