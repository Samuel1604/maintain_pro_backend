import type { OrganizationService } from "@/modules/organizations/organization.service.js";
import type { VendorService } from "@/modules/vendors/vendor.service.js";
import type { UserReader } from "@/modules/users/user.reader.js";
import type { SessionService } from "./session/session.service.js";
import type { OtpService } from "./otp/otp.service.js";

export class RegistrationService {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly vendorService: VendorService,
    private readonly userReader: UserReader,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
  ) {
    void this.organizationService;
    void this.vendorService;
    void this.userReader;
    void this.sessionService;
    void this.otpService;
  }
}