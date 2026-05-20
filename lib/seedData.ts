import { collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MOCK_AVATARS = [
  "https://i.pravatar.cc/150?u=1",
  "https://i.pravatar.cc/150?u=2",
  "https://i.pravatar.cc/150?u=3",
  "https://i.pravatar.cc/150?u=4",
  "https://i.pravatar.cc/150?u=5",
  "https://i.pravatar.cc/150?u=6",
  "https://i.pravatar.cc/150?u=7",
  "https://i.pravatar.cc/150?u=8",
  "https://i.pravatar.cc/150?u=9",
  "https://i.pravatar.cc/150?u=10",
  "https://i.pravatar.cc/150?u=11",
  "https://i.pravatar.cc/150?u=12",
  "https://i.pravatar.cc/150?u=13",
  "https://i.pravatar.cc/150?u=14",
  "https://i.pravatar.cc/150?u=15",
];

const SKILL_POOLS = [
  "React", "Node.js", "TypeScript", "Python", "UI/UX", "Figma", 
  "TailwindCSS", "Next.js", "Marketing", "SEO", "Product Management", 
  "Data Science", "Machine Learning", "AWS", "Docker"
];

const MENTORS = [
  { name: "Elena Rodriguez", role: "Senior Frontend Developer", skill: "React" },
  { name: "Marcus Chen", role: "Lead Product Designer", skill: "Figma" },
  { name: "Sarah Jenkins", role: "Data Scientist", skill: "Python" },
  { name: "David Kim", role: "Backend Engineer", skill: "Node.js" },
  { name: "Aisha Patel", role: "Marketing Director", skill: "SEO" },
  { name: "James Wilson", role: "Cloud Architect", skill: "AWS" },
  { name: "Lisa Thompson", role: "Product Manager", skill: "Product Management" },
  { name: "Robert Taylor", role: "UI/UX Specialist", skill: "UI/UX" },
  { name: "Emily White", role: "Full Stack Developer", skill: "TypeScript" },
  { name: "Michael Brown", role: "DevOps Engineer", skill: "Docker" },
  { name: "Jessica Davis", role: "Machine Learning Engineer", skill: "Machine Learning" },
  { name: "William Miller", role: "Frontend Architect", skill: "Next.js" },
  { name: "Olivia Martinez", role: "Growth Hacker", skill: "Marketing" },
  { name: "Thomas Anderson", role: "Data Analyst", skill: "Data Science" },
  { name: "Sophia Thomas", role: "Design Systems Lead", skill: "TailwindCSS" },
];

function getRandomSkills(count: number) {
  const shuffled = [...SKILL_POOLS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function tagSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function ensureDiscoverDataSeeded() {
  // Check if seeding is already done to prevent duplicates
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("isSeeded", "==", true), limit(1));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return; // Already seeded
  }

  const batch = writeBatch(db);
  const now = Date.now();
  
  // 1. Seed Mentors (Users)
  const seededMentors = MENTORS.map((m, index) => {
    const id = `seeded-mentor-${index}`;
    const ref = doc(db, "users", id);
    const skillsOffered = [m.skill, ...getRandomSkills(1)];
    const skillsWanted = getRandomSkills(2);
    
    batch.set(ref, {
      name: m.name,
      email: `seeded-${index}@example.com`,
      avatar: MOCK_AVATARS[index],
      bio: `Hi, I'm ${m.name}, a ${m.role} passionate about sharing my knowledge in ${m.skill}.`,
      skillsOffered,
      skillsWanted,
      rating: 4.5 + Math.random() * 0.5,
      sessionsCompleted: Math.floor(Math.random() * 50) + 10,
      profileComplete: true,
      firstLoginCompleted: true,
      createdAt: serverTimestamp(),
      isSeeded: true,
    });
    
    return { id, name: m.name, skillsOffered };
  });

  // 2. Seed Workshops
  const workshopTemplates = [
    { title: "Advanced React Patterns", duration: 60, desc: "Master custom hooks, performance optimization, and context." },
    { title: "Figma to React Handoff", duration: 90, desc: "A seamless workflow for converting Figma designs into React components." },
    { title: "Node.js Microservices", duration: 120, desc: "Building scalable backend architectures using Node.js and Docker." },
    { title: "SEO Fundamentals for Developers", duration: 45, desc: "Learn how to optimize your web apps for search engines." },
    { title: "Introduction to Machine Learning", duration: 60, desc: "A beginner-friendly guide to ML using Python." },
    { title: "Building Design Systems", duration: 90, desc: "Create a scalable design system using TailwindCSS and Figma." },
    { title: "AWS Deployment Strategies", duration: 60, desc: "Best practices for deploying web apps on AWS." },
    { title: "Product Management 101", duration: 45, desc: "Essential skills for aspiring product managers." },
    { title: "TypeScript Generics Deep Dive", duration: 60, desc: "Understand and leverage the power of TypeScript generics." },
    { title: "Data Visualization with D3.js", duration: 90, desc: "Create stunning interactive charts using D3.js." },
  ];

  workshopTemplates.forEach((w, index) => {
    const ref = doc(db, "workshops", `seeded-workshop-${index}`);
    const host = seededMentors[index % seededMentors.length];
    
    batch.set(ref, {
      title: w.title,
      hostId: host.id,
      date: new Date(now + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: w.duration,
      participantCount: Math.floor(Math.random() * 50) + 5,
      description: w.desc,
      tags: host.skillsOffered,
      createdAt: serverTimestamp(),
      isSeeded: true,
    });
  });

  // 3. Seed Resources
  const resourceTemplates = [
    { title: "React Component Lifecycle Cheat Sheet", type: "pdf", extUrl: "https://example.com/react-cheat-sheet.pdf" },
    { title: "Top 10 Figma Plugins", type: "link", extUrl: "https://example.com/figma-plugins" },
    { title: "Node.js Security Best Practices", type: "markdown", content: "# Node.js Security\n\nAlways validate input and use parameterized queries." },
    { title: "SEO Audit Checklist", type: "pdf", extUrl: "https://example.com/seo-audit.pdf" },
    { title: "Python ML Starter Kit", type: "code", codeLang: "python", content: "import pandas as pd\nimport numpy as np\n\nprint('Hello ML!')" },
    { title: "TailwindCSS Component Library", type: "link", extUrl: "https://example.com/tailwind-components" },
    { title: "AWS Architecture Diagram", type: "image", extUrl: "https://example.com/aws-diagram.png" },
    { title: "Product Requirements Document Template", type: "rich-text", content: "<h2>PRD</h2><p>Define the problem, goals, and features.</p>" },
    { title: "TypeScript Utility Types Guide", type: "markdown", content: "# Utility Types\n\n`Partial<T>`, `Pick<T, K>`, `Omit<T, K>`" },
    { title: "D3.js Example Gallery", type: "link", extUrl: "https://example.com/d3-gallery" },
    { title: "React Performance Tuning", type: "markdown", content: "# Performance\nUse React.memo and useCallback." },
    { title: "UX Heuristics Evaluation", type: "pdf", extUrl: "https://example.com/ux-heuristics.pdf" },
    { title: "Docker Compose Examples", type: "code", codeLang: "yaml", content: "version: '3'\nservices:\n  web:\n    image: nginx" },
    { title: "Growth Marketing Strategies", type: "rich-text", content: "<h3>Growth</h3><p>Focus on acquisition, activation, and retention.</p>" },
    { title: "Pandas Data Wrangling Guide", type: "markdown", content: "# Pandas\ndf.groupby('column').mean()" },
  ];

  resourceTemplates.forEach((r, index) => {
    const id = `seeded-resource-${index}`;
    const ref = doc(db, "resources", id);
    const uploader = seededMentors[index % seededMentors.length];
    const tags = uploader.skillsOffered;
    
    batch.set(ref, {
      title: r.title,
      titleLower: r.title.toLowerCase(),
      description: "A helpful resource shared by the community.",
      type: r.type,
      uploaderId: uploader.id,
      uploaderName: uploader.name,
      tags: tags,
      tagSlugs: tags.map(tagSlug),
      externalUrl: r.extUrl || null,
      content: r.content || null,
      codeLanguage: r.codeLang || null,
      contentFormat: r.type === "markdown" || r.type === "rich-text" || r.type === "code" ? r.type : "plain",
      likesCount: Math.floor(Math.random() * 20),
      bookmarksCount: Math.floor(Math.random() * 10),
      downloadsCount: Math.floor(Math.random() * 50),
      visibility: "public",
      uploadStatus: "ready",
      searchText: `${r.title.toLowerCase()} ${tags.join(" ").toLowerCase()} ${uploader.name.toLowerCase()}`,
      createdAt: now - index * 1000000,
      updatedAt: now - index * 1000000,
      isSeeded: true,
    });
  });

  // 4. Seed Sessions (Live and Completed)
  for (let i = 0; i < 10; i++) {
    const ref = doc(db, "sessions", `seeded-session-${i}`);
    const mentor = seededMentors[i];
    const learner = seededMentors[(i + 1) % seededMentors.length];
    const isLive = i < 4; // 4 live sessions, 6 completed
    
    batch.set(ref, {
      title: `${mentor.skillsOffered[0]} Mentorship`,
      description: `Discussing advanced concepts in ${mentor.skillsOffered[0]}`,
      mentorId: mentor.id,
      learnerId: learner.id,
      skill: mentor.skillsOffered[0],
      date: new Date(now - (isLive ? 0 : (i + 1) * 24 * 60 * 60 * 1000)).toISOString(),
      status: isLive ? "live" : "completed",
      createdAt: serverTimestamp(),
      isSeeded: true,
    });
  }

  await batch.commit();
}
