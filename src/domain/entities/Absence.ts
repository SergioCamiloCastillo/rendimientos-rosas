import { z } from 'zod';

export const AbsenceSchema = z.object({
  id: z.string().uuid(),
  workerId: z.string().uuid(),
  date: z.string(), // formato YYYY-MM-DD
  reason: z.string().optional().default(''),
  type: z.enum(['falta', 'permiso', 'incapacidad', 'otro']).default('falta'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Absence = z.infer<typeof AbsenceSchema>;

export interface AbsenceWithWorker extends Absence {
  workerName: string;
  workerCode: string;
}

export const CreateAbsenceSchema = AbsenceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAbsenceInput = z.infer<typeof CreateAbsenceSchema>;
