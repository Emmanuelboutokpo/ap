// types.ts (ou en haut de ton controller)

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId?: string;
    orgId?: string;
  };
}

 declare global {
  namespace Express {
    interface User {
      id: string
      role: "ADMIN" | "CHORISTE"
    }
  }
}
