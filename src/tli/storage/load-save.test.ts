/** biome-ignore-all lint/style/noNonNullAssertion: don't care in test */
import { describe, expect, test } from "vitest";
import { decodeBuildCode, encodeBuildCode } from "@/src/lib/build-code";
import type { SaveData } from "@/src/lib/save-data";
import { getGearAffixes } from "../calcs/affix-collectors";
import { DEFAULT_CONFIGURATION, getAffixMods, getAffixText } from "../core";
import { buildSupportSkillAffixes, loadSave } from "./load-save";

const createEmptySkillPage = () => ({ activeSkills: {}, passiveSkills: {} });

const createEmptyRings = () => ({
  innerRing1: {},
  innerRing2: {},
  innerRing3: {},
  innerRing4: {},
  innerRing5: {},
  innerRing6: {},
  midRing1: {},
  midRing2: {},
  midRing3: {},
});

const createMinimalSaveData = (
  overrides: Partial<SaveData> = {},
): SaveData => ({
  equipmentPage: { equippedGear: {}, inventory: [] },
  talentPage: {
    talentTrees: {},
    inventory: { prismList: [], inverseImageList: [] },
  },
  skillPage: createEmptySkillPage(),
  heroPage: {
    selectedHero: undefined,
    traits: {
      level1: undefined,
      level45: undefined,
      level60: undefined,
      level75: undefined,
    },
    memorySlots: { slot45: undefined, slot60: undefined, slot75: undefined },
    memoryInventory: [],
  },
  pactspiritPage: {
    slot1: { level: 1, rings: createEmptyRings() },
    slot2: { level: 1, rings: createEmptyRings() },
    slot3: { level: 1, rings: createEmptyRings() },
  },
  divinityPage: { placedSlates: [], inventory: [] },
  configurationPage: DEFAULT_CONFIGURATION,
  calculationsPage: { selectedSkillName: undefined },
  ...overrides,
});

test("loadSave converts gear with parseable affix", () => {
  const weapon = {
    id: "test-weapon",
    equipmentType: "One-Handed Sword" as const,
    prefixes: ["+10% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "test-weapon" } },
      inventory: [weapon],
    },
  });

  const loadout = loadSave(saveData);

  expect(loadout.gearPage.equippedGear.mainHand).toBeDefined();
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  expect(mainHand.equipmentType).toBe("One-Handed Sword");
  const affixes = getGearAffixes(mainHand);
  expect(affixes).toHaveLength(1);

  const affix = affixes[0];
  expect(getAffixText(affix)).toBe("+10% fire damage");
  expect(affix.src).toBe("Gear#mainHand");
  const mods = getAffixMods(affix);
  expect(mods).toHaveLength(1);
  expect(mods[0].type).toBe("DmgPct");
  expect(mods[0].src).toBe("Gear#mainHand");
});

test("loadSave handles affix that fails to parse", () => {
  const helmet = {
    id: "test-helmet",
    equipmentType: "Helmet (STR)" as const,
    suffixes: ["some unparseable affix text"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { helmet: { id: "test-helmet" } },
      inventory: [helmet],
    },
  });

  const loadout = loadSave(saveData);

  expect(loadout.gearPage.equippedGear.helmet).toBeDefined();
  const loadedHelmet = loadout.gearPage.equippedGear.helmet!;
  const affixes = getGearAffixes(loadedHelmet);
  expect(affixes).toHaveLength(1);

  const affix = affixes[0];
  expect(getAffixText(affix)).toBe("some unparseable affix text");
  expect(affix.src).toBe("Gear#helmet");
  expect(getAffixMods(affix)).toHaveLength(0);
});

test("loadSave sets correct src for different gear slots", () => {
  const helmetGear = {
    id: "h",
    equipmentType: "Helmet (STR)" as const,
    suffixes: ["+5% armor"],
  };
  const leftRingGear = {
    id: "lr",
    equipmentType: "Ring" as const,
    prefixes: ["+5% max life"],
  };
  const offHandGear = {
    id: "oh",
    equipmentType: "Shield (STR)" as const,
    suffixes: ["+4% attack block chance"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: {
        helmet: { id: "h" },
        leftRing: { id: "lr" },
        offHand: { id: "oh" },
      },
      inventory: [helmetGear, leftRingGear, offHandGear],
    },
  });

  const loadout = loadSave(saveData);
  const equippedGear = loadout.gearPage.equippedGear;

  expect(getGearAffixes(equippedGear.helmet!)[0].src).toBe("Gear#helmet");
  expect(getGearAffixes(equippedGear.leftRing!)[0].src).toBe("Gear#leftRing");
  expect(getGearAffixes(equippedGear.offHand!)[0].src).toBe("Gear#offHand");
});

