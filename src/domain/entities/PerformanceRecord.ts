import { z } from 'zod';

export const PerformanceRecordSchema = z.object({
  id: z.string().uuid(),
  workerId: z.string().uuid(),
  activityId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  achievedPerformance: z.number().nonnegative('El rendimiento debe ser positivo o cero'),
  expectedPerformance: z.number().positive(),
  metGoal: z.boolean(),
  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PerformanceRecord = z.infer<typeof PerformanceRecordSchema>;

export const CreatePerformanceRecordSchema = PerformanceRecordSchema.omit({
  id: true,
  metGoal: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePerformanceRecordInput = z.infer<typeof CreatePerformanceRecordSchema>;

export interface PerformanceRecordWithDetails extends PerformanceRecord {
  workerName: string;
  activityName: string;
  activityUnit: string;
}
