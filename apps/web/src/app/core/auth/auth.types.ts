export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  organization: string;
  lastLoginAt: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}
