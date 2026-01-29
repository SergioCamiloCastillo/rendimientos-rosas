import { Activity, CreateActivityInput, ActivitySchema, PerformanceRecord } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import uuid from 'react-native-uuid';

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

  static async update(id: string, input: Partial<CreateActivityInput>): Promise<Activity | null> {
    const activities = await this.getAll();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) return null;

    const updated: Activity = {
      ...activities[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const validated = ActivitySchema.parse(updated);
    activities[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    
    // Si cambió el expectedPerformance, actualizar todos los registros existentes
    if (input.expectedPerformance !== undefined) {
      await this.updateRecordsWithNewExpectedPerformance(id, input.expectedPerformance);
    }
    
    return validated;
  }

  static async updateRecordsWithNewExpectedPerformance(activityId: string, newExpectedPerformance: number): Promise<void> {
    const records = await AsyncStorageAdapter.getItem<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE_RECORDS);
    if (!records) return;

    let updated = false;
    const now = new Date().toISOString();

    for (let i = 0; i < records.length; i++) {
      if (records[i].activityId === activityId && !records[i].isDeleted) {
        const record = records[i];
        const totalHours = record.totalHours || 0;
        
        // Calcular nuevo metGoal
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
