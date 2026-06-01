import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oidc';
import { config } from './env';

interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: { value: string; verified: boolean }[];
  photos?: { value: string }[];
  provider: string;
}

function getCallbackUrl(): string {
  if (config.nodeEnv === 'production') {
    const domain = process.env.APP_BASE_URL;
    if (!domain) {
      throw new Error('APP_BASE_URL env variable is required in production');
    }
    return `${domain}/api/auth/google/callback`;
  }
  return `http://localhost:${config.port}/api/auth/google/callback`;
}

export function configurePassport(): void {
  passport.serializeUser((user, done) => {
    done(null, user as GoogleProfile);
  });

  passport.deserializeUser((obj: unknown, done) => {
    done(null, obj as GoogleProfile);
  });

  if (!config.googleClientId || !config.googleClientSecret) {
    console.warn(
      '[Passport] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Google OAuth will be disabled.',
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: getCallbackUrl(),
        scope: ['profile', 'email'],
      },
      (
        issuer: string,
        profile: GoogleProfile,
        cb: (err: Error | null, user?: GoogleProfile) => void,
      ) => {
        return cb(null, profile);
      },
    ),
  );
}

export default passport;
