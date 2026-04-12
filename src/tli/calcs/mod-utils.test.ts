import { describe, expect, it, vi } from "vitest";
import type { Mod } from "../mod";
import { assertModInvariants, normalizeStackables } from "./mod-utils";

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

describe("normalizeStackables", () => {
  it("includes per-mod when condThreshold targets same stackable and is satisfied", () => {
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      per: { stackable: "num_enemies_nearby" },
      condThreshold: {
        target: "num_enemies_nearby",
        comparator: "gte",
        value: 3,
      },
    } satisfies Mod;
    const result = normalizeStackables([mod], "num_enemies_nearby", 5);
    expect(result).toHaveLength(1);
    expect((result[0] as Extract<Mod, { value: number }>).value).toBe(50);
  });

  it("excludes per-mod when condThreshold targets same stackable and is not satisfied", () => {
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      per: { stackable: "num_enemies_nearby" },
      condThreshold: {
        target: "num_enemies_nearby",
        comparator: "gte",
        value: 3,
      },
    } satisfies Mod;
    const result = normalizeStackables([mod], "num_enemies_nearby", 2);
    expect(result).toHaveLength(0);
  });

  it("drops and warns when condThreshold targets a different stackable than per", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      per: { stackable: "focus_blessing" },
      condThreshold: {
        target: "num_enemies_nearby",
        comparator: "gte",
        value: 3,
      },
    } satisfies Mod;
    const result = normalizeStackables([mod], "focus_blessing", 5);
    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain(
      'per.stackable="focus_blessing"',
    );
    expect(consoleSpy.mock.calls[0]?.[0]).toContain(
      'condThreshold.target="num_enemies_nearby"',
    );
    consoleSpy.mockRestore();
  });

  it("includes per-mod without condThreshold", () => {
    const mod = {
      type: "DmgPct",
      value: 10,
      dmgModType: "global",
      addn: true,
      per: { stackable: "focus_blessing" },
    } satisfies Mod;
    const result = normalizeStackables([mod], "focus_blessing", 3);
    expect(result).toHaveLength(1);
    expect((result[0] as Extract<Mod, { value: number }>).value).toBe(30);
  });
});
