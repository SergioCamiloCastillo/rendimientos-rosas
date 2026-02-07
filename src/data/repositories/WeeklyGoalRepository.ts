import { 
  WeeklyGoal, 
  CreateWeeklyGoalInput, 
  WeeklyGoalSchema,
  WeeklyGoalWithDetails
} from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import { ActivityRepository } from './ActivityRepository';
import { PerformanceRepository } from './PerformanceRepository';
import uuid from 'react-native-uuid';
import { format, endOfWeek } from 'date-fns';

export class WeeklyGoalRepository {
  static async getAll(): Promise<WeeklyGoal[]> {
    const goals = await AsyncStorageAdapter.getItem<WeeklyGoal[]>(STORAGE_KEYS.WEEKLY_GOALS);
    return goals || [];
  }

  static async getActive(): Promise<WeeklyGoal[]> {
    const goals = await this.getAll();
    return goals.filter(g => !g.isDeleted);
  }

  static async getByWeek(weekStartDate: string): Promise<WeeklyGoal[]> {
    const goals = await this.getActive();
    return goals.filter(g => g.weekStartDate === weekStartDate);
  }

  static async getByActivityAndWeek(activityId: string, weekStartDate: string): Promise<WeeklyGoal | null> {
    const goals = await this.getActive();
    return goals.find(g => g.activityId === activityId && g.weekStartDate === weekStartDate) || null;
  }

  static async create(input: CreateWeeklyGoalInput): Promise<WeeklyGoal> {
    const goals = await this.getAll();
    const now = new Date().toISOString();

    // Verificar si ya existe una meta para esta actividad y semana
    const existingIndex = goals.findIndex(
      g => g.activityId === input.activityId && 
           g.weekStartDate === input.weekStartDate &&
           !g.isDeleted
    );

    if (existingIndex !== -1) {
      // Actualizar la meta existente
      const updated: WeeklyGoal = {
        ...goals[existingIndex],
        goalAmount: input.goalAmount,
        updatedAt: now,
      };
      const validated = WeeklyGoalSchema.parse(updated);
      goals[existingIndex] = validated;
      await AsyncStorageAdapter.setItem(STORAGE_KEYS.WEEKLY_GOALS, goals);
      return validated;
    }

    // Crear nueva meta
    const newGoal: WeeklyGoal = {
      ...input,
      id: uuid.v4() as string,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = WeeklyGoalSchema.parse(newGoal);
    goals.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WEEKLY_GOALS, goals);
    return validated;
  }

  static async update(id: string, input: Partial<CreateWeeklyGoalInput>): Promise<WeeklyGoal | null> {
    const goals = await this.getAll();
    const index = goals.findIndex(g => g.id === id);
    
    if (index === -1) return null;

    const updated: WeeklyGoal = {
      ...goals[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const validated = WeeklyGoalSchema.parse(updated);
    goals[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WEEKLY_GOALS, goals);
    return validated;
  }

  static async delete(id: string): Promise<boolean> {
    const goals = await this.getAll();
    const index = goals.findIndex(g => g.id === id);
    
    if (index === -1) return false;

    goals[index] = {
      ...goals[index],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WEEKLY_GOALS, goals);
    return true;
  }

  static async getWithDetails(weekStartDate: string): Promise<WeeklyGoalWithDetails[]> {
    const goals = await this.getByWeek(weekStartDate);
    const activities = await ActivityRepository.getAll();
    const weekEndDate = format(endOfWeek(new Date(weekStartDate + 'T12:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    // Obtener TODOS los registros activos y filtrar manualmente
    const allRecords = await PerformanceRepository.getActive();
    const records = allRecords.filter(r => r.date >= weekStartDate && r.date <= weekEndDate);

    return goals.map(goal => {
      const activity = activities.find(a => a.id === goal.activityId);
      const activityRecords = records.filter(r => r.activityId === goal.activityId);
      const achieved = activityRecords.reduce((sum, r) => sum + r.achievedPerformance, 0);
      const remaining = Math.max(0, goal.goalAmount - achieved);
      const percentage = goal.goalAmount > 0 ? Math.round((achieved / goal.goalAmount) * 100) : 0;

      return {
        ...goal,
        activityName: activity?.name || 'Actividad eliminada',
        activityUnit: activity?.unit || '',
        achieved,
        remaining,
        percentage,
      };
    });
  }
}
