import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import { enrichAccount } from "../integrations/enrichment.mock";

export interface AccountResearch {
  summary: string;
  company_name: string;
  industry: string;
  employees: number;
  pain_points_hypothesis: string[];
  recent_news: string[];
  marketing_stack: string[];
  icp_fit_signals: string[];
  competitive_displacement_angle: string;
}

export async function runAccountResearch(
  brief: Brief,
  llm: ILLMClient
): Promise<Result<AccountResearch, SpecialistError>> {
  const domain = brief.target_account.domain ?? `${brief.target_account.name.toLowerCase().replace(/\s+/g, "")}.com`;
  const account = await enrichAccount(domain);

  const playbookCtx = brief.playbook
    ? `Campaign playbook: ${brief.playbook.replace(/_/g, " ")}${brief.playbook === "competitive_displacement" ? ` — identify which tools in their marketing stack ${brief.offer.product} would replace and the displacement angle.` : "."}`
    : "";

  const icpCtx = brief.icp_signals
    ? `ICP signals provided by the seller: ${brief.icp_signals}`
    : "";

  const prompt = `You are a B2B market intelligence analyst preparing an account brief for an outbound campaign.

Company: ${account.name} (${account.domain})
Description: ${account.description}
Industry: ${account.industry}
Employees: ${account.employees}
Funding: ${account.funding_stage}
Tech stack: ${account.tech_stack.join(", ")}
Marketing stack (current): ${account.marketing_stack.join(", ")}
Recent news: ${account.recent_news.join("; ")}

Campaign context:
- Seller: ${brief.sender.name} at ${brief.sender.company}
- Product: ${brief.offer.product}
- Value prop: ${brief.offer.value_prop}
- Target persona: ${brief.persona.role}
${playbookCtx}
${icpCtx}

Synthesize this into a focused account brief. For competitive_displacement_angle: identify which tools in their marketing stack ${brief.offer.product} could consolidate or replace, and what the displacement narrative should be. If the playbook is not competitive_displacement, still note displacement opportunities but keep it brief.

Respond with ONLY a JSON object:
{
  "summary": "<2-3 sentence narrative — why this account, why now>",
  "company_name": "${account.name}",
  "industry": "${account.industry}",
  "employees": ${account.employees},
  "pain_points_hypothesis": ["<marketing-specific pain 1>", "<pain 2>", "<pain 3>"],
  "recent_news": ${JSON.stringify(account.recent_news)},
  "marketing_stack": ${JSON.stringify(account.marketing_stack)},
  "icp_fit_signals": ["<signal 1 — why they fit ICP right now>", "<signal 2>"],
  "competitive_displacement_angle": "<1-2 sentences: which tools ${brief.offer.product} would replace and the narrative hook>"
}`;

  const result = await llm.call(prompt, { maxTokens: 1024 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "account_research", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as AccountResearch;
    return ok(parsed);
  } catch {
    return ok({
      summary: `${account.name} is a ${account.industry} company with ${account.employees} employees. ${account.description}.`,
      company_name: account.name,
      industry: account.industry,
      employees: account.employees,
      pain_points_hypothesis: ["Scaling marketing without adding headcount", "Tool sprawl across campaigns", "Slow time-to-campaign"],
      recent_news: account.recent_news,
      marketing_stack: account.marketing_stack,
      icp_fit_signals: ["Growing marketing team", "Recent funding"],
      competitive_displacement_angle: `${account.name} uses ${account.marketing_stack.slice(0, 2).join(" and ")}, which ${brief.offer.product} could consolidate into a single attribution layer.`,
    });
  }
}
