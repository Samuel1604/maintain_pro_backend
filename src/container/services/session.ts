import { SessionService } from "@/modules/auth/session/session.service.js";
import { SessionRepository } from "@/modules/auth/session/session.repository.js";
import {userService} from "./user.js";
import { authLogService } from "./auth.js";
import { securityAlterService } from "./security.js";



const session = new SessionRepository();
export const sessionService: SessionService = new SessionService(session, userService, authLogService, securityAlterService)
