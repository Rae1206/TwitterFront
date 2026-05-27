export interface FollowUserDto {
    userId: string;
    nickname: string;
    email: string;
    biography?: string;
    profilePhotoUrl?: string;
    isActive: boolean;
    isSuspended: boolean;
    isShadowBanned: boolean;
    followersCount: number;
    followingCount: number;
    createdAt: string;
}

export interface IsFollowingResponse {
    isFollowing: boolean;
}
