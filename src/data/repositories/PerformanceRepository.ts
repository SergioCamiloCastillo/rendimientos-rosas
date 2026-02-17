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
  block?: string;
  metGoal?: boolean;
}

export class PerformanceRepository {
  static async getAll(): Promise<PerformanceRecord[]> {
    const records = await AsyncStorageAdapter.getItem<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE_RECORDS);
    return records || [];
  }

  static async recalculateAllMetGoals(): Promise<void> {
    const records = await this.getAll();
    const activities = await ActivityRepository.getAll();
    const today = new Date().toISOString().split('T')[0];
    let updated = false;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Calcular totalHours desde los turnos si no existe o es 0
      let totalHours = record.totalHours || 0;
      if (totalHours === 0 && record.shifts && record.shifts.length > 0) {
        totalHours = record.shifts.reduce((sum, shift) => {
          const [startH, startM] = shift.startTime.split(':').map(Number);
          const [endH, endM] = shift.endTime.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          return sum + (endMinutes - startMinutes) / 60;
        }, 0);
      }
      
      // Si es hoy, actualizar expectedPerformance con el valor actual de la actividad
      let expectedPerformance = record.expectedPerformance;
      if (record.date === today && !record.isDeleted) {
        const activity = activities.find(a => a.id === record.activityId);
        if (activity && activity.expectedPerformance !== record.expectedPerformance) {
          expectedPerformance = activity.expectedPerformance;
        }
      }
      
      // Calcular metGoal correctamente basado en horas
      const expectedTotal = totalHours > 0 
        ? expectedPerformance * totalHours 
        : expectedPerformance;
      
      const correctMetGoal = record.achievedPerformance >= expectedTotal;
      
      // Actualizar si algo cambió
      if (record.metGoal !== correctMetGoal || record.totalHours !== totalHours || record.expectedPerformance !== expectedPerformance) {
        records[i] = {
          ...record,
          expectedPerformance,
          totalHours,
          metGoal: correctMetGoal,
          updatedAt: new Date().toISOString(),
        };
        updated = true;
      }
    }

    if (updated) {
      await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
    }
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
        expectedPerformance: input.expectedPerformance,
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
    const totalHours = input.totalHours ?? records[index].totalHours ?? 0;
    
    // Calcular metGoal basado en horas trabajadas
    // Si tiene horas: meta = expectedPerformance * totalHours
    // Si no tiene horas (registros antiguos): meta = expectedPerformance
    const expectedTotal = totalHours > 0 ? expectedPerformance * totalHours : expectedPerformance;
    const metGoal = achievedPerformance >= expectedTotal;

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

    if (filters.block) {
      const blockFilter = filters.block.toLowerCase().trim();
      records = records.filter(r => {
        // Buscar en el bloque del registro (registros antiguos)
        if (r.block && r.block.toLowerCase().trim().includes(blockFilter)) {
          return true;
        }
        // Buscar en los bloques de los turnos (registros nuevos)
        if (r.shifts && r.shifts.length > 0) {
          for (const s of r.shifts) {
            if (s.block && s.block.toLowerCase().trim().includes(blockFilter)) {
              return true;
            }
          }
        }
        return false;
      });
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
        workerCode: worker?.code || '',
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
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
    
    // Calcular metGoal y porcentaje promedio
    let totalPercentage = 0;
    let metGoalCount = 0;
    
    for (const r of records) {
      const totalHoursRaw = r.totalHours || 0;
      const totalHours = Math.round(totalHoursRaw * 100) / 100;
      const expectedTotal = totalHours > 0 
        ? r.expectedPerformance * totalHours
        : r.expectedPerformance;
      const recordPercentage = expectedTotal > 0 
        ? (r.achievedPerformance / expectedTotal) * 100 
        : 0;
      
      totalPercentage += recordPercentage;
      if (recordPercentage >= 100) {
        metGoalCount++;
      }
    }
    
    const notMetGoal = total - metGoalCount;
    const percentage = total > 0 ? Math.round(totalPercentage / total) : 0;

    return { total, metGoal: metGoalCount, notMetGoal, percentage };
  }
}