test("loadSave handles empty gear page", () => {
  const saveData = createMinimalSaveData({
    equipmentPage: { equippedGear: {}, inventory: [] },
  });

  const loadout = loadSave(saveData);

  expect(loadout.gearPage.equippedGear).toEqual({});
  expect(loadout.gearPage.inventory).toEqual([]);
});

test("loadSave converts gear in inventory", () => {
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: {},
      inventory: [
        {
          id: "inv-sword",
          equipmentType: "One-Handed Sword",
          prefixes: ["+20% cold damage"],
        },
        {
          id: "inv-helmet",
          equipmentType: "Helmet (STR)",
          prefixes: ["unparseable text"],
          suffixes: ["+15% lightning damage"],
        },
      ],
    },
  });

  const loadout = loadSave(saveData);

  expect(loadout.gearPage.inventory).toHaveLength(2);

  const sword = loadout.gearPage.inventory[0];
  expect(sword.equipmentType).toBe("One-Handed Sword");
  const swordAffixes = getGearAffixes(sword);
  expect(swordAffixes).toHaveLength(1);
  expect(getAffixText(swordAffixes[0])).toBe("+20% cold damage");
  expect(swordAffixes[0].src).toBeUndefined();
  const swordMods = getAffixMods(swordAffixes[0]);
  expect(swordMods).toHaveLength(1);
  expect(swordMods[0].type).toBe("DmgPct");
  expect(swordMods[0].src).toBeUndefined();

  const helmet = loadout.gearPage.inventory[1];
  expect(helmet.equipmentType).toBe("Helmet (STR)");
  const helmetAffixes = getGearAffixes(helmet);
  expect(helmetAffixes).toHaveLength(2);
  expect(getAffixMods(helmetAffixes[0])).toHaveLength(0);
  expect(getAffixMods(helmetAffixes[1])).toHaveLength(1);
});

test("loadSave preserves UI fields (id, rarity, legendaryName)", () => {
  const helmetGear = {
    id: "legendary-helm-123",
    equipmentType: "Helmet (STR)" as const,
    rarity: "legendary" as const,
    legendaryName: "Crown of the Eternal",
    legendaryAffixes: ["+50% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { helmet: { id: "legendary-helm-123" } },
      inventory: [
        helmetGear,
        {
          id: "inv-item-456",
          equipmentType: "Ring",
          rarity: "rare",
          prefixes: ["+5% max life"],
        },
      ],
    },
  });

  const loadout = loadSave(saveData);

  // Check equipped gear preserves UI fields
  const helmet = loadout.gearPage.equippedGear.helmet!;
  expect(helmet.id).toBe("legendary-helm-123");
  expect(helmet.rarity).toBe("legendary");
  expect(helmet.legendaryName).toBe("Crown of the Eternal");

  // Check inventory preserves UI fields
  const ring = loadout.gearPage.inventory[1];
  expect(ring.id).toBe("inv-item-456");
  expect(ring.rarity).toBe("rare");
  expect(ring.legendaryName).toBeUndefined();
});

test("loadSave extracts bracket prefix as specialName", () => {
  const weapon = {
    id: "test-weapon",
    equipmentType: "One-Handed Sword" as const,
    prefixes: ["[Endless Fervor] +18% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "test-weapon" } },
      inventory: [weapon],
    },
  });

  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  const affixes = getGearAffixes(mainHand);
  expect(affixes).toHaveLength(1);

  const affix = affixes[0];
  expect(affix.specialName).toBe("Endless Fervor");
  expect(getAffixText(affix)).toBe("+18% fire damage");
  const mods = getAffixMods(affix);
  expect(mods).toHaveLength(1);
  expect(mods[0].type).toBe("DmgPct");
});

test("loadSave does not set specialName for affixes without bracket prefix", () => {
  const weapon = {
    id: "test-weapon",
    equipmentType: "One-Handed Sword" as const,
    prefixes: ["+10% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "test-weapon" } },
      inventory: [weapon],
    },
  });

  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  const affixes = getGearAffixes(mainHand);
  expect(affixes[0].specialName).toBeUndefined();
});

