import { Upload, type IUpload } from "./upload.model.js";
import { toObjectId } from "@/shared/validators/index.js";

export class UploadRepository {
  async create(data: Partial<IUpload>): Promise<IUpload> {
    const upload = new Upload(data);
    return upload.save();
  }

  async findById(id: string): Promise<IUpload | null> {
    return Upload.findById(toObjectId(id));
  }

  async findByActor(actorId: string): Promise<IUpload[]> {
    return Upload.find({ actorId: toObjectId(actorId) }).sort({ createdAt: -1 }).limit(100);
  }

  async update(id: string, data: Partial<IUpload>): Promise<IUpload | null> {
    return Upload.findByIdAndUpdate(toObjectId(id), data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const res = await Upload.findByIdAndDelete(toObjectId(id));
    return !!res;
  }

  updateStatus(id: string, status: IUpload["status"]) {
    return Upload.findByIdAndUpdate(toObjectId(id), { status }, { new: true });
  }
}
