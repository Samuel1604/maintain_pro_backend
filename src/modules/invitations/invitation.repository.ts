import { toObjectId } from "@/shared/validators/objectId.js";
import { Invitation } from "./invitation.model.js";
import { InvitationStatus, type IInvitation } from "./invitation.types.js";
import { AppError } from "@/shared/errors/AppError.js";

export class InvitationRepository {
  async create(data: Partial<IInvitation>) {
    return Invitation.create(data);
  }

  async resend(invitationId: string, tokenHash: string, expiresAt: Date) {
    return Invitation.findByIdAndUpdate(
      invitationId,
      {
        tokenHash,
        expiresAt,
        lastSentAt: new Date(),
        $inc: {
          resendCount: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  async findById(id: string) {
    return Invitation.findById(id)
      .populate("invitedBy", "firstName lastName email")
      .populate("acceptedBy", "firstName lastName email")
      .lean();
  }

  async findRequiredById(id: string) {
    const invitation = await this.findById(id);

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    return invitation;
  }

  async findMany(
    filter: Record<string, unknown>,

    page = 1,

    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Invitation.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Invitation.countDocuments(filter),
    ]);

    return {
      items,

      total,

      page,

      limit,

      pages: Math.ceil(total / limit),
    };
  }

  async findByEmail(email: string) {
    return Invitation.findOne({
      email: email.toLowerCase(),
    });
  }

  async findByTokenHash(tokenHash: string) {
    return Invitation.findOne({
      tokenHash,
    });
  }

  async findPendingByEmail(email: string) {
    return Invitation.findOne({
      email: email.toLowerCase(),

      status: InvitationStatus.PENDING,
    });
  }

  async findPendingByScope(
    email: string,

    organizationId?: string,

    facilityId?: string,

    vendorId?: string,
  ) {
    const filter: Record<string, unknown> = {
      email: email.toLowerCase(),
      status: InvitationStatus.PENDING,
    };

    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }

    if (facilityId) {
      filter.facilityId = toObjectId(facilityId);
    }

    if (vendorId) {
      filter.vendorId = toObjectId(vendorId);
    }

    return Invitation.findOne(filter);
  }

  async findValidInvitation(tokenHash: string) {
    return Invitation.findOne({
      tokenHash,

      status: InvitationStatus.PENDING,

      expiresAt: {
        $gt: new Date(),
      },
    });
  }

  async expireInvitations() {
    return Invitation.updateMany(
      {
        status: InvitationStatus.PENDING,

        expiresAt: {
          $lte: new Date(),
        },
      },

      {
        status: InvitationStatus.EXPIRED,
      },
    );
  }

  async listByOrganization(organizationId: string) {
    return Invitation.find({
      organizationId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async listByVendor(vendorId: string) {
    return Invitation.find({
      vendorId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async updateStatus(
    invitationId: string,

    status: InvitationStatus,
  ) {
    return Invitation.findByIdAndUpdate(
      invitationId,

      { status },

      {
        new: true,
      },
    );
  }

  async markAccepted(
    invitationId: string,

    acceptedBy: string,
  ) {
    return Invitation.findByIdAndUpdate(
      invitationId,

      {
        status: "accepted",

        acceptedAt: new Date(),

        acceptedBy,
      },

      {
        new: true,
      },
    );
  }

  async revoke(
    invitationId: string,

    revokedBy: string,

    revokeReason?: string,
  ) {
    return Invitation.findByIdAndUpdate(
      invitationId,

      {
        status: "revoked",

        revokedAt: new Date(),

        revokedBy,

        revokeReason,
      },

      {
        new: true,
      },
    );
  }

  async delete(id: string) {
    return Invitation.findByIdAndDelete(id);
  }
}
