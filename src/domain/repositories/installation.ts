import { Installation } from "../entities/installation.js";

export interface IInstallationRepo {
    save(installation: Installation): Promise<void>;
    findByTeam(teamId: string, enterpriseId?: string): Promise<Installation | null>;
}
