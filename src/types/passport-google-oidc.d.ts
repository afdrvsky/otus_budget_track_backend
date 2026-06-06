declare module 'passport-google-oauth20' {
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

  export class Strategy extends PassportStrategy {
    constructor(
      options: GoogleStrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: (err: Error | null, user?: unknown) => void,
      ) => void,
    );
    name: string;
  }
}
