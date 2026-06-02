import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AiImportModal } from "./ai-import-modal";

type SkillImporterProps = {
  onImportComplete: (skillsOffered: string[], skillsWanted: string[], bio: string) => void;
};

export function SkillImporter({ onImportComplete }: SkillImporterProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [importSource, setImportSource] = useState<"github" | "linkedin">("github");

  const handleConnect = (source: "github" | "linkedin") => {
    setImportSource(source);
    setModalOpen(true);
  };

  return (
    <>
      <div className="section-stack border-t border-outline-variant/30 pt-8 mt-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Import Skills (AI Powered)
          </h2>
          <p className="text-sm text-on-surface-variant max-w-xl">
            Automatically build a smarter profile. Connect your external professional graphs and let SkillCache analyze your experience to suggest teaching and learning skills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Button
            variant="surface"
            className="flex items-center gap-2 rounded-xl border border-outline-variant/30 px-5 py-3 text-sm font-bold shadow-sm transition hover:bg-surface-container-high"
            onClick={() => handleConnect("github")}
          >
            <Icon name="code" className="text-stone-600" />
            Connect GitHub
          </Button>

          <Button
            variant="surface"
            className="flex items-center gap-2 rounded-xl border border-outline-variant/30 px-5 py-3 text-sm font-bold shadow-sm transition hover:bg-surface-container-high"
            onClick={() => handleConnect("linkedin")}
          >
            <Icon name="work" className="text-blue-600" />
            Connect LinkedIn
          </Button>
        </div>
      </div>

      <AiImportModal
        isOpen={modalOpen}
        source={importSource}
        onClose={() => setModalOpen(false)}
        onAccept={onImportComplete}
      />
    </>
  );
}
