import { Activity, CreateActivityInput, ActivitySchema, PerformanceRecord, PerformanceHistoryEntry } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import uuid from 'react-native-uuid';
import { format, startOfWeek } from 'date-fns';

export class ActivityRepository {
  static async getAll(): Promise<Activity[]> {
    const activities = await AsyncStorageAdapter.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES);
    return activities || [];
  }

  static async getActive(): Promise<Activity[]> {
    const activities = await this.getAll();
    return activities.filter(a => a.isActive && !a.isDeleted);
  }

  static async getById(id: string): Promise<Activity | null> {
    const activities = await this.getAll();
    return activities.find(a => a.id === id) || null;
  }

  static async create(input: CreateActivityInput): Promise<Activity> {
    const activities = await this.getAll();
    const now = new Date().toISOString();
    
    const newActivity: Activity = {
      ...input,
      id: uuid.v4() as string,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = ActivitySchema.parse(newActivity);
    activities.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    
    return validated;
  }

  static getCurrentWeekStart(): string {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }

  /**
   * Obtiene la meta de rendimiento que aplica para una semana específica.
   * Busca en el historial la entrada más reciente que sea <= weekStart.
   * Si no hay historial, retorna el expectedPerformance actual.
   */
  static getPerformanceForWeek(activity: Activity, weekStart: string): number {
    const history = activity.performanceHistory;
    if (!history || history.length === 0) return activity.expectedPerformance;

    // Ordenar por weekStart descendente para encontrar la más reciente <= weekStart
    const sorted = [...history].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const entry = sorted.find(e => e.weekStart <= weekStart);
    return entry ? entry.expectedPerformance : activity.expectedPerformance;
  }

  /**
   * Verifica si ya se cambió la meta esta semana para esta actividad.
   */
  static wasPerformanceChangedThisWeek(activity: Activity): boolean {
    const currentWeek = this.getCurrentWeekStart();
    const history = (activity.performanceHistory || []).filter(e => e.previousPerformance != null);
    return history.some(e => e.weekStart === currentWeek);
  }

  static async update(id: string, input: Partial<CreateActivityInput>): Promise<Activity | null> {
    const activities = await this.getAll();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) return null;

    const current = activities[index];
    const now = new Date().toISOString();
    const currentWeek = this.getCurrentWeekStart();

    // Si cambió el expectedPerformance, manejar el historial
    // Primero limpiar entradas viejas sin previousPerformance (datos de versión anterior)
    let performanceHistory = (current.performanceHistory || []).filter(e => e.previousPerformance != null);
    if (input.expectedPerformance !== undefined && input.expectedPerformance !== current.expectedPerformance) {
      // Verificar si ya se cambió esta semana (solo contar entradas válidas)
      const alreadyChanged = performanceHistory.some(e => e.weekStart === currentWeek);
      if (alreadyChanged) {
        throw new Error('La meta ya fue modificada esta semana. Solo se permite un cambio por semana.');
      }

      // Agregar entrada al historial con meta anterior
      performanceHistory = [
        ...performanceHistory,
        {
          weekStart: currentWeek,
          previousPerformance: current.expectedPerformance,
          expectedPerformance: input.expectedPerformance,
          changedAt: now,
        },
      ];
    }

    const updated: Activity = {
      ...current,
      ...input,
      performanceHistory,
      updatedAt: now,
    };

    const validated = ActivitySchema.parse(updated);
    activities[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    
    // Si cambió el expectedPerformance, solo actualizar registros de la semana actual en adelante
    if (input.expectedPerformance !== undefined && input.expectedPerformance !== current.expectedPerformance) {
      await this.updateCurrentWeekRecords(id, input.expectedPerformance, currentWeek);
    }
    
    return validated;
  }

  /**
   * Solo actualiza registros de la semana actual en adelante (no retroactivo).
   */
  static async updateCurrentWeekRecords(activityId: string, newExpectedPerformance: number, weekStart: string): Promise<void> {
    const records = await AsyncStorageAdapter.getItem<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE_RECORDS);
    if (!records) return;

    let updated = false;
    const now = new Date().toISOString();

    for (let i = 0; i < records.length; i++) {
      if (records[i].activityId === activityId && !records[i].isDeleted && records[i].date >= weekStart) {
        const record = records[i];
        const totalHours = record.totalHours || 0;
        
        const expectedTotal = totalHours > 0 
          ? newExpectedPerformance * totalHours 
          : newExpectedPerformance;
        const metGoal = record.achievedPerformance >= expectedTotal;

        records[i] = {
          ...record,
          expectedPerformance: newExpectedPerformance,
          metGoal,
          updatedAt: now,
        };
        updated = true;
      }
    }

    if (updated) {
      await AsyncStorageAdapter.setItem(STORAGE_KEYS.PERFORMANCE_RECORDS, records);
    }
  }

  static async softDelete(id: string): Promise<boolean> {
    const activities = await this.getAll();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) return false;

    activities[index] = {
      ...activities[index],
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    return true;
  }

  static async permanentDelete(id: string): Promise<boolean> {
    const activities = await this.getAll();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) return false;

    activities[index] = {
      ...activities[index],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    return true;
  }

  static async restore(id: string): Promise<boolean> {
    const activities = await this.getAll();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) return false;

    activities[index] = {
      ...activities[index],
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    return true;
  }

  static async getInactive(): Promise<Activity[]> {
    const activities = await this.getAll();
    return activities.filter(a => !a.isActive && !a.isDeleted);
  }
}
