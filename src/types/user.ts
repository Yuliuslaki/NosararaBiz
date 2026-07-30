export const USER_ROLES = {
  OWNER: "owner",
  OFFICER: "officer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  officer: "Officer",
};
