import { IInstallationRepo } from '../../domain/repositories/installation.js';
import { Installation } from '../../domain/entities/installation.js';
import { promises as fs } from 'fs';
import path from 'path';

export class FileInstallationRepository implements IInstallationRepo {
  constructor(private dir: string) {}

  async save(installation: Installation): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const file = path.join(this.dir, `${installation.teamId}.json`);
    await fs.writeFile(file, JSON.stringify(installation, null, 2), 'utf8');
  }

  async findByTeam(teamId: string): Promise<Installation | null> {
    try {
      const buf = await fs.readFile(path.join(this.dir, `${teamId}.json`), 'utf8');
      return JSON.parse(buf) as Installation;
    } catch {
      return null;
    }
  }
}
