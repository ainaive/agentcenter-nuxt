import { describe, expect, it } from "vitest";
import { join, sep } from "path";

import { assertValidSlug, resolveInside } from "./safe-paths";

describe("assertValidSlug", () => {
  it("accepts a lowercase kebab-case slug", () => {
    expect(() => assertValidSlug("hello")).not.toThrow();
    expect(() => assertValidSlug("hello-world")).not.toThrow();
    expect(() => assertValidSlug("abc123")).not.toThrow();
  });

  it("rejects path-traversal payloads", () => {
    expect(() => assertValidSlug("../etc/passwd")).toThrow();
    expect(() => assertValidSlug("..")).toThrow();
    expect(() => assertValidSlug("foo/bar")).toThrow();
  });

  it("rejects absolute paths and other shell-significant inputs", () => {
    expect(() => assertValidSlug("/etc/passwd")).toThrow();
    expect(() => assertValidSlug("foo bar")).toThrow();
    expect(() => assertValidSlug("foo;rm")).toThrow();
    expect(() => assertValidSlug("Foo")).toThrow(); // uppercase
    expect(() => assertValidSlug("")).toThrow();
  });
});

describe("resolveInside", () => {
  const root = join("/", "tmp", "agentcenter-test-root");

  it("resolves a simple child path inside the root", () => {
    expect(resolveInside(root, "hello.txt")).toBe(join(root, "hello.txt"));
  });

  it("resolves nested paths inside the root", () => {
    expect(resolveInside(root, "nested/dir/file.txt")).toBe(
      join(root, "nested", "dir", "file.txt"),
    );
  });

  it("throws on traversal that escapes the root", () => {
    expect(() => resolveInside(root, "../escape.txt")).toThrow(/escapes/);
    expect(() => resolveInside(root, "nested/../../escape.txt")).toThrow(/escapes/);
  });

  it("throws on absolute paths outside the root", () => {
    expect(() => resolveInside(root, "/etc/passwd")).toThrow(/escapes/);
  });

  it("allows entries that .. their way back inside the root", () => {
    // a/b/../c resolves to a/c — still inside.
    expect(resolveInside(root, "a/b/../c.txt")).toBe(join(root, "a", "c.txt"));
  });

  it("does not match a sibling root that shares a prefix", () => {
    // baseDir = /tmp/agentcenter-test-root
    // attacker entry = "../agentcenter-test-rootEVIL/file.txt"
    // resolves to /tmp/agentcenter-test-rootEVIL/file.txt which starts with
    // the same string prefix but NOT with `baseDir + sep` — the sep check
    // is the guard.
    expect(() =>
      resolveInside(root, `..${sep}agentcenter-test-rootEVIL${sep}file.txt`),
    ).toThrow(/escapes/);
  });
});
