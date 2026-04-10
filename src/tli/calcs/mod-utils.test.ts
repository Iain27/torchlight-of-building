import { describe, expect, it, vi } from "vitest";
import type { Mod } from "../mod";
import { assertModInvariants } from "./mod-utils";

describe("assertModInvariants", () => {
  it("accepts a plain mod", () => {
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
    } satisfies Mod;
    expect(assertModInvariants(mod)).toBe(true);
  });

  it("accepts a mod with cond + per (valid combo)", () => {
    const mod = {
      type: "DmgPct",
      value: 5,
      dmgModType: "global",
      addn: true,
      per: { stackable: "focus_blessing" },
      cond: "has_focus_blessing",
    } satisfies Mod;
    expect(assertModInvariants(mod)).toBe(true);
  });

  it("accepts a mod with just resolvedCond", () => {
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      resolvedCond: "have_both_sealed_mana_and_life",
    } satisfies Mod;
    expect(assertModInvariants(mod)).toBe(true);
  });

  it("drops and logs a mod with resolvedCond + per", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Cast: the ModBase union makes this unrepresentable at the type level,
    // but we want to confirm the runtime guard catches smuggled-in values.
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      resolvedCond: "have_both_sealed_mana_and_life",
      per: { stackable: "focus_blessing" },
    } as unknown as Mod;
    expect(assertModInvariants(mod)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("per");
    consoleSpy.mockRestore();
  });

  it("drops and logs a mod with resolvedCond + cond", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      resolvedCond: "at_max_focus_blessing",
      cond: "has_focus_blessing",
    } as unknown as Mod;
    expect(assertModInvariants(mod)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("cond");
    consoleSpy.mockRestore();
  });

  it("drops and logs a mod with resolvedCond + condThreshold", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      resolvedCond: "at_max_focus_blessing",
      condThreshold: { target: "focus_blessing", comparator: "gte", value: 8 },
    } as unknown as Mod;
    expect(assertModInvariants(mod)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("condThreshold");
    consoleSpy.mockRestore();
  });

  it("reports all violated fields in a single message", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      resolvedCond: "at_max_focus_blessing",
      cond: "has_focus_blessing",
      per: { stackable: "focus_blessing" },
      condThreshold: { target: "focus_blessing", comparator: "gte", value: 8 },
    } as unknown as Mod;
    expect(assertModInvariants(mod)).toBe(false);
    const msg = consoleSpy.mock.calls[0]?.[0] as string;
    expect(msg).toContain("per");
    expect(msg).toContain("cond");
    expect(msg).toContain("condThreshold");
    consoleSpy.mockRestore();
  });
});
