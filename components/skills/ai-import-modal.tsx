import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { simulateAiProfileScan, type AiProfileSuggestions, type ExtractedSkill } from "@/lib/ai-skills";
import { cn } from "@/lib/utils";

type AiImportModalProps = {
  isOpen: boolean;
  source: "github" | "linkedin";
  onClose: () => void;
  onAccept: (skillsOffered: string[], skillsWanted: string[], bio: string) => void;
};

export function AiImportModal({ isOpen, source, onClose, onAccept }: AiImportModalProps) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AiProfileSuggestions | null>(null);
  
  // Selection state
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [acceptBio, setAcceptBio] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setSuggestions(null);
      setLoading(true);
      return;
    }

    let isMounted = true;
    setLoading(true);

    simulateAiProfileScan(source).then((data) => {
      if (isMounted) {
        setSuggestions(data);
        // By default, select all skills
        setSelectedSkillIds(new Set(data.skills.map(s => s.id)));
        setAcceptBio(true);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [isOpen, source]);

  if (!isOpen) return null;

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!suggestions) return;
    
    const acceptedSkills = suggestions.skills.filter(s => selectedSkillIds.has(s.id));
    const offered = acceptedSkills.filter(s => s.suggestedRole === "teaching").map(s => s.name);
    const wanted = acceptedSkills.filter(s => s.suggestedRole === "learning").map(s => s.name);
    const bio = acceptBio ? suggestions.bio : "";

    onAccept(offered, wanted, bio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              source === "github" ? "bg-stone-100 text-stone-800" : "bg-blue-100 text-blue-700"
            )}>
              <Icon name={source === "github" ? "code" : "work"} />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold">
                {source === "github" ? "GitHub Analysis" : "LinkedIn Analysis"}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium">
                AI Profile Skill Detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-container-high"
          >
            <Icon name="close" className="text-xl text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icon name="memory" className="text-6xl text-primary animate-pulse mb-6" />
              <h3 className="font-headline text-xl font-bold mb-2">Analyzing Profile...</h3>
              <p className="text-stone-500 text-sm max-w-sm">
                Scanning {source === "github" ? "repositories, languages, and commit patterns" : "experience, education, and technologies"} to build a smarter profile.
              </p>
              
              <div className="w-full max-w-xs bg-surface-container-high rounded-full h-1.5 mt-8 overflow-hidden">
                <div className="bg-primary h-1.5 rounded-full animate-progress w-full origin-left" />
              </div>
            </div>
          ) : suggestions ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Teaching Suggestions */}
              <section>
                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <Icon name="school" className="text-[16px]" /> Suggested Teaching Skills
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.skills.filter(s => s.suggestedRole === "teaching").map(skill => (
                    <SkillToggleCard 
                      key={skill.id} 
                      skill={skill} 
                      selected={selectedSkillIds.has(skill.id)}
                      onToggle={() => toggleSkill(skill.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Learning Suggestions */}
              <section>
                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
                  <Icon name="psychology" className="text-[16px]" /> Suggested Learning Skills
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.skills.filter(s => s.suggestedRole === "learning").map(skill => (
                    <SkillToggleCard 
                      key={skill.id} 
                      skill={skill} 
                      selected={selectedSkillIds.has(skill.id)}
                      onToggle={() => toggleSkill(skill.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Bio Suggestion */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2">
                    <Icon name="edit_note" className="text-[16px]" /> Suggested Bio
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={acceptBio}
                      onChange={(e) => setAcceptBio(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-stone-600">Apply Bio</span>
                  </label>
                </div>
                <div className={cn(
                  "p-4 rounded-xl text-sm leading-relaxed transition-colors border",
                  acceptBio ? "bg-primary-container/20 border-primary/30 text-on-surface" : "bg-surface-container border-outline-variant/30 text-stone-400"
                )}>
                  &ldquo;{suggestions.bio}&rdquo;
                </div>
              </section>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/30 bg-surface-container px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Select the skills you want to import. Nothing will overwrite your existing profile automatically.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Icon name="download_done" className="text-[16px]" />
              Import {selectedSkillIds.size} Skills
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

function SkillToggleCard({ skill, selected, onToggle }: { skill: ExtractedSkill, selected: boolean, onToggle: () => void }) {
  // Color based on confidence
  const confColor = skill.confidence >= 85 ? "bg-green-500" : skill.confidence >= 70 ? "bg-yellow-500" : "bg-orange-500";
  const confText = skill.confidence >= 85 ? "text-green-600" : skill.confidence >= 70 ? "text-yellow-600" : "text-orange-600";

  return (
    <div 
      onClick={onToggle}
      className={cn(
        "relative flex cursor-pointer overflow-hidden rounded-xl border p-3 transition-all hover:shadow-md",
        selected 
          ? "border-primary bg-primary/5 shadow-sm" 
          : "border-outline-variant/30 bg-surface-container hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="pt-1">
          <div className={cn(
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            selected ? "bg-primary border-primary text-white" : "border-stone-400 bg-white"
          )}>
            {selected && <Icon name="check" className="text-[14px]" />}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-sm text-on-surface truncate pr-2">{skill.name}</h4>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-[10px] font-bold", confText)}>{skill.confidence}%</span>
              <div className="h-1.5 w-12 bg-stone-200 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", confColor)} style={{ width: `${skill.confidence}%` }} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 leading-tight line-clamp-2" title={skill.rationale}>
            {skill.rationale}
          </p>
        </div>
      </div>
    </div>
  );
}
