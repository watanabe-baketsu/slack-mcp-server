import { Installation } from "../entities/installation.js";

export interface ISlackOAuthPort {
  exchangeCode(code: string): Promise<{ installation: Installation }>;
}
