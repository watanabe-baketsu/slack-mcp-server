export interface AuthedUserData {
  id: string;
  scope: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface InstallationData {
  teamId: string;
  botToken: string;
  botRefreshToken?: string;
  botExpiresAt?: string;
  authedUser?: AuthedUserData;
  appId: string;
  installedAt: string;
}