test("loadSave extracts voraxLegendaryName from Vorax Gear affixes", () => {
  const voraxGear = {
    id: "vorax-1",
    equipmentType: "Vorax Gear" as const,
    prefixes: ["Double Rainbow+10% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "vorax-1" } },
      inventory: [voraxGear],
    },
  });

  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  const affixes = getGearAffixes(mainHand);
  expect(affixes).toHaveLength(1);
  expect(affixes[0].voraxLegendaryName).toBe("Double Rainbow");
  expect(getAffixText(affixes[0])).toBe("+10% fire damage");
});

test("loadSave does not extract voraxLegendaryName from non-Vorax gear", () => {
  const weapon = {
    id: "sword-1",
    equipmentType: "One-Handed Sword" as const,
    prefixes: ["Double Rainbow+10% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "sword-1" } },
      inventory: [weapon],
    },
  });

  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  const affixes = getGearAffixes(mainHand);
  expect(affixes[0].voraxLegendaryName).toBeUndefined();
  expect(getAffixText(affixes[0])).toBe("Double Rainbow+10% fire damage");
});

test("loadSave does not set voraxLegendaryName when Vorax affix has no legendary prefix", () => {
  const voraxGear = {
    id: "vorax-2",
    equipmentType: "Vorax Gear" as const,
    prefixes: ["+10% fire damage"],
  };
  const saveData = createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "vorax-2" } },
      inventory: [voraxGear],
    },
  });

  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  const affixes = getGearAffixes(mainHand);
  expect(affixes[0].voraxLegendaryName).toBeUndefined();
  expect(getAffixText(affixes[0])).toBe("+10% fire damage");
});

// Helper to load and fetch first prefix affix on mainHand
const loadFirstPrefix = (saveData: SaveData) => {
  const loadout = loadSave(saveData);
  const mainHand = loadout.gearPage.equippedGear.mainHand!;
  return getGearAffixes(mainHand)[0];
};

const mainHandSave = (
  equipmentType:
    | "One-Handed Sword"
    | "Helmet (STR)"
    | "Claw"
    | "Vorax Gear"
    | "Ring",
  gearOverrides: Partial<{
    prefixes: string[];
    suffixes: string[];
    legendaryAffixes: string[];
    blendAffix: string;
    rarity: "rare" | "legendary" | "vorax";
    legendaryName: string;
  }>,
): SaveData =>
  createMinimalSaveData({
    equipmentPage: {
      equippedGear: { mainHand: { id: "g1" } },
      inventory: [{ id: "g1", equipmentType, ...gearOverrides }],
    },
  });

describe("convertAffix tier reverse-lookup", () => {
  test("in-range roll attaches tier and quality (midpoint ~50%)", () => {
    // Helmet (STR) T1 Max Life: "+(154-220) Max Life" → midpoint 187
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+187 Max Life"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBe("1");
    expect(affix.quality).toBeGreaterThan(40);
    expect(affix.quality).toBeLessThan(60);
  });

  test("low-end of range produces quality near 0", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+154 Max Life"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBe("1");
    expect(affix.quality).toBe(0);
  });

  test("high-end of range produces quality near 100", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+220 Max Life"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBe("1");
    expect(affix.quality).toBe(100);
  });

  test("T0 top-tier roll", () => {
    // Helmet (STR) T0 Max Life: "+(221-286)" → pick 250
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+250 Max Life"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBe("0");
    expect(affix.quality).toBeGreaterThan(0);
    expect(affix.quality).toBeLessThan(100);
  });

  test("out-of-range roll picks closest tier and leaves quality undefined", () => {
    // 500 Max Life is above T0 top (286) — should fall back to closest tier.
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+500 Max Life"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBeDefined();
    expect(affix.quality).toBeUndefined();
  });

  test("multi-range template averages quality across ranges", () => {
    // Claw Sweet Dream T2 Fire: "Adds (9-14) - (15-20) Fire Damage to Attacks"
    // (11-9)/(14-9)=0.4, (17-15)/(20-15)=0.4 → avg 40
    const saveData = mainHandSave("Claw", {
      blendAffix: "Adds 11 - 17 Fire Damage to Attacks",
    });
    const loadout = loadSave(saveData);
    const claw = loadout.gearPage.equippedGear.mainHand!;
    expect(claw.blendAffix).toBeDefined();
    expect(claw.blendAffix!.tier).toBe("2");
    expect(claw.blendAffix!.quality).toBeCloseTo(40, 0);
  });

  test("unrecognized affix text leaves tier/quality undefined", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["some unparseable text"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBeUndefined();
    expect(affix.quality).toBeUndefined();
  });

  test("legendary affix text not in gear pool gets no tier", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      rarity: "legendary",
      legendaryName: "Aeterna Martyr",
      legendaryAffixes: ["-20% chance to inflict Trauma"],
    });
    const loadout = loadSave(saveData);
    const helmet = loadout.gearPage.equippedGear.mainHand!;
    const legAffixes = helmet.legendaryAffixes ?? [];
    expect(legAffixes).toHaveLength(1);
    expect(legAffixes[0].tier).toBeUndefined();
    expect(legAffixes[0].quality).toBeUndefined();
  });

  test("Vorax gear affix gets no tier (not in standard pool)", () => {
    const saveData = mainHandSave("Vorax Gear", {
      prefixes: ["Double Rainbow+10% fire damage"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBeUndefined();
    expect(affix.quality).toBeUndefined();
  });

  test("custom affix text leaves tier undefined", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["+999999% fantasy stat"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.tier).toBeUndefined();
  });
});

