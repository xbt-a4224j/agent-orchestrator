// Mirrors the Clearbit /v2/companies/find and /v2/people/find response shapes

export interface MockAccount {
  name: string;
  domain: string;
  description: string;
  industry: string;
  employees: number;
  funding_stage: string;
  tech_stack: string[];
  recent_news: string[];
}

export interface MockContact {
  name: string;
  role: string;
  linkedin_url: string;
  bio: string;
  pain_points: string[];
}

const ACCOUNT_FIXTURES: Record<string, MockAccount> = {
  "notion.so": {
    name: "Notion",
    domain: "notion.so",
    description: "All-in-one workspace for notes, docs, and collaboration",
    industry: "Productivity Software",
    employees: 400,
    funding_stage: "Series C",
    tech_stack: ["React", "Node.js", "PostgreSQL", "Electron"],
    recent_news: [
      "Launched Notion AI with generative features",
      "Expanded enterprise plan with SAML SSO",
    ],
  },
  "linear.app": {
    name: "Linear",
    domain: "linear.app",
    description: "Issue tracking and project management for software teams",
    industry: "Developer Tools",
    employees: 80,
    funding_stage: "Series B",
    tech_stack: ["TypeScript", "GraphQL", "Postgres", "Cloudflare Workers"],
    recent_news: [
      "Released Linear Asks for async standup workflows",
      "Raised $35M Series B at $400M valuation",
    ],
  },
  "figma.com": {
    name: "Figma",
    domain: "figma.com",
    description: "Collaborative interface design tool",
    industry: "Design Software",
    employees: 1000,
    funding_stage: "Public (acquired by Adobe)",
    tech_stack: ["C++", "WebAssembly", "React", "AWS"],
    recent_news: [
      "Launched Figma Dev Mode for developer handoff",
      "Introduced AI-powered design generation",
    ],
  },
};

const DEFAULT_ACCOUNT: MockAccount = {
  name: "Target Co",
  domain: "example.com",
  description: "A B2B software company",
  industry: "Software",
  employees: 200,
  funding_stage: "Series A",
  tech_stack: ["Various"],
  recent_news: ["Growing their team"],
};

const CONTACT_TEMPLATES: Record<string, MockContact> = {
  "vp of marketing": {
    name: "Sarah Chen",
    role: "VP of Marketing",
    linkedin_url: "https://linkedin.com/in/sarah-chen",
    bio: "10+ years driving demand gen and brand for B2B SaaS companies",
    pain_points: [
      "Scaling outbound without growing headcount",
      "Proving marketing ROI to the board",
      "Personalizing outreach at scale",
    ],
  },
  "head of sales": {
    name: "Marcus Thompson",
    role: "Head of Sales",
    linkedin_url: "https://linkedin.com/in/marcus-thompson",
    bio: "Led sales teams from 0 to $10M ARR at two startups",
    pain_points: [
      "Ramp time for new AEs",
      "Pipeline visibility and forecasting",
      "Reducing time spent on non-selling activities",
    ],
  },
  "cto": {
    name: "Alex Rivera",
    role: "CTO",
    linkedin_url: "https://linkedin.com/in/alex-rivera",
    bio: "Engineer-turned-executive focused on platform scalability",
    pain_points: [
      "Technical debt vs. feature velocity",
      "Recruiting and retaining senior engineers",
      "Vendor sprawl and integration complexity",
    ],
  },
};

const DEFAULT_CONTACT: MockContact = {
  name: "Jordan Smith",
  role: "Decision Maker",
  linkedin_url: "https://linkedin.com/in/jordan-smith",
  bio: "Experienced operator in B2B SaaS",
  pain_points: ["Efficiency", "Growth", "Cost reduction"],
};

export async function enrichAccount(domain: string): Promise<MockAccount> {
  return ACCOUNT_FIXTURES[domain.toLowerCase()] ?? DEFAULT_ACCOUNT;
}

export async function enrichContact(domain: string, role: string): Promise<MockContact> {
  const key = role.toLowerCase();
  return (
    CONTACT_TEMPLATES[key] ??
    CONTACT_TEMPLATES[Object.keys(CONTACT_TEMPLATES).find((k) => key.includes(k)) ?? ""] ??
    DEFAULT_CONTACT
  );
}
