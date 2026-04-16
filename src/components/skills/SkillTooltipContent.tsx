import { Fragment } from "react";
import { TooltipContent, TooltipTitle } from "@/src/components/ui/Tooltip";
import type { BaseSkill } from "@/src/data/skill/types";
import { isSkillImplemented } from "@/src/tli/skills/is-implemented";

interface SkillTooltipContentProps {
  skill: BaseSkill;
}

const isModularizationSkill = (skill: BaseSkill): boolean =>
  skill.name.startsWith("Module: ") && skill.tags.includes("Synthetic Troop");

export const SkillTooltipContent: React.FC<SkillTooltipContentProps> = ({
  skill,
}) => {
  const implemented = isSkillImplemented(skill);
  const isModule = isModularizationSkill(skill);

  return (
    <>
      <TooltipTitle>{skill.name}</TooltipTitle>
      {!implemented && (
        <div className="text-xs text-red-500 italic mb-2">
          {isModule
            ? "Minion DPS not calculated — minion pipeline not implemented"
            : "Skill not supported in TOB yet"}
        </div>
      )}
      {skill.tags.length > 0 && (
        <div className="text-xs text-zinc-500 mb-2">
          {skill.tags.join(" • ")}
        </div>
      )}
      {skill.description.map((desc, i) => (
        <Fragment key={i}>
          {i > 0 && <hr className="border-zinc-700 my-2" />}
          <TooltipContent>{desc}</TooltipContent>
        </Fragment>
      ))}
    </>
  );
};
