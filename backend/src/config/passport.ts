import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User as PrismaUser } from '@prisma/client';
import { config } from './env';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

// Augment Express.User interface to match Prisma User model
declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}

// Serialize user into the session by primary key (id)
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Deserialize user from the session using database lookup
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authService.getUserById(id);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    logger.error('Error during user deserialization:', error);
    done(error, null);
  }
});

// Configure Google OAuth 2.0 Strategy
if (config.auth.googleClientId && config.auth.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.auth.googleClientId,
        clientSecret: config.auth.googleClientSecret,
        callbackURL: config.auth.googleCallbackUrl,
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No primary email returned from Google profile'));
          }

          const user = await authService.handleGoogleProfile({
            googleId: profile.id,
            email,
            name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || null,
            avatarUrl: profile.photos?.[0]?.value || null,
          });

          return done(null, user);
        } catch (error) {
          logger.error('Error in Google Strategy verify callback:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
  logger.info('Google OAuth 2.0 Strategy configured successfully.');
} else {
  logger.warn(
    'Google OAuth Strategy NOT enabled: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are missing from environment.'
  );
}

export default passport;
