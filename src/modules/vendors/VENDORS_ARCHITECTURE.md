# Vendors Module Architecture

## Purpose

Vendors are external service organizations that can receive work, submit applications, hold contracts, and provide technicians. This module owns vendor identity, profile, capabilities, compliance metadata, and vendor-user scope.

## Folder map

Routes/controllers expose vendor administration and vendor-portal reads. Schemas/types validate profile and capability data. Services enforce vendor and organization relationship permissions. Repositories/models persist vendor records and membership references.

## Relationship boundary

Vendor records are reusable marketplace entities, but each organization relationship is authorized independently. Marketplace applications own bidding; quotations own offers; contract awards own selection; contracts and SLAs own active delivery terms.

Vendor users must not read another vendor's data. Organization users may see only vendors visible through their organization's marketplace or active relationship rules.

## Testing and integrations

Test vendor isolation, organization relationship access, capability filters, deactivation, user membership, and marketplace visibility. Future integrations include compliance providers, insurance verification, and external workforce directories.

## Trade-offs

Shared vendor records support reuse and reduce duplicate onboarding, while relationship state increases authorization complexity and requires careful tenant queries.
