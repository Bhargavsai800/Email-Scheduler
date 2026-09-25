import { User, AuthResponse } from './auth.types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') + '/api';

export const authApi = {
  /**
   * Retrieves the current authenticated user session.
   * Returns null if unauthenticated (401).
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch current user (HTTP ${response.status})`);
      }

      const result: AuthResponse = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('Error fetching current session:', error);
      return null;
    }
  },

  /**
   * Destroys current session on backend and clears session cookie.
   */
  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Logout endpoint returned non-200 status:', response.status);
    }
  },

  /**
   * Returns the endpoint URL to initiate Google OAuth 2.0 flow.
   */
  getGoogleAuthUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  },
};
