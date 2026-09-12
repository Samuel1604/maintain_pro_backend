import { AppContainer } from "@/container/app.container.js";

let _container: AppContainer | null = null;
const getContainer = (): AppContainer => {
  if (!_container) {
    _container = new AppContainer();
  }
  return _container;
};

const makeProxy = <K extends keyof AppContainer>(propName: K) =>
  new Proxy({} as Partial<Record<PropertyKey, unknown>>, {
    get(_target, prop: PropertyKey) {
      const c = getContainer();
      const value = c[propName] as unknown;
      if (value === undefined || value === null) return undefined;

      if (typeof value === "function") {
        // Bind function members to the service object that owns them.
        const svc = c[propName] as unknown as Record<PropertyKey, unknown>;
        const fn = value as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => fn.apply(svc, args);
      }

      if (typeof value === "object") {
        // If accessing a property on the proxied object, return the
        // property if it exists; otherwise lazily bind methods on the
        // sub-object to preserve `this`.
        const sub = c[propName] as Record<PropertyKey, unknown>;
        const v = sub[prop];
        if (typeof v === "function") {
          const fn = v as (...args: unknown[]) => unknown;
          return (...args: unknown[]) => fn.apply(sub, args);
        }
        return v;
      }

      return value;
    },
  }) as unknown as AppContainer[K];

export const loggerService = makeProxy("loggerService");
export const eventBus = makeProxy("eventBus");
export const eventPublisher = makeProxy("eventPublisher");

export const authService = makeProxy("authService");
export const oauthService = makeProxy("oauthService");
export const userService = makeProxy("userService");
export const userReader = makeProxy("userReader");
export const sessionService = makeProxy("sessionService");
export const auditService = makeProxy("auditLogService");
export const securityService = makeProxy("securityService");
export const emailService = makeProxy("emailService");
export const lockoutService = makeProxy("lockoutService");
export const invitationService = makeProxy("invitationService");
export const vendorService = makeProxy("vendorService");
export const organizationService = makeProxy("organizationService");
export const rateLimitService = makeProxy("rateLimitService");
export const redisService = makeProxy("redisService");
export const queueWorkerBootstrap = makeProxy("queueWorkerBootstrap");
export const queueDispatcher = makeProxy("queueDispatcher");

export const billingService = makeProxy("billingService");
export const billingRepository = makeProxy("billingRepository");
export const paymentRepository = makeProxy("paymentRepository");
export const billingReader = makeProxy("billingReader");

export const facilityService = makeProxy("facilityService");
export const facilityRepository = makeProxy("facilityRepository");
