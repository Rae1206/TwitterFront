import { JsonRecord, PaginationQuery } from "../../../core/api/api.models";


export interface UserDto extends JsonRecord {
  userId?: string;
  nickname?: string;
  fullName?: string; // Deprecated: mantener temporalmente para compatibilidad con datos cacheados
  email?: string;
  biography?: string | null;
  isActive?: boolean;
  createdAt?: string;
  roles?: string[];
  isSuspended?: boolean;
  isShadowBanned?: boolean;
  deletedAt?: string | null;
  isVerified?: boolean;
  profilePhotoFileName?: string | null;
  profilePhotoStoragePath?: string | null;
  profilePhotoUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
}

/**
 * Helper function to get user display name with fallback for old cached data
 */
export function getUserDisplayName(user: UserDto | null | undefined): string {
  if (!user) return 'Usuario';
  return user.nickname || user.fullName || user.email || 'Usuario';
}

export interface RegisterUserRequest {
  nickname: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  email?: string;
  biography?: string | null;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TestEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface UserListQuery extends PaginationQuery {
  search?: string;
}
