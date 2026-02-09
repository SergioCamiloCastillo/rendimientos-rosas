import { z } from 'zod';

export const AbsenceSchema = z.object({
  id: z.string().uuid(),
  date: z.string(), // formato YYYY-MM-DD
  peopleCount: z.number().int().min(0, 'Debe ser 0 o más'),
  hoursPerPerson: z.number().min(0, 'Debe ser 0 o más'),
  hoursLost: z.number().min(0, 'Debe ser 0 o más'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Absence = z.infer<typeof AbsenceSchema>;

export const CreateAbsenceSchema = AbsenceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAbsenceInput = z.infer<typeof CreateAbsenceSchema>;
