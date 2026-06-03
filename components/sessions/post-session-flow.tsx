"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { submitSessionRating } from "@/lib/firebaseServices";
import { ResourceComposer } from "@/components/repository/resource-composer";
import type { BackendUser } from "@/lib/mockUser";
import type { ApiSession } from "@/lib/firebaseServices";

type PostSessionFlowProps = {
  session: ApiSession;
  currentUser: BackendUser;
  onComplete: () => void;
};

export function PostSessionFlow({ session, currentUser, onComplete }: PostSessionFlowProps) {
  const [step, setStep] = useState<"rating" | "contribution_prompt" | "composer">("rating");
  
  // Rating State
  const [mentorRating, setMentorRating] = useState(0);
  const [sessionRating, setSessionRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const isMentor = session.mentorId === currentUser._id;
  
  const handleRatingSubmit = async () => {
    setSubmittingRating(true);
    try {
      await submitSessionRating(currentUser._id, {
        sessionId: session._id,
        mentorId: session.mentorId,
        learnerId: session.learnerId,
        mentorRating: isMentor ? 0 : mentorRating, // Mentors don't rate themselves
        sessionRating,
        feedback,
      });
      setStep("contribution_prompt");
    } catch (e) {
      console.error(e);
      // Proceed anyway to not block them
      setStep("contribution_prompt");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (step === "composer") {
    return (
      <ResourceComposer
        open={true}
        currentUser={currentUser}
        sessionContext={{
          sessionId: session._id,
          sessionTitle: session.title,
          sessionMentorName: session.mentor?.name ?? "Unknown",
          sessionSkill: session.skill,
          participantIds: [session.mentorId, session.learnerId],
        }}
        onClose={onComplete}
        onSaved={onComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl ring-1 ring-white/10">
        {step === "rating" && (
          <div className="p-6">
            <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">Rate Session</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Your feedback helps us improve the community.
            </p>
            
            <div className="mt-6 space-y-6">
              {!isMentor && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Mentor Rating</label>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setMentorRating(star)} className="transition hover:scale-110">
                        <Icon name="star" filled={mentorRating >= star} className={`text-3xl ${mentorRating >= star ? "text-amber-400" : "text-stone-700"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Session Rating</label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setSessionRating(star)} className="transition hover:scale-110">
                      <Icon name="star" filled={sessionRating >= star} className={`text-3xl ${sessionRating >= star ? "text-amber-400" : "text-stone-700"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Optional Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-2 w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  rows={3}
                  placeholder="What went well? What could be improved?"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setStep("contribution_prompt")} className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface">Skip</button>
              <button 
                onClick={handleRatingSubmit} 
                disabled={sessionRating === 0 || (!isMentor && mentorRating === 0) || submittingRating}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingRating ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        )}

        {step === "contribution_prompt" && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/30">
              <Icon name="auto_awesome" className="text-3xl" />
            </div>
            <h2 className="mt-6 font-headline text-2xl font-black tracking-tight text-on-surface">Knowledge Contribution</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Would you like to contribute notes or resources from this session to the community?
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button onClick={() => setStep("composer")} className="rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-on-primary shadow-lg transition hover:bg-primary/90">
                Upload Notes or Resource
              </button>
              <button onClick={handleSkip} className="rounded-xl bg-surface-container px-4 py-3.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high">
                Skip for Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
