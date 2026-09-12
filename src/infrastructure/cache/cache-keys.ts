const VERSION = "v1";
export const cacheKeys = {
  tenantPrefix: (scope: string) => `cache:${VERSION}:scope:${scope}:`,
  organizationProfile: (id: string) => `cache:${VERSION}:org:${id}:profile`,
  vendorProfile: (id: string) => `cache:${VERSION}:vendor:${id}:profile`,
  asset: (org: string, tag: string) => `cache:${VERSION}:org:${org}:asset:${tag}`,
  workOrder: (scope: string, id: string) => `cache:${VERSION}:scope:${scope}:work-order:${id}`,
  workOrderList: (scope: string, hash: string) => `cache:${VERSION}:scope:${scope}:work-orders:list:${hash}`,
  assetList: (scope: string, hash: string) => `cache:${VERSION}:scope:${scope}:assets:list:${hash}`,
  invoiceList: (scope: string, hash: string) => `cache:${VERSION}:scope:${scope}:invoices:list:${hash}`,
  dashboard: (scope: string, hash: string) => `cache:${VERSION}:scope:${scope}:dashboard:${hash}`,
  notificationPreferences: (userId: string) => `cache:${VERSION}:user:${userId}:notification-preferences`,
  notifications: (userId: string, hash: string) => `cache:${VERSION}:user:${userId}:notifications:${hash}`,
  unreadNotifications: (userId: string) => `cache:${VERSION}:user:${userId}:notifications:unread-count`,
  search: (scope: string, hash: string) => `cache:${VERSION}:scope:${scope}:search:${hash}`,
  userSettings: (userId: string) => `cache:${VERSION}:user:${userId}:settings`,
  organizationSettings: (organizationId: string) => `cache:${VERSION}:org:${organizationId}:settings`,
  vendorSettings: (vendorId: string) => `cache:${VERSION}:vendor:${vendorId}:settings`,
};

export const cacheTtlSeconds = {
  settings: 300,
  profile: 600,
  asset: 60,
  workOrder: 15,
  list: 5,
  invoice: 10,
  dashboard: 30,
  notificationPreferences: 300,
  notifications: 5,
  search: 10,
} as const;
