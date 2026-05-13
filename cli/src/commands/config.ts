import { Command } from "commander";
import {
  DEFAULT_CONFIG,
  getConfigValue,
  loadConfig,
  saveConfig,
  setConfigValue,
} from "../config-store";

export function makeConfigCommand(): Command {
  const config = new Command("config").description("Manage CLI configuration");

  config
    .command("get <key>")
    .description("Get a config value")
    .action(async (key: string) => {
      const value = await getConfigValue(key);
      if (value === undefined) {
        console.error(`Unknown config key: ${key}`);
        process.exit(1);
      }
      console.log(String(value));
    });

  config
    .command("set <key> <value>")
    .description("Set a config value")
    .action(async (key: string, value: string) => {
      await setConfigValue(key, value);
      console.log(`${key} = ${value}`);
    });

  config
    .command("list")
    .alias("ls")
    .description("Show all config values")
    .action(async () => {
      const cfg = await loadConfig();
      for (const [k, v] of Object.entries(cfg)) {
        console.log(`${k} = ${v}`);
      }
    });

  config
    .command("reset")
    .description("Reset config to defaults")
    .action(async () => {
      await saveConfig({ ...DEFAULT_CONFIG });
      console.log("Config reset to defaults.");
    });

  return config;
}
