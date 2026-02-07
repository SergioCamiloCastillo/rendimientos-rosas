import { z } from 'zod';

// Esquema para un turno de trabajo (hora inicio - hora fin)
export const WorkShiftSchema = z.object({
  startTime: z.string(), // HH:mm formato 24h
  endTime: z.string(), // HH:mm formato 24h
  block: z.string().optional(), // Bloque donde se realizó el turno
  achievedPerformance: z.number().nonnegative('El rendimiento debe ser positivo o cero'),
});

export type WorkShift = z.infer<typeof WorkShiftSchema>;

export const PerformanceRecordSchema = z.object({
  id: z.string().uuid(),
  workerId: z.string().uuid(),
  activityId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  block: z.string().optional(), // Bloque donde se realizó el trabajo
  shifts: z.array(WorkShiftSchema).default([]), // Turnos de trabajo
  achievedPerformance: z.number().nonnegative('El rendimiento debe ser positivo o cero'), // Total del día
  expectedPerformance: z.number().positive(), // Meta por hora de la actividad
  totalHours: z.number().nonnegative().default(0), // Total de horas trabajadas
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
}).extend({
  shifts: z.array(WorkShiftSchema).optional().default([]),
  totalHours: z.number().nonnegative().optional().default(0),
});

export type CreatePerformanceRecordInput = z.infer<typeof CreatePerformanceRecordSchema>;

export interface PerformanceRecordWithDetails extends PerformanceRecord {
  workerName: string;
  workerCode: string;
  activityName: string;
  activityUnit: string;
}
