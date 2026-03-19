import { z } from 'zod';

export const PerformanceHistoryEntrySchema = z.object({
  weekStart: z.string(), // formato 'yyyy-MM-dd' (lunes de la semana)
  previousPerformance: z.number().positive().optional(), // meta anterior
  expectedPerformance: z.number().positive(),
  changedAt: z.string().datetime(),
});

export type PerformanceHistoryEntry = z.infer<typeof PerformanceHistoryEntrySchema>;

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  unit: z.string().min(1, 'La unidad es requerida'), // camas, tallos/hora, etc.
  expectedPerformance: z.number().positive('El rendimiento esperado debe ser positivo'),
  performanceHistory: z.array(PerformanceHistoryEntrySchema).optional(), // historial de cambios de meta por semana
  weeklyGoal: z.number().nonnegative().optional(), // Meta semanal para esta actividad
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Activity = z.infer<typeof ActivitySchema>;

export const CreateActivitySchema = ActivitySchema.omit({
  id: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;
