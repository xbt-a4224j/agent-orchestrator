// Mirrors the Clearbit /v2/companies/find and /v2/people/find response shapes

export interface MockAccount {
  name: string;
  domain: string;
  description: string;
  industry: string;
  employees: number;
  funding_stage: string;
  tech_stack: string[];
  marketing_stack: string[];
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
    marketing_stack: ["Marketo", "Salesforce", "Sprout Social", "Drift", "Clearbit"],
    recent_news: [
      "Launched Notion AI with generative features across all plans",
      "Expanded enterprise plan with SAML SSO and advanced admin controls",
      "Crossed 30M users globally with strong SMB and enterprise mix",
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
    marketing_stack: ["HubSpot", "Webflow", "Mailchimp", "Apollo.io"],
    recent_news: [
      "Released Linear Asks for async standup workflows",
      "Raised $35M Series B at $400M valuation",
      "Growing marketing team after first CMO hire",
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
    marketing_stack: ["Marketo", "Salesforce", "Pardot", "Hootsuite", "Demandbase"],
    recent_news: [
      "Launched Figma Dev Mode for developer handoff",
      "Introduced AI-powered design generation features",
      "Expanding go-to-market motion into enterprise segment",
    ],
  },
  "loom.com": {
    name: "Loom",
    domain: "loom.com",
    description: "Async video messaging for teams",
    industry: "Communication Software",
    employees: 300,
    funding_stage: "Acquired by Atlassian",
    tech_stack: ["React", "Node.js", "AWS", "WebRTC"],
    marketing_stack: ["HubSpot", "Intercom", "Segment", "Hootsuite"],
    recent_news: [
      "Deep integration with Atlassian suite post-acquisition",
      "Pushing async-first messaging to enterprise accounts",
      "New marketing leadership team building out demand gen",
    ],
  },
  "vercel.com": {
    name: "Vercel",
    domain: "vercel.com",
    description: "Frontend cloud platform for developers",
    industry: "Developer Infrastructure",
    employees: 500,
    funding_stage: "Series D",
    tech_stack: ["Next.js", "Go", "Rust", "Edge Functions"],
    marketing_stack: ["Marketo", "Salesforce", "Demandbase", "6sense", "LinkedIn Ads"],
    recent_news: [
      "Launched v0 AI-assisted UI generation tool",
      "Raised $250M Series D at $3.25B valuation",
      "Scaling enterprise motion with Fortune 500 wins",
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
  marketing_stack: ["HubSpot", "Mailchimp"],
  recent_news: ["Growing their team", "Expanding into new markets"],
};

const CONTACT_TEMPLATES: Record<string, MockContact> = {
  "vp of marketing": {
    name: "Sarah Chen",
    role: "VP of Marketing",
    linkedin_url: "https://linkedin.com/in/sarah-chen",
    bio: "10+ years driving demand gen and brand for B2B SaaS companies. Previously led marketing at two unicorns.",
    pain_points: [
      "Scaling outbound without growing headcount proportionally",
      "Proving marketing ROI to the board in a tight budget cycle",
      "Managing 8+ disconnected marketing tools with no unified view",
      "Coordinating consistent messaging across email, social, and content",
    ],
  },
  "head of marketing": {
    name: "Sarah Chen",
    role: "Head of Marketing",
    linkedin_url: "https://linkedin.com/in/sarah-chen",
    bio: "Built marketing from zero at two Series A companies. Obsessed with pipeline efficiency.",
    pain_points: [
      "Scaling campaign output without adding headcount",
      "Keeping messaging consistent across channels",
      "Spending too much time in tools instead of strategy",
    ],
  },
  "cmo": {
    name: "Jordan Reyes",
    role: "CMO",
    linkedin_url: "https://linkedin.com/in/jordan-reyes",
    bio: "Revenue-focused CMO with 15 years building category-defining brands in SaaS. Board-level presenter.",
    pain_points: [
      "Marketing attribution and board-level ROI storytelling",
      "Aligning sales and marketing on ICP and messaging",
      "Reducing agency dependency while maintaining output quality",
      "Speed to market — campaigns take weeks, should take days",
    ],
  },
  "director of marketing": {
    name: "Priya Kapoor",
    role: "Director of Marketing",
    linkedin_url: "https://linkedin.com/in/priya-kapoor",
    bio: "Demand gen and lifecycle marketing leader. Runs campaigns across email, paid, and content.",
    pain_points: [
      "Campaign coordination across channels is manual and error-prone",
      "Personalization at scale without a huge ops team",
      "Content production bottleneck — strategy outpaces execution",
    ],
  },
  "director of demand generation": {
    name: "Marcus Webb",
    role: "Director of Demand Generation",
    linkedin_url: "https://linkedin.com/in/marcus-webb",
    bio: "Pipeline-obsessed demand gen leader. Built outbound programs from scratch at three Series B companies.",
    pain_points: [
      "ABM at scale requires too much manual research and coordination",
      "Outbound sequences lack personalization — low conversion rates",
      "Can't move fast enough — market moves faster than the team",
      "Attribution between marketing touches and pipeline is murky",
    ],
  },
  "vp of marketing operations": {
    name: "Taylor Brooks",
    role: "VP of Marketing Operations",
    linkedin_url: "https://linkedin.com/in/taylor-brooks",
    bio: "Marketing ops and revenue ops leader. Manages the martech stack and campaign infrastructure.",
    pain_points: [
      "Martech stack sprawl — 12+ tools that don't talk to each other",
      "Data consistency across CRM, MAP, and analytics",
      "Campaign execution depends on too many point solutions",
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
    CONTACT_TEMPLATES[Object.keys(CONTACT_TEMPLATES).find((k) => key.includes(k) || k.includes(key.split(" ").slice(-2).join(" "))) ?? ""] ??
    DEFAULT_CONTACT
  );
}
