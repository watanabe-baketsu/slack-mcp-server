import { Request } from 'express';

export interface IRequestVerifierPort {
  verify(request: Request): Promise<void>;
}
