import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { strToU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { listDirSlugs, removeDir, writeFilesTo } from "./dir-drop";

let base: string;
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "ac-dd-"));
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe("writeFilesTo", () => {
  it("writes (nested) files and clears a prior install first", async () => {
    const dest = join(base, "x");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "stale.txt"), "old");

    await writeFilesTo(dest, {
      "a.txt": strToU8("A"),
      "nested/b.txt": strToU8("B"),
    });

    expect(readFileSync(join(dest, "a.txt"), "utf8")).toBe("A");
    expect(readFileSync(join(dest, "nested", "b.txt"), "utf8")).toBe("B");
    expect(existsSync(join(dest, "stale.txt"))).toBe(false);
  });

  it("rejects a traversal entry and cleans up the dest", async () => {
    const dest = join(base, "y");
    await expect(
      writeFilesTo(dest, { "../escape.txt": strToU8("x") }),
    ).rejects.toThrow(/escapes/);
    expect(existsSync(dest)).toBe(false);
  });

  it("preserves the previous install when an update fails mid-write", async () => {
    const dest = join(base, "z");
    await writeFilesTo(dest, { "good.txt": strToU8("v1") });
    // A failing update (rejected traversal entry) must not wipe v1.
    await expect(
      writeFilesTo(dest, { "../escape.txt": strToU8("v2") }),
    ).rejects.toThrow(/escapes/);
    expect(readFileSync(join(dest, "good.txt"), "utf8")).toBe("v1");
  });
});

describe("removeDir / listDirSlugs", () => {
  it("removeDir is false when absent, true after removing", () => {
    expect(removeDir(join(base, "nope"))).toBe(false);
    const d = join(base, "here");
    mkdirSync(d);
    expect(removeDir(d)).toBe(true);
    expect(existsSync(d)).toBe(false);
  });

  it("listDirSlugs returns only directory names", () => {
    mkdirSync(join(base, "one"));
    mkdirSync(join(base, "two"));
    writeFileSync(join(base, "file.txt"), "x");
    expect(listDirSlugs(base).sort()).toEqual(["one", "two"]);
  });
});
