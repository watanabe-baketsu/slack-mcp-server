import crypto from 'crypto';
import { IRequestVerifierPort } from '../../domain/ports/request-verifier.js';
import { Request } from 'express';

export class SlackRequestVerifierAdapter implements IRequestVerifierPort {
  constructor(
    private signingSecret: string,
    private timestampToleranceSec = 300
  ) {}

  async verify(req: Request): Promise<void> {
    const ts = req.headers['x-slack-request-timestamp'] as string;
    const sig = req.headers['x-slack-signature'] as string;
    if (!ts || !sig) throw new Error('Missing headers');

    const age = Math.abs(Date.now() - Number(ts) * 1000);
    if (age > this.timestampToleranceSec * 1000) throw new Error('Timestamp out of range');

    const raw = (req as any).rawBody as string;
    const base = `v0:${ts}:${raw}`;
    const mySig = 'v0=' + crypto.createHmac('sha256', this.signingSecret).update(base).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(sig))) throw new Error('Invalid signature');
  }
}
