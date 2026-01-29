import { z } from 'zod';

export const WorkerSchema = z.object({
  id: z.string().uuid(),
  code: z.string().default(''),
  name: z.string().min(1, 'El nombre es requerido'),
  identification: z.string().optional().default(''),
  position: z.string().optional(),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Worker = z.infer<typeof WorkerSchema>;

export const CreateWorkerSchema = WorkerSchema.omit({
  id: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWorkerInput = z.infer<typeof CreateWorkerSchema>;
