import { z } from 'zod';

export const WeeklyGoalSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  weekStartDate: z.string(), // Fecha de inicio de la semana (lunes) en formato yyyy-MM-dd
  goalAmount: z.number().positive('La meta debe ser positiva'),
  block: z.string().optional(), // Bloque específico para esta meta
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WeeklyGoal = z.infer<typeof WeeklyGoalSchema>;

export const CreateWeeklyGoalSchema = WeeklyGoalSchema.omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWeeklyGoalInput = z.infer<typeof CreateWeeklyGoalSchema>;

export interface WeeklyGoalWithDetails extends WeeklyGoal {
  activityName: string;
  activityUnit: string;
  achieved: number;
  remaining: number;
  percentage: number;
}
