import { 
  PerformanceRecord, 
  CreatePerformanceRecordInput, 
  PerformanceRecordSchema,
  PerformanceRecordWithDetails,
  WorkShift
} from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import { WorkerRepository } from './WorkerRepository';
import { ActivityRepository } from './ActivityRepository';
import uuid from 'react-native-uuid';

export interface PerformanceFilters {
  workerId?: string;
  activityId?: string;
  startDate?: string;
  endDate?: string;
  metGoal?: boolean;
}

export class PerformanceRepository {
  static async getAll(): Promise<PerformanceRecord[]> {
    const records = await AsyncStorageAdapter.getItem<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE_RECORDS);
    return records || [];
  }

  static async getActive(): Promise<PerformanceRecord[]> {
    const records = await this.getAll();
    return records.filter(r => !r.isDeleted);
  }

  static async getById(id: string): Promise<PerformanceRecord | null> {
    const records = await this.getAll();
    return records.find(r => r.id === id) || null;
  }

  static async create(input: CreatePerformanceRecordInput): Promise<PerformanceRecord> {
    const records = await this.getAll();
    const now = new Date().toISOString();
    
    // Buscar si ya existe un registro para el mismo trabajador, actividad y fecha
    const existingIndex = records.findIndex(
      r => r.workerId === input.workerId && 
           r.activityId === input.activityId && 
           r.date === input.date &&
           !r.isDeleted
    );

    if (existingIndex !== -1) {
      // Agregar el turno al registro existente
      const existing = records[existingIndex];
      const newShifts: WorkShift[] = [...(existing.shifts || []), ...(input.shifts || [])];
      const totalAchieved = newShifts.reduce((sum, s) => sum + s.achievedPerformance, 0);
      const totalHours = (existing.totalHours || 0) + (input.totalHours || 0);
      
      // Calcular si cumplió la meta basado en rendimiento por hora
      // Meta = expectedPerformance * totalHours
      const expectedTotal = input.expectedPerformance * totalHours;
      const metGoal = totalAchieved >= expectedTotal;

      const updated: PerformanceRecord = {
        ...existing,
        shifts: newShifts,
        achievedPerformance: totalAchieved,
        totalHours,
        metGoal,
        updatedAt: now,
      };

      const validated = PerformanceRecordSchema.parse(updated);
      records[existingIndex] = validated;
      await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
      
      return validated;
    }

    // Crear nuevo registro
    const totalHours = input.totalHours || 0;
    const expectedTotal = input.expectedPerformance * totalHours;
    const metGoal = input.achievedPerformance >= expectedTotal;
    
    const newRecord: PerformanceRecord = {
      ...input,
      id: uuid.v4() as string,
      shifts: input.shifts || [],
      totalHours: input.totalHours || 0,
      metGoal,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = PerformanceRecordSchema.parse(newRecord);
    records.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
    
    return validated;
  }

  static async update(id: string, input: Partial<CreatePerformanceRecordInput>): Promise<PerformanceRecord | null> {
    const records = await this.getAll();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return null;

    const achievedPerformance = input.achievedPerformance ?? records[index].achievedPerformance;
    const expectedPerformance = input.expectedPerformance ?? records[index].expectedPerformance;
    const metGoal = achievedPerformance >= expectedPerformance;

    const updated: PerformanceRecord = {
      ...records[index],
      ...input,
      metGoal,
      updatedAt: new Date().toISOString(),
    };

    const validated = PerformanceRecordSchema.parse(updated);
    records[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
    
    return validated;
  }

  static async softDelete(id: string): Promise<boolean> {
    const records = await this.getAll();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return false;

    records[index] = {
      ...records[index],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
    return true;
  }

  static async permanentDelete(id: string): Promise<boolean> {
    const records = await this.getAll();
    const filtered = records.filter(r => r.id !== id);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, filtered);
    return true;
  }

  static async getFiltered(filters: PerformanceFilters): Promise<PerformanceRecord[]> {
    let records = await this.getActive();

    if (filters.workerId) {
      records = records.filter(r => r.workerId === filters.workerId);
    }

    if (filters.activityId) {
      records = records.filter(r => r.activityId === filters.activityId);
    }

    if (filters.startDate) {
      records = records.filter(r => r.date >= filters.startDate!);
    }

    if (filters.endDate) {
      records = records.filter(r => r.date <= filters.endDate!);
    }

    if (filters.metGoal !== undefined) {
      records = records.filter(r => r.metGoal === filters.metGoal);
    }

    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getWithDetails(filters?: PerformanceFilters): Promise<PerformanceRecordWithDetails[]> {
    const records = filters ? await this.getFiltered(filters) : await this.getActive();
    const workers = await WorkerRepository.getAll();
    const activities = await ActivityRepository.getAll();

    return records.map(record => {
      const worker = workers.find(w => w.id === record.workerId);
      const activity = activities.find(a => a.id === record.activityId);

      return {
        ...record,
        workerName: worker?.name || 'Trabajador eliminado',
        activityName: activity?.name || 'Actividad eliminada',
        activityUnit: activity?.unit || '',
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getByWorkerAndDate(workerId: string, date: string): Promise<PerformanceRecord[]> {
    const records = await this.getActive();
    return records.filter(r => r.workerId === workerId && r.date === date);
  }

  static async getTodayRecords(): Promise<PerformanceRecordWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getWithDetails({ startDate: today, endDate: today });
  }

  static async getStats(filters?: PerformanceFilters): Promise<{
    total: number;
    metGoal: number;
    notMetGoal: number;
    percentage: number;
  }> {
    const records = filters ? await this.getFiltered(filters) : await this.getActive();
    const total = records.length;
    const metGoal = records.filter(r => r.metGoal).length;
    const notMetGoal = total - metGoal;
    const percentage = total > 0 ? Math.round((metGoal / total) * 100) : 0;

    return { total, metGoal, notMetGoal, percentage };
  }
}
