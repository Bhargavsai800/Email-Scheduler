export interface User {
  id: string;
  googleId?: string | null;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: User;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
