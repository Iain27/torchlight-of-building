import { createContext, type ReactNode, useContext, useMemo } from "react";
import { calculateOffense, type OffenseResults } from "@/src/tli/calcs/offense";
import { useConfiguration, useLoadout } from "../../stores/builderStore";

const OffenseResultsContext = createContext<OffenseResults | undefined>(
  undefined,
);

export const OffenseResultsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const loadout = useLoadout();
  const configuration = useConfiguration();

  const offenseResults = useMemo(
    () => calculateOffense({ loadout, configuration }),
    [loadout, configuration],
  );

  return (
    <OffenseResultsContext value={offenseResults}>
      {children}
    </OffenseResultsContext>
  );
};

export const useOffenseResults = (): OffenseResults => {
  const ctx = useContext(OffenseResultsContext);
  if (ctx === undefined) {
    throw new Error(
      "useOffenseResults must be used within an OffenseResultsProvider",
    );
  }
  return ctx;
};
