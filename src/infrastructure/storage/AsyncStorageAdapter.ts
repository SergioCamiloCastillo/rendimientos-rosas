import AsyncStorage from '@react-native-async-storage/async-storage';

export class AsyncStorageAdapter {
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}

export const STORAGE_KEYS = {
  WORKERS: '@rendimientos/workers',
  ACTIVITIES: '@rendimientos/activities',
  PERFORMANCE_RECORDS: '@rendimientos/performance_records',
  ABSENCES: '@rendimientos/absences',
  WEEKLY_GOALS: '@rendimientos/weekly_goals',
  BLOCKS: '@rendimientos/blocks',
} as const;
