import { useEffect, useState } from "react";
import {
  Modal,
  ModalActions,
  ModalButton,
  ModalDescription,
} from "../ui/Modal";

export type ImportMode = "new" | "replace";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (buildCode: string, mode: ImportMode) => boolean;
  hasActiveBuild: boolean;
}

export const ImportModal = ({
  isOpen,
  onClose,
  onImport,
  hasActiveBuild,
}: ImportModalProps) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const handleImport = (mode: ImportMode) => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError("Please enter a build code");
      return;
    }

    const success = onImport(trimmed, mode);
    if (success) {
      setInputValue("");
      setError(undefined);
      onClose();
    } else {
      setError("Invalid build code. Please check and try again.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setError(undefined);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Loadout">
      <ModalDescription>
        Paste a build code to load a saved build:
      </ModalDescription>

      <textarea
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setError(undefined);
        }}
        placeholder="Paste build code here..."
        className="w-full h-24 p-3 bg-zinc-800 text-zinc-50 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none font-mono text-sm placeholder:text-zinc-500"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleImport(hasActiveBuild ? "replace" : "new");
          }
        }}
      />

      {error !== undefined && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}

      <ModalActions>
        {hasActiveBuild && (
          <ModalButton onClick={() => handleImport("replace")} fullWidth>
            Replace Current Build
          </ModalButton>
        )}
        <ModalButton
          onClick={() => handleImport("new")}
          variant={hasActiveBuild ? "secondary" : "primary"}
          fullWidth
        >
          {hasActiveBuild ? "Create New Build" : "Import"}
        </ModalButton>
        <ModalButton onClick={onClose} variant="secondary">
          Cancel
        </ModalButton>
      </ModalActions>
    </Modal>
  );
};
