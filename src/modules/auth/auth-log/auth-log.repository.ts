import { AuthLogModel } from "./auth-log.model.js";
import type { CreateAuthLogDto } from "./auth-log.types.js";

export class AuthLogRepository {
  async create(data: CreateAuthLogDto) {
    return AuthLogModel.create(data);
  }

  async findByUser(userId: string) {
    return AuthLogModel.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findRecentFailures(email: string, limit = 10) {
    return AuthLogModel.find({
      email,
      success: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
