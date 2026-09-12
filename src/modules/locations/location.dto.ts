import { z } from 'zod'

export const LocationTypeEnum = z.enum(['BUILDING', 'FLOOR', 'AREA', 'ROOM', 'ZONE', 'OTHER'])

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  description: z.string().optional(),
  type: LocationTypeEnum,
  facilityId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: 'Invalid Facility ID format',
  }),
  parentId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: 'Invalid Parent ID format',
  }).optional().nullable(),
})

export const updateLocationSchema = createLocationSchema.partial()

export type CreateLocationDto = z.infer<typeof createLocationSchema>
export type UpdateLocationDto = z.infer<typeof updateLocationSchema>