import { installSkill, uninstallSkill, listInstalledSlugs } from "./skills";
import { installCli, uninstallCli } from "./cli";

export async function installExtension(
  slug: string,
  category: string,
  zipBuffer: ArrayBuffer,
): Promise<string> {
  switch (category) {
    case "skill":
    case "skills":
      return installSkill(slug, zipBuffer);
    case "cli":
      return installCli(slug, zipBuffer);
    default:
      // Fallback: treat everything else as a skill-style directory drop
      return installSkill(slug, zipBuffer);
  }
}

export async function uninstallExtension(slug: string, category: string): Promise<boolean> {
  switch (category) {
    case "skill":
    case "skills":
      return uninstallSkill(slug);
    case "cli":
      return uninstallCli(slug);
    default:
      return uninstallSkill(slug);
  }
}

export { listInstalledSlugs };
