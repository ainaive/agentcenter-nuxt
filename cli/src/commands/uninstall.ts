import { Command } from "commander";
import { uninstallExtension } from "../installers";

export function makeUninstallCommand(): Command {
  return new Command("uninstall")
    .description("Remove an installed extension")
    .argument("<slug>", "Extension slug")
    .action((slug: string) => {
      // Registry-independent: scan every install location and remove wherever
      // the slug is found — works offline and regardless of category.
      const removed = uninstallExtension(slug);
      if (removed.length > 0) {
        console.log(`Uninstalled ${slug} (${removed.join(", ")})`);
      } else {
        console.error(`"${slug}" is not installed.`);
        process.exit(1);
      }
    });
}
