import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export interface GoogleProfileData {
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface SanitizedUser {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  /**
   * Processes a Google OAuth profile:
   * 1. Finds existing user by googleId -> updates profile fields if changed.
   * 2. Finds existing user by email (if created previously via other method) -> links googleId and updates profile.
   * 3. Creates a new user record if not found.
   * Strictly prevents duplicate users on repeat logins.
   */
  public async handleGoogleProfile(profile: GoogleProfileData): Promise<User> {
    const email = profile.email.toLowerCase().trim();
    const googleId = profile.googleId.trim();
    const name = profile.name?.trim() || null;
    const avatarUrl = profile.avatarUrl?.trim() || null;

    // 1. Search by Google ID
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      // Check if profile details need refreshing
      const needsUpdate =
        (name !== null && name !== user.name) ||
        (avatarUrl !== null && avatarUrl !== user.avatarUrl);

      if (needsUpdate) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: name ?? user.name,
            avatarUrl: avatarUrl ?? user.avatarUrl,
          },
        });
        logger.info(`Updated profile details for Google user [${user.id}] (${user.email})`);
      }
      return user;
    }

    // 2. Search by Email
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Link Google ID to existing account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          name: name ?? user.name,
          avatarUrl: avatarUrl ?? user.avatarUrl,
        },
      });
      logger.info(`Linked Google ID to existing user account [${user.id}] (${user.email})`);
      return user;
    }

    // 3. Create new User record
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        name,
        avatarUrl,
      },
    });

    logger.info(`Created new user account [${user.id}] from Google OAuth (${user.email})`);
    return user;
  }

  /**
   * Loads user by database ID (e.g. for Passport deserialization).
   */
  public async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Sanitizes user object to safely expose via public/session APIs.
   * Strips any internal secrets if any exist.
   */
  public sanitizeUser(user: User): SanitizedUser {
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
