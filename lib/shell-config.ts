export type RouteKey =
  | "dashboard"
  | "discover"
  | "mentors"
  | "sessions"
  | "sessionDetails"
  | "repository"
  | "resourceDetails"
  | "profile";

export type NavItem = {
  href: string;
  icon: string;
  label: string;
};

export type HeaderConfig = {
  placeholder: string;
  actionLabel: string;
  actionVariant: "primary" | "softPrimary" | "secondary" | "text";
  actionHref: string;
};

export type SidebarConfig = {
  shareIcon?: string;
  showProfileFooter?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/discover", icon: "explore", label: "Discover" },
  { href: "/mentors", icon: "diversity_3", label: "Find Mentors" },
  { href: "/sessions", icon: "calendar_today", label: "Sessions" },
  { href: "/repository", icon: "folder_open", label: "Repository" },
  { href: "/profile", icon: "person", label: "Profile" },
];

const headerConfigs: Record<RouteKey, HeaderConfig> = {
  dashboard: {
    placeholder: "Search mentors, skills, or sessions...",
    actionLabel: "Request Session",
    actionVariant: "primary",
    actionHref: "/sessions",
  },
  discover: {
    placeholder: "Search community...",
    actionLabel: "Browse Mentors",
    actionVariant: "softPrimary",
    actionHref: "/mentors",
  },
  mentors: {
    placeholder: "Search mentors by craft, name, or skill...",
    actionLabel: "Request Session",
    actionVariant: "primary",
    actionHref: "/sessions",
  },
  sessions: {
    placeholder: "Search sessions...",
    actionLabel: "Request Session",
    actionVariant: "primary",
    actionHref: "/sessions",
  },
  sessionDetails: {
    placeholder: "Search sessions, resources...",
    actionLabel: "All Sessions",
    actionVariant: "text",
    actionHref: "/sessions",
  },
  repository: {
    placeholder: "Search the repository...",
    actionLabel: "Request Session",
    actionVariant: "secondary",
    actionHref: "/sessions",
  },
  resourceDetails: {
    placeholder: "Search the atelier...",
    actionLabel: "Request Session",
    actionVariant: "primary",
    actionHref: "/sessions",
  },
  profile: {
    placeholder: "Search mentorships...",
    actionLabel: "Find Mentors",
    actionVariant: "softPrimary",
    actionHref: "/mentors",
  },
};

const sidebarConfigs: Record<RouteKey, SidebarConfig> = {
  dashboard: {
    showProfileFooter: true,
  },
  discover: {},
  mentors: {
    shareIcon: "add",
  },
  sessions: {},
  sessionDetails: {},
  repository: {
    shareIcon: "add_circle",
  },
  resourceDetails: {
    shareIcon: "add",
  },
  profile: {},
};

export function getRouteKey(pathname: string): RouteKey {
  if (pathname.startsWith("/repository/")) {
    return "resourceDetails";
  }
  if (pathname.startsWith("/sessions/")) {
    return "sessionDetails";
  }
  if (pathname.startsWith("/mentors")) {
    return "mentors";
  }
  if (pathname.startsWith("/discover")) {
    return "discover";
  }
  if (pathname.startsWith("/repository")) {
    return "repository";
  }
  if (pathname.startsWith("/profile")) {
    return "profile";
  }
  if (pathname.startsWith("/sessions")) {
    return "sessions";
  }

  return "dashboard";
}

export function getHeaderConfig(pathname: string) {
  return headerConfigs[getRouteKey(pathname)];
}

export function getSidebarConfig(pathname: string) {
  return sidebarConfigs[getRouteKey(pathname)];
}
