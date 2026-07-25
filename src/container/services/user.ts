import { redisService, emailService } from './email.js';
import { UserService } from "@/modules/users/user.service.js";
import { UserRepository } from "@/modules/users/user.repository.js";
import { securityAlterService } from './security.js';
import { sessionService } from './session.js';
import { otpService } from './auth.js';
import { RateLimitService } from '@/shared/services/rate-limit.service.js';
import { auditService } from './audit.js';



const user = new UserRepository()
const rateLimitService = new RateLimitService();


export const userService: UserService = new UserService(user, redisService, securityAlterService, sessionService, otpService, emailService, rateLimitService, auditService)
