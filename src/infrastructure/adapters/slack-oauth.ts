import axios from 'axios';
import { ISlackOAuthPort } from '../../domain/ports/slack-oauth.js';
import { Installation } from '../../domain/entities/installation.js';

export class SlackOAuthAdapter implements ISlackOAuthPort {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  async exchangeCode(code: string): Promise<{ installation: Installation }> {
    const resp = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }
    });
    if (!resp.data.ok) throw new Error(resp.data.error);

    const data = resp.data;
    const installation: Installation = {
      teamId: data.team.id,
      botToken: data.access_token,
      botRefreshToken: data.refresh_token,
      botExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in*1000) : undefined,
      authedUser: data.authed_user && {
        id: data.authed_user.id,
        scope: data.authed_user.scope,
        accessToken: data.authed_user.access_token,
        refreshToken: data.authed_user.refresh_token,
        expiresAt: data.authed_user.expires_in ? new Date(Date.now() + data.authed_user.expires_in*1000) : undefined
      },
      appId: data.app_id,
      installedAt: new Date()
    };
    return { installation };
  }
}
