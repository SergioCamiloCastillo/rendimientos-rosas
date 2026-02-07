import { Absence, CreateAbsenceInput, AbsenceSchema, AbsenceWithWorker } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import { WorkerRepository } from './WorkerRepository';
import uuid from 'react-native-uuid';

export class AbsenceRepository {
  static async getAll(): Promise<Absence[]> {
    const absences = await AsyncStorageAdapter.getItem<Absence[]>(STORAGE_KEYS.ABSENCES);
    return absences || [];
  }

  static async getByDate(date: string): Promise<AbsenceWithWorker[]> {
    const absences = await this.getAll();
    const workers = await WorkerRepository.getAll();
    
    return absences
      .filter(a => a.date === date)
      .map(absence => {
        const worker = workers.find(w => w.id === absence.workerId);
        return {
          ...absence,
          workerName: worker?.name || 'Desconocido',
          workerCode: worker?.code || '',
        };
      })
      .sort((a, b) => a.workerName.localeCompare(b.workerName));
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<AbsenceWithWorker[]> {
    const absences = await this.getAll();
    const workers = await WorkerRepository.getAll();
    
    return absences
      .filter(a => a.date >= startDate && a.date <= endDate)
      .map(absence => {
        const worker = workers.find(w => w.id === absence.workerId);
        return {
          ...absence,
          workerName: worker?.name || 'Desconocido',
          workerCode: worker?.code || '',
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.workerName.localeCompare(b.workerName);
      });
  }

  static async getByWorker(workerId: string): Promise<Absence[]> {
    const absences = await this.getAll();
    return absences.filter(a => a.workerId === workerId);
  }

  static async create(input: CreateAbsenceInput): Promise<Absence> {
    const absences = await this.getAll();
    const now = new Date().toISOString();
    
    // Verificar si ya existe una ausencia para este trabajador en esta fecha
    const exists = absences.some(
      a => a.workerId === input.workerId && a.date === input.date
    );
    
    if (exists) {
      throw new Error('Ya existe una ausencia registrada para este trabajador en esta fecha');
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

  static async update(id: string, input: Partial<CreateAbsenceInput>): Promise<Absence | null> {
    const absences = await this.getAll();
    const index = absences.findIndex(a => a.id === id);
    
    if (index === -1) return null;

    const updated: Absence = {
      ...absences[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const validated = AbsenceSchema.parse(updated);
    absences[index] = validated;
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

  static async getCountByDate(date: string): Promise<number> {
    const absences = await this.getAll();
    return absences.filter(a => a.date === date).length;
  }
}
