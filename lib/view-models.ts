import type { MentorCardData } from "@/components/cards/mentor-card";
import type { SessionCardData } from "@/components/cards/session-card";
import type { ApiSession } from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatDisplayTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

// ─── Session avatar index (for session card visual variety) ───────────────────
// Session cards still use a palette of cover images (not user avatars).
import { mentorsData } from "@/lib/mock-data";
const sessionVisuals = mentorsData.mentors;
function getSessionVisual(index: number) {
  return sessionVisuals[index % sessionVisuals.length];
}

// ─── Mentor card mapping ──────────────────────────────────────────────────────

/**
 * Maps raw Firestore BackendUser objects to MentorCardData.
 * NO placeholder images — image is left empty so MentorCard renders initials.
 */
export function toMentorCardData(mentors: BackendUser[]): MentorCardData[] {
  return mentors.map((mentor, index) => {
    const offeredSkills =
      mentor.skillsOffered && mentor.skillsOffered.length > 0
        ? mentor.skillsOffered
        : ["General mentorship"];
    const wantedSkills =
      mentor.skillsWanted && mentor.skillsWanted.length > 0
        ? mentor.skillsWanted
        : [];

    return {
      id: mentor._id,
      name: mentor.name,
      role: `${offeredSkills[0]} Mentor`,
      quote:
        wantedSkills.length > 0
          ? `Sharing ${offeredSkills.join(", ")} while exploring ${wantedSkills.join(", ")} through focused exchange.`
          : `Open for guided mentorship in ${offeredSkills.join(", ")} and collaborative skill exchange.`,
      tags: offeredSkills,
      rating: "5.0",       // placeholder until we track actual ratings
      image: "",           // intentionally empty — MentorCard renders initials
      location: "Remote",
      profileHref: `/profile?mentor=${mentor._id}`,
      connectHref: `/profile?mentor=${mentor._id}`,
      featured: index === 0,
      badge: index === 0 ? "Available" : undefined,
    };
  });
}

export function toDashboardSessionCards(sessions: ApiSession[]): SessionCardData[] {
  return sessions.slice(0, 2).map((session, index) => {
    const visual = getSessionVisual(index);

    return {
      variant: "dashboard",
      id: session._id,
      label:
        session.status === "live"
          ? "Live Now"
          : `${formatDisplayDate(session.date)} • ${formatDisplayTime(session.date)}`,
      title: session.title,
      subtitle: `Mentor: ${session.mentor?.name ?? "Unknown Mentor"}`,
      icon: session.status === "live" ? "video_call" : "calendar_today",
      avatar: visual.image,
      href: `/sessions/${session._id}`,
      tone: session.status === "live" ? "primary" : "default",
    };
  });
}

export function toFeaturedSessionCard(session: ApiSession): SessionCardData {
  const visual = getSessionVisual(0);

  return {
    variant: "featured",
    id: session._id,
    title: session.title,
    mentor: session.mentor?.name ?? "Unknown Mentor",
    status: session.status === "live" ? "Live" : "Starting Soon",
    category: session.mentor?.skillsOffered?.[0] ?? "Mentorship",
    image: visual.coverImage ?? visual.image,
    joinHref: `/call/${session._id}`,
    detailHref: `/sessions/${session._id}`,
  };
}

export function toUpcomingSessionCards(sessions: ApiSession[]): SessionCardData[] {
  return sessions.map((session, index) => {
    const visual = getSessionVisual(index);

    return {
      variant: "upcoming",
      id: session._id,
      title: session.title,
      mentor: session.mentor?.name ?? "Unknown Mentor",
      date: formatDisplayDate(session.date),
      time: formatDisplayTime(session.date),
      avatar: visual.image,
      href: `/sessions/${session._id}`,
    };
  });
}

export function toPastSessionCards(sessions: ApiSession[]): SessionCardData[] {
  return sessions.map((session) => ({
    variant: "past",
    id: session._id,
    title: session.title,
    mentor: session.mentor?.name ?? "Unknown Mentor",
    date: formatDisplayDate(session.date),
    quote: `Completed with ${session.learner?.name ?? "a learner"} in the atelier.`,
    ctaLabel: "Details",
    ctaHref: `/sessions/${session._id}`,
  }));
}

export function formatSessionDateParts(date: string) {
  const sessionDate = new Date(date);

  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(sessionDate),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(sessionDate),
    fullDate: formatDisplayDate(date),
    time: formatDisplayTime(date),
  };
}
