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
}

export async function runAccountResearch(
  brief: Brief,
  llm: ILLMClient
): Promise<Result<AccountResearch, SpecialistError>> {
  const domain = brief.target_account.domain ?? `${brief.target_account.name.toLowerCase().replace(/\s+/g, "")}.com`;
  const account = await enrichAccount(domain);

  const prompt = `You are a B2B sales researcher. Synthesize the following company data into a concise research brief.

Company: ${account.name} (${account.domain})
Description: ${account.description}
Industry: ${account.industry}
Employees: ${account.employees}
Funding: ${account.funding_stage}
Tech stack: ${account.tech_stack.join(", ")}
Recent news: ${account.recent_news.join("; ")}

Sales context:
- Seller: ${brief.sender.name} from ${brief.sender.company}
- Product: ${brief.offer.product}
- Value prop: ${brief.offer.value_prop}
- Target persona: ${brief.persona.role}

Respond with ONLY a JSON object matching this shape:
{
  "summary": "<2-3 sentence narrative>",
  "company_name": "${account.name}",
  "industry": "${account.industry}",
  "employees": ${account.employees},
  "pain_points_hypothesis": ["<point 1>", "<point 2>", "<point 3>"],
  "recent_news": ${JSON.stringify(account.recent_news)}
}`;

  const result = await llm.call(prompt, { maxTokens: 1024 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "account_research", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as AccountResearch;
    return ok(parsed);
  } catch {
    // Fallback: return structured data directly from enrichment
    return ok({
      summary: `${account.name} is a ${account.industry} company with ${account.employees} employees. ${account.description}.`,
      company_name: account.name,
      industry: account.industry,
      employees: account.employees,
      pain_points_hypothesis: ["Scaling operations", "Efficiency", "Growth"],
      recent_news: account.recent_news,
    });
  }
}
