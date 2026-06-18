import { Command } from "commander";
import { listInstalled } from "../installers";

export function makeListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description("List locally installed extensions")
    .action(() => {
      const entries = listInstalled();
      if (entries.length === 0) {
        console.log("No extensions installed.");
        return;
      }
      for (const e of entries) {
        console.log(`  ${e.slug}  (${e.category})`);
      }
    });
}
