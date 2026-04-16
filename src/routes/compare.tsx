import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { decodeBuildCode } from "../lib/build-code";
import { calculateOffense, type OffenseResults } from "../tli/calcs/offense";
import { DEFAULT_CONFIGURATION } from "../tli/core";
import { loadSave } from "../tli/storage/load-save";

export const Route = createFileRoute("/compare")({ component: ComparePage });

interface DecodedBuild {
  results: OffenseResults;
  label: string;
}

const decode = (code: string, label: string): DecodedBuild | string => {
  const trimmed = code.trim();
  if (trimmed === "") return "empty code";
  try {
    const saveData = decodeBuildCode(trimmed);
    if (saveData === null) return "decode failed";
    const loadout = loadSave(saveData);
    const config = {
      ...DEFAULT_CONFIGURATION,
      ...(
        saveData as unknown as {
          configurationPage?: typeof DEFAULT_CONFIGURATION;
        }
      ).configurationPage,
    };
    const results = calculateOffense({ loadout, configuration: config });
    return { results, label };
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
};

const formatDps = (n: number | undefined): string => {
  if (n === undefined || n === 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

const formatDelta = (a: number, b: number): string => {
  if (a === 0) return b > 0 ? "+∞%" : "—";
  const pct = ((b - a) / a) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
};

function ComparePage(): React.ReactNode {
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  const buildA = useMemo(() => decode(codeA, "Build A"), [codeA]);
  const buildB = useMemo(() => decode(codeB, "Build B"), [codeB]);

  const bothDecoded = typeof buildA !== "string" && typeof buildB !== "string";

  // Collect union of skill names across both builds
  const skillNames = useMemo(() => {
    if (!bothDecoded) return [];
    const set = new Set<string>();
    for (const k of Object.keys(buildA.results.skills)) set.add(k);
    for (const k of Object.keys(buildB.results.skills)) set.add(k);
    return [...set].sort();
  }, [buildA, buildB, bothDecoded]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-50">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Build Compare</h1>
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Home
          </a>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="codeA"
              className="mb-1 block text-xs font-semibold text-amber-400"
            >
              Build A
            </label>
            <textarea
              id="codeA"
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              placeholder="Paste build code"
              className="h-32 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
            {typeof buildA === "string" && codeA.trim() !== "" && (
              <p className="mt-1 text-xs text-red-400">{buildA}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="codeB"
              className="mb-1 block text-xs font-semibold text-amber-400"
            >
              Build B
            </label>
            <textarea
              id="codeB"
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              placeholder="Paste build code"
              className="h-32 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
            {typeof buildB === "string" && codeB.trim() !== "" && (
              <p className="mt-1 text-xs text-red-400">{buildB}</p>
            )}
          </div>
        </div>

        {bothDecoded && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900">
            <div className="grid grid-cols-4 gap-2 border-b border-zinc-700 bg-zinc-900/50 p-3 text-xs font-semibold text-zinc-400">
              <div>Skill</div>
              <div className="text-right">A DPS</div>
              <div className="text-right">B DPS</div>
              <div className="text-right">Δ</div>
            </div>
            {skillNames.length === 0 && (
              <div className="p-3 text-sm text-zinc-500">
                Neither build has any enabled implemented skills.
              </div>
            )}
            {skillNames.map((name) => {
              const a =
                (buildA.results.skills as Record<string, { totalDps: number }>)[
                  name
                ]?.totalDps ?? 0;
              const b =
                (buildB.results.skills as Record<string, { totalDps: number }>)[
                  name
                ]?.totalDps ?? 0;
              const pct = a === 0 ? 0 : ((b - a) / a) * 100;
              const color =
                pct > 0
                  ? "text-green-400"
                  : pct < 0
                    ? "text-red-400"
                    : "text-zinc-500";
              return (
                <div
                  key={name}
                  className="grid grid-cols-4 gap-2 border-b border-zinc-800 p-3 text-sm last:border-b-0"
                >
                  <div className="text-zinc-200">{name}</div>
                  <div className="text-right font-mono text-zinc-300">
                    {formatDps(a)}
                  </div>
                  <div className="text-right font-mono text-zinc-300">
                    {formatDps(b)}
                  </div>
                  <div className={`text-right font-mono ${color}`}>
                    {formatDelta(a, b)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bothDecoded && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <StatCard
              label="Max Life"
              a={buildA.results.resourcePool.maxLife}
              b={buildB.results.resourcePool.maxLife}
            />
            <StatCard
              label="Max Mana"
              a={buildA.results.resourcePool.maxMana}
              b={buildB.results.resourcePool.maxMana}
            />
            <StatCard
              label="Str / Dex / Int"
              a={
                buildA.results.resourcePool.stats.str +
                buildA.results.resourcePool.stats.dex +
                buildA.results.resourcePool.stats.int
              }
              b={
                buildB.results.resourcePool.stats.str +
                buildB.results.resourcePool.stats.dex +
                buildB.results.resourcePool.stats.int
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}): React.ReactNode => {
  const delta = a === 0 ? 0 : ((b - a) / a) * 100;
  const color =
    delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-zinc-500";
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-sm text-zinc-300">{a.toFixed(0)}</span>
        <span className="text-zinc-600">→</span>
        <span className="font-mono text-sm text-zinc-300">{b.toFixed(0)}</span>
        <span className={`ml-auto font-mono text-xs ${color}`}>
          {formatDelta(a, b)}
        </span>
      </div>
    </div>
  );
};
