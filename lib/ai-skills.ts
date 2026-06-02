export type ExtractedSkill = {
  id: string;
  name: string;
  confidence: number; // 0-100
  suggestedRole: "teaching" | "learning";
  source: "github" | "linkedin";
  rationale: string;
};

export type AiProfileSuggestions = {
  skills: ExtractedSkill[];
  bio: string;
  interests: string[];
};

/**
 * Simulates an AI-powered extraction of profile details based on
 * external graphs (GitHub commits/repos, LinkedIn experience/endorsements).
 */
export async function simulateAiProfileScan(source: "github" | "linkedin"): Promise<AiProfileSuggestions> {
  // Simulate network/AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 3000));

  if (source === "github") {
    return {
      bio: "Open source contributor and full-stack engineer passionate about building scalable React applications and exploring Machine Learning algorithms in Python. I love clean architecture and mentoring others.",
      interests: ["Open Source", "System Design", "Algorithms"],
      skills: [
        {
          id: "gh-1",
          name: "React",
          confidence: 94,
          suggestedRole: "teaching",
          source: "github",
          rationale: "Detected in 12 repositories as primary language. 400+ commits in the last year.",
        },
        {
          id: "gh-2",
          name: "TypeScript",
          confidence: 88,
          suggestedRole: "teaching",
          source: "github",
          rationale: "Found in package.json and tsconfig.json of 8 active repositories.",
        },
        {
          id: "gh-3",
          name: "Node.js",
          confidence: 82,
          suggestedRole: "teaching",
          source: "github",
          rationale: "Frequent usage of express and nestjs in backend microservices.",
        },
        {
          id: "gh-4",
          name: "Machine Learning",
          confidence: 65,
          suggestedRole: "learning",
          source: "github",
          rationale: "Recently starred 15 ML repositories and forked 'pytorch-examples'.",
        },
        {
          id: "gh-5",
          name: "Docker",
          confidence: 55,
          suggestedRole: "learning",
          source: "github",
          rationale: "Basic usage found in 2 recent repositories' docker-compose.yml files.",
        },
      ],
    };
  } else {
    return {
      bio: "Product-focused Engineering Manager with 5+ years of experience leading cross-functional teams. Specialized in Agile methodologies, Cloud Architecture (AWS), and driving technical vision. Always looking to learn more about Growth Marketing.",
      interests: ["Engineering Leadership", "Product Strategy", "Agile"],
      skills: [
        {
          id: "li-1",
          name: "AWS",
          confidence: 90,
          suggestedRole: "teaching",
          source: "linkedin",
          rationale: "Mentioned 8 times in work experience. AWS Certified Solutions Architect badge found.",
        },
        {
          id: "li-2",
          name: "Product Management",
          confidence: 85,
          suggestedRole: "teaching",
          source: "linkedin",
          rationale: "Current title implies strong PM overlap. Endorsed by 24 colleagues.",
        },
        {
          id: "li-3",
          name: "Agile Leadership",
          confidence: 80,
          suggestedRole: "teaching",
          source: "linkedin",
          rationale: "Listed as a key skill in the 'About' section and past 3 roles.",
        },
        {
          id: "li-4",
          name: "Growth Marketing",
          confidence: 72,
          suggestedRole: "learning",
          source: "linkedin",
          rationale: "Follows multiple Marketing influencers and recently completed a LinkedIn Learning course.",
        },
        {
          id: "li-5",
          name: "Data Analytics",
          confidence: 60,
          suggestedRole: "learning",
          source: "linkedin",
          rationale: "Inferred from recent role responsibilities involving 'metrics-driven growth'.",
        },
      ],
    };
  }
}
