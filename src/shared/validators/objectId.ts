import { Types } from "mongoose";
import { z } from "zod";


export const toObjectId = (id: string) => new Types.ObjectId(id);

export const sameId = (
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
