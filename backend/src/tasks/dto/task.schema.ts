import { z } from 'zod';

const title = z.string().trim().min(1, 'Title is required').max(200);
const description = z.string().trim().max(5000).nullish().transform((value) => value || null);

export const createTaskSchema = z.object({
  title,
  description: description.optional(),
  completed: z.boolean().optional()
});

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    completed: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
