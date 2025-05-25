import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Slack リクエスト署名検証の設定
 */
export interface SlackVerifierConfig {
  signingSecret: string;
  timestampTolerance?: number;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

interface SuccessResponse {
  ok: true;
}

export class SlackRequestVerifier {
  private signingSecret: string;
  private tolerance: number;

  constructor(config: SlackVerifierConfig) {
    this.signingSecret = config.signingSecret;
    this.tolerance = config.timestampTolerance ?? 300;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const timestamp = req.headers['x-slack-request-timestamp'] as string;
        const slackSignature = req.headers['x-slack-signature'] as string;
        if (!timestamp || !slackSignature) {
          const response: ErrorResponse = {
            ok: false,
            error: 'missing_signature_headers'
          };
          return res.status(400).json(response);
        }

        const age = Math.abs(Date.now() - Number(timestamp) * 1000);
        if (age > this.tolerance * 1000) {
          const response: ErrorResponse = {
            ok: false,
            error: 'timestamp_out_of_tolerance'
          };
          return res.status(400).json(response);
        }

        const rawBody = (req as any).rawBody || '';
        const sigBasestring = `v0:${timestamp}:${rawBody}`;
        const mySignature = 'v0=' +
          crypto.createHmac('sha256', this.signingSecret)
            .update(sigBasestring, 'utf8')
            .digest('hex');

        const sigBuffer = Buffer.from(mySignature, 'utf8');
        const slackSigBuffer = Buffer.from(slackSignature, 'utf8');
        if (sigBuffer.length !== slackSigBuffer.length ||
          !crypto.timingSafeEqual(sigBuffer, slackSigBuffer)) {
          const response: ErrorResponse = {
            ok: false,
            error: 'invalid_signature'
          };
          return res.status(400).json(response);
        }

        next();
      } catch (err) {
        console.error('Verification error:', err);
        const response: ErrorResponse = {
          ok: false,
          error: 'verification_failed'
        };
        res.status(400).json(response);
      }
    };
  }
}
