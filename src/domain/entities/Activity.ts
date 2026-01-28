import { z } from 'zod';

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  unit: z.string().min(1, 'La unidad es requerida'), // camas, tallos/hora, etc.
  expectedPerformance: z.number().positive('El rendimiento esperado debe ser positivo'),
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
