import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  tenantId: string;
  campusId: string | null;
  email: string;
  name: string;
  role: UserRole;
};

export const TOKEN_COOKIE = "erp_token";
