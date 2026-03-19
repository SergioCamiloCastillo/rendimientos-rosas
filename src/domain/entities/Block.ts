import { z } from 'zod';

export const BlockSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido').regex(/^\d+$/, 'El nombre debe ser numérico'),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Block = z.infer<typeof BlockSchema>;

export const CreateBlockSchema = BlockSchema.omit({
  id: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateBlockInput = z.infer<typeof CreateBlockSchema>;
