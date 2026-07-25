import type { IUser } from "@/modules/users/user.types.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import { AuthLogRepository } from "./auth-log.repository.js";
import type { CreateAuthLogDto } from "./auth-log.types.js";
import  {AUTH_ACTIONS} from "./auth-log.types.js"

export class AuthLogService {
  constructor(private readonly repository: AuthLogRepository) {}

  async success(user: IUser, provider: AuthProvider, session: SessionMetadata) {
    return this.repository.create({
      userId: user._id,

      email: user.email,

      provider,

      action: AUTH_ACTIONS.LOGIN,

      outcome: "success",

      ...session,
    });
  }

  async failure(
    email: string,
    provider: AuthProvider,
    reason: string,
    session: SessionMetadata,
  ) {
    return this.repository.create({
      email,

      provider,

      action: AUTH_ACTIONS.LOGIN,

      outcome: "failure",

      failureReason: reason,

      ...session,
    });
  }

  async log(data: CreateAuthLogDto) {
    return this.repository.create(data);
  }
}
