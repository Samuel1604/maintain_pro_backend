// ─── Database Migration: Organization → Billing Separation
//
// Date: 2026-08-12
// Status: PENDING DBA REVIEW
// Type: Data Model Refactor
//
// OBJECTIVE:
// Remove billing-specific fields from Organization model. Billing state is now
// managed exclusively by the Subscription model. Update Facility model to use
// nested address structure for consistency with Organization.
//
// CHANGES:
//
// 1. Remove fields from organizations collection:
//    - plan
//    - subscriptionStatus
//    - facilityLimit
//    - facilityManagerLimit
//    - vendorMarketplaceEnabled
//
//    MongoDB command:
//    db.organizations.updateMany({}, { $unset: {
//      plan: "",
//      subscriptionStatus: "",
//      facilityLimit: "",
//      facilityManagerLimit: "",
//      vendorMarketplaceEnabled: ""
//    }})
//
// 2. Add indexes to organizations collection:
//    - { email: 1 } (unique)
//    - { name: 1 }
//    - { status: 1 }
//
//    MongoDB commands:
//    db.organizations.createIndex({ email: 1 }, { unique: true })
//    db.organizations.createIndex({ name: 1 })
//    db.organizations.createIndex({ status: 1 })
//
// 3. Update facilities collection structure:
//    - Remove flat fields: address (string), city, state, country
//    - Add nested address object:
//      address: {
//        street: string (required),
//        city: string (required),
//        state: string (required),
//        postalCode: string (optional),
//        country: string (required)
//      }
//    - Add field: status (enum: active|inactive|suspended, default: active)
//    - Add field: createdBy (ObjectId, ref: User, required)
//    - Add field: updatedBy (ObjectId, ref: User, optional)
//    - Add field: description (String, optional)
//
//    MongoDB command for schema transformation:
//    db.facilities.updateMany({}, [
//      {
//        $set: {
//          address: {
//            street: "$address",
//            city: "$city",
//            state: "$state",
//            postalCode: null,
//            country: "$country"
//          },
//          status: "active",
//          createdBy: null,
//          updatedBy: null,
//          description: null
//        }
//      },
//      {
//        $unset: ["city", "state", "country"]
//      }
//    ])
//
//    NOTE: createdBy cannot be null if required in schema. This migration
//    will SET it to null temporarily. A second pass is needed to populate
//    createdBy from audit logs or set to a default/system user.
//
// 4. Add indexes to facilities collection:
//    - { organizationId: 1, status: 1 }
//
//    MongoDB command:
//    db.facilities.createIndex({ organizationId: 1, status: 1 })
//
// ROLLBACK PLAN:
// If this migration fails:
// 1. Restore organizations collection from backup
// 2. Restore facilities collection from backup
// 3. No application changes needed (code changes can be reverted in-app)
//
// TESTING:
// After migration:
// 1. Verify no organizations have plan, subscriptionStatus, facilityLimit fields
// 2. Verify all facilities have nested address structure
// 3. Verify all facilities have status field set to "active"
// 4. Verify all new indexes exist
// 5. Run type-check: npm run type-check
// 6. Run integration tests: npm run test
//
// NOTES:
// - createdBy field in facilities collection should be populated from UserSession
//   or audit logs in a follow-up task.
// - address.street replaces flat "address" field
// - city, state, country moved into nested address object
// - Entitlements (facility limits, features) now come from Subscription plan
//   via BillingService, not from Organization fields.
// - This is a data model refactor, not a feature change. No API contracts change.

export {};
