import type { SaveData } from "./save-data";
import {
  generateSaveId,
  loadSavesIndex,
  type SaveMetadata,
  type SavesIndex,
  saveSaveData,
  saveSavesIndex,
} from "./saves";

export interface ImportResult {
  saveId: string;
  metadata: SaveMetadata;
}

export const importBuildAsNew = (
  saveData: SaveData,
): ImportResult | undefined => {
  const now = Date.now();
  const newSaveId = generateSaveId();
  const newMetadata: SaveMetadata = {
    id: newSaveId,
    name: "Imported Build",
    createdAt: now,
    updatedAt: now,
  };

  const success = saveSaveData(newSaveId, saveData);
  if (!success) {
    return undefined;
  }

  const currentIndex = loadSavesIndex();
  const newIndex: SavesIndex = {
    currentSaveId: newSaveId,
    saves: [...currentIndex.saves, newMetadata],
  };
  saveSavesIndex(newIndex);

  return { saveId: newSaveId, metadata: newMetadata };
};

export const importBuildReplace = (
  saveId: string,
  saveData: SaveData,
): ImportResult | undefined => {
  const success = saveSaveData(saveId, saveData);
  if (!success) {
    return undefined;
  }

  const currentIndex = loadSavesIndex();
  const existingMeta = currentIndex.saves.find((s) => s.id === saveId);
  if (existingMeta === undefined) {
    return undefined;
  }

  const updatedMeta: SaveMetadata = { ...existingMeta, updatedAt: Date.now() };
  const newIndex: SavesIndex = {
    ...currentIndex,
    saves: currentIndex.saves.map((s) => (s.id === saveId ? updatedMeta : s)),
  };
  saveSavesIndex(newIndex);

  return { saveId, metadata: updatedMeta };
};
