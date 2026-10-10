import { AuthUser } from "../common/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      cookies: Record<string, string | undefined>;
    }
  }
}

export {};