describe("convertAffix bracket-prefix stripping", () => {
  test("strips per-line [Legendary Name] on every line of blendAffix", () => {
    // Vorax blendAffix pattern: "[Name] ..." on every line
    const blendText =
      "[Malign Embrace] +10% fire damage\n[Malign Embrace] +10% cold damage";
    const saveData = mainHandSave("Helmet (STR)", { blendAffix: blendText });
    const loadout = loadSave(saveData);
    const helmet = loadout.gearPage.equippedGear.mainHand!;
    const blend = helmet.blendAffix!;

    // First line's bracket stripped into specialName
    expect(blend.specialName).toBe("Malign Embrace");
    expect(blend.affixLines).toHaveLength(2);
    expect(blend.affixLines[0].text).toBe("+10% fire damage");
    // Line 2 retains the original bracket-prefixed text verbatim…
    expect(blend.affixLines[1].text).toBe("[Malign Embrace] +10% cold damage");
    // …but mods parse correctly because bracket was stripped before parseMod
    expect(blend.affixLines[0].mods).toBeDefined();
    expect(blend.affixLines[0].mods!.length).toBeGreaterThan(0);
    expect(blend.affixLines[1].mods).toBeDefined();
    expect(blend.affixLines[1].mods!.length).toBeGreaterThan(0);
  });

  test("single-line bracket affix strips prefix into specialName", () => {
    const saveData = mainHandSave("One-Handed Sword", {
      prefixes: ["[Some Name] +10% fire damage"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Some Name");
    expect(affix.affixLines[0].text).toBe("+10% fire damage");
    expect(affix.affixLines[0].mods).toBeDefined();
    expect(affix.affixLines[0].mods!.length).toBeGreaterThan(0);
  });
});

describe("convertSupportSkillSlot legacy magnificent/noble fallback", () => {
  test("resolves legacy short Vendetta support to full Magnificent name", () => {
    const saveData = createMinimalSaveData({
      skillPage: {
        activeSkills: {
          1: {
            skillName: "Shackles of Malice",
            enabled: true,
            supportSkills: {
              1: { skillType: "support", name: "Vendetta" as never },
            },
          },
        },
        passiveSkills: {},
      },
    });

    const loadout = loadSave(saveData);
    const support = loadout.skillPage.activeSkills[1]!.supportSkills[1]!;
    expect(support.skillType).toBe("magnificent_support");
    expect(support.name).toBe("Shackles of Malice: Vendetta (Magnificent)");
    expect(support.affixes.length).toBeGreaterThan(0);
  });

  test("unknown legacy support name falls through to support shape", () => {
    const saveData = createMinimalSaveData({
      skillPage: {
        activeSkills: {
          1: {
            skillName: "Shackles of Malice",
            enabled: true,
            supportSkills: {
              1: { skillType: "support", name: "Nonexistent Support" as never },
            },
          },
        },
        passiveSkills: {},
      },
    });

    const loadout = loadSave(saveData);
    const support = loadout.skillPage.activeSkills[1]!.supportSkills[1]!;
    expect(support.skillType).toBe("support");
    expect(support.name).toBe("Nonexistent Support");
    expect(support.affixes).toEqual([]);
  });
});

describe("encodeBuildCode / decodeBuildCode round-trip", () => {
  test("round-trips SaveData without loss", () => {
    const original = createMinimalSaveData({
      equipmentPage: {
        equippedGear: { mainHand: { id: "rt-sword" } },
        inventory: [
          {
            id: "rt-sword",
            equipmentType: "One-Handed Sword",
            rarity: "rare",
            prefixes: ["+10% fire damage"],
            suffixes: ["+5% attack speed"],
          },
        ],
      },
      skillPage: {
        activeSkills: {
          1: {
            skillName: "Berserking Blade",
            enabled: true,
            supportSkills: {
              1: { skillType: "support", name: "Added Fire Damage", level: 20 },
            },
          },
        },
        passiveSkills: {},
      },
    });

    const encoded = encodeBuildCode(original);
    const decoded = decodeBuildCode(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.equipmentPage).toEqual(original.equipmentPage);
    expect(decoded!.skillPage).toEqual(original.skillPage);

    // Loading the decoded data produces a valid loadout
    const loadout = loadSave(decoded!);
    expect(loadout.gearPage.equippedGear.mainHand).toBeDefined();
    expect(loadout.skillPage.activeSkills[1]!.skillName).toBe(
      "Berserking Blade",
    );
  });
});

describe("hyperlink expansion", () => {
  test("single-line affix matching hyperlink name expands", () => {
    // "Nearby" → "Within 6m"
    const saveData = mainHandSave("Helmet (STR)", { prefixes: ["Nearby"] });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Nearby");
    expect(affix.affixLines).toHaveLength(1);
    expect(affix.affixLines[0].text).toBe("Within 6m");
  });

  test("multi-line hyperlink expansion produces multiple affixLines", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["Multistrike"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Multistrike");
    expect(affix.affixLines.length).toBeGreaterThan(1);
  });

  test("non-hyperlink single-line affix is not expanded", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["Some totally unrelated text"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBeUndefined();
    expect(affix.affixLines).toHaveLength(1);
    expect(affix.affixLines[0].text).toBe("Some totally unrelated text");
  });
});

describe("core talent conversion", () => {
  test("affix text matching a core talent expands into talent affix lines", () => {
    // "Endless Fervor": "Have Fervor\n+12% Fervor effect"
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["Endless Fervor"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Endless Fervor");
    expect(affix.affixLines).toHaveLength(2);
    expect(affix.affixLines[0].text).toBe("Have Fervor");
    expect(affix.affixLines[1].text).toBe("+12% Fervor effect");
  });

  test("core talent match is case-insensitive", () => {
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["endless fervor"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Endless Fervor");
    expect(affix.affixLines).toHaveLength(2);
  });

  test("core talent takes precedence over hyperlink on name collision", () => {
    // "Elimination" exists in both CoreTalents and Hyperlinks
    const saveData = mainHandSave("Helmet (STR)", {
      prefixes: ["Elimination"],
    });
    const affix = loadFirstPrefix(saveData);
    expect(affix.specialName).toBe("Elimination");
    expect(
      affix.affixLines.some((l) => l.text.toLowerCase().includes("eliminate")),
    ).toBe(true);
  });
});

describe("buildSupportSkillAffixes", () => {
  test("returns empty array for unknown skill", () => {
    expect(buildSupportSkillAffixes("Not A Real Skill", 1)).toEqual([]);
  });

  test("level 1 Added Fire Damage uses levelValues[0] = 1", () => {
    const affixes = buildSupportSkillAffixes("Added Fire Damage", 1);
    expect(affixes).toHaveLength(1);
    expect(affixes[0].text).toBe("The supported skill adds 1 - 3 Fire Damage");
  });

  test("level 20 Added Fire Damage uses levelValues[19] = 73", () => {
    const affixes = buildSupportSkillAffixes("Added Fire Damage", 20);
    expect(affixes[0].text).toBe("The supported skill adds 73 - 3 Fire Damage");
  });

  test("clamps level above 40 to top-tier value (level 999 → idx 39 = 89)", () => {
    const affixes = buildSupportSkillAffixes("Added Fire Damage", 999);
    expect(affixes[0].text).toBe("The supported skill adds 89 - 3 Fire Damage");
  });

  test("clamps level below 1 to level-1 value", () => {
    const affixes = buildSupportSkillAffixes("Added Fire Damage", 0);
    expect(affixes[0].text).toBe("The supported skill adds 1 - 3 Fire Damage");
    const neg = buildSupportSkillAffixes("Added Fire Damage", -5);
    expect(neg[0].text).toBe("The supported skill adds 1 - 3 Fire Damage");
  });

  test("level 15 Added Cold Damage uses levelValues[14] = 28", () => {
    const affixes = buildSupportSkillAffixes("Added Cold Damage", 15);
    expect(affixes).toHaveLength(1);
    expect(affixes[0].text).toBe(
      "Adds 28 - 3 Cold Damage to the supported skill",
    );
  });
});
