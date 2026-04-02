export type RouteKey =
  | "dashboard"
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
  { href: "/mentors", icon: "diversity_3", label: "Find Mentors" },
  { href: "/sessions", icon: "calendar_today", label: "Sessions" },
  { href: "/repository", icon: "folder_open", label: "Repository" },
  { href: "/profile", icon: "person", label: "Profile" },
];

const headerConfigs: Record<RouteKey, HeaderConfig> = {
  dashboard: {
    placeholder: "Search mentors, skills, or sessions...",
    actionLabel: "New Session",
    actionVariant: "primary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
  mentors: {
    placeholder: "Search mentors by craft, name, or skill...",
    actionLabel: "New Session",
    actionVariant: "primary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
  sessions: {
    placeholder: "Search sessions...",
    actionLabel: "New Session",
    actionVariant: "primary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
  sessionDetails: {
    placeholder: "Search sessions, resources...",
    actionLabel: "New Session",
    actionVariant: "text",
    actionHref: "/sessions",
  },
  repository: {
    placeholder: "Search the repository...",
    actionLabel: "New Session",
    actionVariant: "secondary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
  resourceDetails: {
    placeholder: "Search the atelier...",
    actionLabel: "New Session",
    actionVariant: "primary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
  profile: {
    placeholder: "Search mentorships...",
    actionLabel: "New Session",
    actionVariant: "softPrimary",
    actionHref: "/sessions/advanced-clay-glazing-techniques",
  },
};

const sidebarConfigs: Record<RouteKey, SidebarConfig> = {
  dashboard: {
    showProfileFooter: true,
  },
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
