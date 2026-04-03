import { z } from 'zod';

// Esquema para una entrada individual de ausencia
export const AbsenceEntrySchema = z.object({
  peopleCount: z.number().int().min(1, 'Debe ser al menos 1'),
  hoursPerPerson: z.number().min(0.5, 'Debe ser al menos 0.5'),
});

export type AbsenceEntry = z.infer<typeof AbsenceEntrySchema>;

export const AbsenceSchema = z.object({
  id: z.string().uuid(),
  date: z.string(), // formato YYYY-MM-DD
  entries: z.array(AbsenceEntrySchema).optional().default([]), // entradas individuales
  peopleCount: z.number().int().min(0, 'Debe ser 0 o más'), // total de personas
  hoursPerPerson: z.number().min(0, 'Debe ser 0 o más'), // promedio (para compatibilidad)
  hoursLost: z.number().min(0, 'Debe ser 0 o más'), // total horas perdidas
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
