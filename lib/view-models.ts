import type { MentorCardData } from "@/components/cards/mentor-card";
import type { SessionCardData } from "@/components/cards/session-card";
import { mentorsData } from "@/lib/mock-data";
import type { ApiSession } from "@/lib/api";
import type { BackendUser } from "@/lib/mockUser";

const mentorVisuals = mentorsData.mentors;

function getVisual(index: number) {
  return mentorVisuals[index % mentorVisuals.length];
}

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

export function toMentorCardData(mentors: BackendUser[]): MentorCardData[] {
  return mentors.map((mentor, index) => {
    const visual = getVisual(index);
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
      rating: (4.8 + ((index % 3) * 0.1)).toFixed(1),
      image: visual.image,
      location: visual.location,
      narrative: visual.narrative,
      coverImage: visual.coverImage,
      profileHref: `/profile?mentor=${mentor._id}`,
      connectHref: `/profile?mentor=${mentor._id}`,
      featured: index === 0,
      badge: index === 0 ? "Available" : undefined,
      tilt: visual.tilt,
    };
  });
}

export function toDashboardSessionCards(sessions: ApiSession[]): SessionCardData[] {
  return sessions.slice(0, 2).map((session, index) => {
    const visual = getVisual(index);

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
  const visual = getVisual(0);

  return {
    variant: "featured",
    id: session._id,
    title: session.title,
    mentor: session.mentor?.name ?? "Unknown Mentor",
    status: session.status === "live" ? "Live" : "Starting Soon",
    category: session.mentor?.skillsOffered?.[0] ?? "Mentorship",
    image: visual.coverImage ?? visual.image,
    joinHref: "/call",
    detailHref: `/sessions/${session._id}`,
  };
}

export function toUpcomingSessionCards(sessions: ApiSession[]): SessionCardData[] {
  return sessions.map((session, index) => {
    const visual = getVisual(index);

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
