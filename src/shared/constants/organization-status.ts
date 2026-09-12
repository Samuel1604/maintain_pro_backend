  export const ORG_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ARCHIVED: "archived",
  } as const;

  export type OrgStatus =
    (typeof ORG_STATUS)[keyof typeof ORG_STATUS];
