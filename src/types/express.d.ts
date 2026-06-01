import { User as ExpressUser } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      displayName: string;
      emails?: { value: string; verified: boolean }[];
      photos?: { value: string }[];
      provider: string;
    }
  }
}
