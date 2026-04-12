import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import type { Prism } from "../data/prism/types";
import { assertCount } from "./lib/assertions";

const BASE_URL = "https://tlidb.com/en";
const PRISM_PAGE_PATH = "Ethereal_Prism";
const OUTPUT_PATH = join(process.cwd(), ".garbage", "tlidb", "prism.html");

// ============================================================================
// Fetching
// ============================================================================

const fetchPrismPage = async (): Promise<void> => {
  const url = `${BASE_URL}/${PRISM_PAGE_PATH}`;
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const html = await response.text();
  const dir = join(process.cwd(), ".garbage", "tlidb");
  await mkdir(dir, { recursive: true });
  await writeFile(OUTPUT_PATH, html, "utf-8");
  console.log(`Saved to ${OUTPUT_PATH}`);
};

const readCachedPrismPage = async (): Promise<string> => {
  return readFile(OUTPUT_PATH, "utf-8");
};

// ============================================================================
// HTML cleaning
// ============================================================================

// Clean tlidb HTML to plain text, preserving newlines from <br/> tags
const cleanTlidbHtml = (html: string): string => {
  const $ = cheerio.load(html, null, false);

  // Replace <br> with newlines
  $("br").replaceWith("\n");

  // Replace <e> hyperlink elements with just their text content
  $("e").each((_, el) => {
    $(el).replaceWith($(el).text());
  });

  // Replace span.Hyperlink elements with just their text content
  $("span.Hyperlink").each((_, el) => {
    $(el).replaceWith($(el).text());
  });

  // Get text content (strips remaining HTML like span.text-mod)
  let text = $.text();

  // Convert en-dash to hyphen
  text = text.replace(/\u2013/g, "-");

  // Decode common HTML entities
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Trim each line and remove empty lines
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
};

// ============================================================================
// Parsing
// ============================================================================

const extractBaseAffixes = ($: cheerio.CheerioAPI): Prism[] => {
  const items: Prism[] = [];
  const baseAffixTable = $("#BaseAffix table tbody tr");
  console.log(`Found ${baseAffixTable.length} base affix rows`);

  baseAffixTable.each((_, row) => {
    const td = $(row).find("td").first();
    const rawHtml = td.html() ?? "";
    const affix = cleanTlidbHtml(rawHtml);

    items.push({ type: "Base Affix", rarity: "", affix });
  });

  return items;
};

const extractRandomAffixes = ($: cheerio.CheerioAPI): Prism[] => {
  const items: Prism[] = [];
  const randomAffixTable = $("#RandomAffix table tbody tr");
  console.log(`Found ${randomAffixTable.length} random affix rows`);

  randomAffixTable.each((_, row) => {
    const tds = $(row).find("td");
    const modifierTd = $(tds[0]);
    const typeTd = $(tds[1]);

    const rawHtml = modifierTd.html() ?? "";
    const affix = cleanTlidbHtml(rawHtml);

    // Parse type and rarity from the Type column link text
    // e.g., "Prism Gauge - Rare" or "Prism Gauge - Legendary"
    const typeLink = typeTd?.find("a");
    const typeLinkText = typeLink?.text().trim() ?? "";

    let type = "Random Affix";
    let rarity = "";

    if (typeLinkText !== "") {
      const parts = typeLinkText.split(" - ");
      type = parts[0]?.trim() ?? "Random Affix";
      rarity = parts[1]?.trim() ?? "";
    }

    items.push({ type, rarity, affix });
  });

  return items;
};

const extractPrismData = (html: string): Prism[] => {
  const $ = cheerio.load(html);
  const baseAffixes = extractBaseAffixes($);
  const randomAffixes = extractRandomAffixes($);
  return [...baseAffixes, ...randomAffixes];
};

// ============================================================================
// Code generation
// ============================================================================

const generateDataFile = (items: Prism[]): string => {
  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-prism-data.ts
import type { Prism } from "./types";

export const Prisms: readonly Prism[] = ${JSON.stringify(items)};
`;
};

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  if (options.refetch) {
    await fetchPrismPage();
    console.log("");
  }

  console.log("Reading cached prism page...");
  const html = await readCachedPrismPage();

  console.log("Extracting prism data...");
  const items = extractPrismData(html);
  console.log(`Extracted ${items.length} prisms`);
  assertCount("prisms", items.length, 387);

  const outDir = join(process.cwd(), "src", "data", "prism");
  await mkdir(outDir, { recursive: true });

  const dataPath = join(outDir, "prisms.ts");
  await writeFile(dataPath, generateDataFile(items), "utf-8");
  console.log(`Generated prisms.ts (${items.length} items)`);

  console.log("\nCode generation complete!");
  execSync("pnpm format", { stdio: "inherit" });
};

program
  .description("Generate prism data from tlidb")
  .option("--refetch", "Refetch HTML page from tlidb before generating")
  .action((options: Options) => {
    main(options)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
      });
  })
  .parse();

export { main as generatePrismData };
