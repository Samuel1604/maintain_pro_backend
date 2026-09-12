import { User } from "./user.model.js";
import type { IUser } from "./user.types.js";
import { Types, type UpdateQuery } from "mongoose";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";

export class UserRepository {
  async exists(filter: Partial<IUser>): Promise<boolean> {
    const user = await User.exists(filter);

    return Boolean(user);
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    return User.create(data);
  }

  async markEmailVerified(email: string) {
    await User.updateOne(
      { email: email.toLowerCase().trim() },
      {
        isVerified: true,
        emailVerifiedAt: new Date(),
        status: "active",
      },
    );
  }

  async findById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({
      email: email.toLowerCase(),
    });
  }

  async findByProviderId(
    provider: Exclude<AuthProvider, "local">,
    providerId: string,
  ): Promise<IUser | null> {
    const field = provider === "google" ? "googleId" : provider === "linkedin" ? "linkedinId" : "appleId";
    return User.findOne({ [field]: providerId });
  }

  async update(
    userId: string | Types.ObjectId,
    updates: UpdateQuery<IUser>,
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, updates, {
      returnDocument: "after",
    });
  }

  // async updatePassword(
  //   userId: string | Types.ObjectId,
  //   hashedPassword: string,
  // ): Promise<void> {
  //   await User.updateOne(
  //     { _id: userId },
  //     {
  //       password: hashedPassword,
  //       lastPasswordChangeAt: new Date(),
  //     },
  //   );
  // }

  // async updateEmail(userId: string, email: string): Promise<void> {
  //   await User.findByIdAndUpdate(
  //     userId,
  //     {
  //       email: email.toLowerCase(),
  //       lastEmailChangeAt: new Date(),
  //     },
  //     {
  //       returnDocument: "after",
  //     },
  //   );
  // }

  // async updateLastLogin(userId: string): Promise<void> {
  //   await User.findByIdAndUpdate(
  //     userId,
  //     {
  //       lastLoginAt: new Date(),
  //     },
  //     {
  //       returnDocument: "after",
  //     },
  //   );
  // }


  // async unlockAccount(userId: string): Promise<void> {
  //   await User.findByIdAndUpdate(
  //     userId,
  //     {
  //       failedLoginAttempts: 0,
  //       $unset: {
  //         lockedUntil: 1,
  //       },
  //     },
  //     {
  //       returnDocument: "after",
  //     },
  //   );
  // }

  // async lockAccount(userId: string, lockedUntil: Date) {
  //   return User.findByIdAndUpdate(
  //     userId,
  //     {
  //       lockedUntil,
  //     },
  //     {
  //       returnDocument: "after",
  //     },
  //   );
  // }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await User.exists({
      email: email.toLowerCase(),
    });

    return Boolean(user);
  }

  async findOne(filter: Partial<IUser>): Promise<IUser | null> {
    return User.findOne(filter);
  }

  async findMany(filter: Partial<IUser>): Promise<IUser[]> {
    return User.find(filter).limit(1000);
  }

  async count(filter: Partial<IUser>): Promise<number> {
    return User.countDocuments(filter);
  }

  async delete(userId: string | Types.ObjectId): Promise<void> {
    await User.findByIdAndDelete(userId);
  }

  async isLocked(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select("lockedUntil");

    return !!(user?.lockedUntil && user.lockedUntil > new Date());
  }

  async increment(userId: string, field: keyof IUser) {
    return User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          [field]: 1,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  async findOrganizationUsers(organizationId: string): Promise<IUser[]> {
    return User.find({
      organizationId,
    }).limit(1000);
  }

  async findByOrganizationAndRole(
    organizationId: string,
    role: IUser["role"],
  ): Promise<IUser[]> {
    return User.find({
      organizationId,
      role,
    }).limit(1000);
  }

  async findVendorUsers(vendorId: string): Promise<IUser[]> {
    return User.find({
      vendorId,
    }).limit(1000);
  }

  async findVendorTechnicians(vendorId: string): Promise<IUser[]> {
    return User.find({
      vendorId,
      role: "vendor_technician",
    }).limit(1000);
  }

  /**
   * Deletes all temp-invitation users whose TTL has passed.
   * Called by the cleanup job every 5 minutes.
   */
  async deleteExpiredTempUsers(): Promise<number> {
    const result = await User.deleteMany({
      status: "pending_invitation",
      tempPasswordExpiresAt: { $lt: new Date() },
    });
    return result.deletedCount ?? 0;
  }
}
