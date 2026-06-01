declare module 'passport-google-oidc' {
  import { Strategy as PassportStrategy } from 'passport';

  interface GoogleStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  interface GoogleProfile {
    id: string;
    displayName: string;
    name?: { familyName?: string; givenName?: string };
    emails?: { value: string; verified: boolean }[];
    photos?: { value: string }[];
    provider: string;
    _raw?: string;
    _json?: Record<string, unknown>;
  }

  interface VerifyFunction {
    (issuer: string, profile: GoogleProfile, cb: (err: Error | null, user?: unknown) => void): void;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: GoogleStrategyOptions, verify: VerifyFunction);
    name: string;
  }
}
