import { Schema, model, Document, Types } from "mongoose";

export interface ILocation extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId

  site: string;
  building: string;
  floor: string;
  room: string;
}

const locationSchema = new Schema<ILocation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true
    },

    site: {
      type: String,
      required: true,
    },

    building: {
      type: String,
      required: true,
    },

    floor: {
      type: String,
    },

    room: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Location = model<ILocation>("Location", locationSchema);
