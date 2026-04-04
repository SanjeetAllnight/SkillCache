export type BackendUser = {
  _id: string;
  name: string;
  email: string;
  skillsOffered?: string[];
  skillsWanted?: string[];
  bio?: string;
  avatar?: string;
};

export type MockUser = {
  id: string;
  firstName: string;
  name: string;
  role: string;
  title: string;
  location: string;
  avatar: string;
  coverImage: string;
};

export const mockUser: MockUser = {
  id: "julian-thorne",
  firstName: "Julian",
  name: "Julian Thorne",
  role: "Expert Craftsman",
  title: "Creative Lead @ Atelier-X",
  location: "Berlin, DE",
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA9FnFgAF-ssvA4kUMskWJ6uJWeLAnSX5BOYb4kLb2VrVQZIf-e3cqgPHyE86-ZZeS0WOXMe90KrmoiIhVW5exgYNBVAZVdyHrytr6FsRncaJkf50DG3YyuzPi-9SlvdQ79C9ErV9WVgvC_X6hpC9GmFX5FtDUjgXDWcls1mk6r_bmXa4qHCjyKGP4nZukViXgHuuTPxkU_HkHbOccxYBNayNLCXs3_DFankK9ayaUEWGDk5idqiyggbW3-nJ6_Se_Ab5yL6d6zPPI",
  coverImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
};

export function toDisplayUser(user?: Partial<BackendUser> | null): MockUser {
  if (!user?._id && !user?.name && !user?.email) {
    return mockUser;
  }

  const normalizedName = user.name?.trim() || mockUser.name;
  const firstName = normalizedName.split(" ")[0] || mockUser.firstName;
  const primarySkill = user.skillsOffered?.[0];
  const desiredSkill = user.skillsWanted?.[0];

  return {
    id: user._id || user.email || mockUser.id,
    firstName,
    name: normalizedName,
    role: primarySkill ? `${primarySkill} Mentor` : "Creative Member",
    title: desiredSkill
      ? `Learning ${desiredSkill}`
      : primarySkill
        ? `${primarySkill} Specialist`
        : mockUser.title,
    location: "Remote",
    avatar: mockUser.avatar,
    coverImage: mockUser.coverImage,
  };
}
