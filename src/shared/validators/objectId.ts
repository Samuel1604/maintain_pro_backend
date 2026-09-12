import { Types } from "mongoose";
import { z } from "zod";

export function toObjectId(id: string | Types.ObjectId): Types.ObjectId;
export function toObjectId(id?: string | Types.ObjectId | null): Types.ObjectId | undefined;
export function toObjectId(id?: string | Types.ObjectId | null): Types.ObjectId | undefined {
  if (!id) return undefined;
  if (id instanceof Types.ObjectId) return id;
  if (!Types.ObjectId.isValid(id)) return undefined;
  return new Types.ObjectId(id);
}

export const isSameObjectId = (
  left?: Types.ObjectId | string,
  right?: Types.ObjectId | string,
): boolean => {
  if (!left || !right) return false;

  return left.toString() === right.toString();
};

export const isValidObjectId = (id: string): boolean =>
  Types.ObjectId.isValid(id);

export const objectIdSchema = z.string().trim().refine(Types.ObjectId.isValid, {
  message: "Invalid ObjectId",
});

export const toObjectIdString = (
  id?: Types.ObjectId | string | null,
): string | undefined => {
  if (!id) return undefined;

  return id.toString();
};
