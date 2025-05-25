export interface Installation {
  teamId: string;
  botToken: string;
  botRefreshToken?: string;
  botExpiresAt?: Date;
  authedUser?: {
    id: string;
    scope: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  appId: string;
  installedAt: Date;
}
