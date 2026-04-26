import { z } from "zod";

export const DagNodeSchema = z.object({
  id: z.string(),
  agent: z.string(),
  depends_on: z.array(z.string()),
});

export const DagSchema = z
  .object({ nodes: z.array(DagNodeSchema) })
  .refine(
    (dag) => {
      const ids = new Set(dag.nodes.map((n) => n.id));
      return dag.nodes.every((n) => n.depends_on.every((d) => ids.has(d)));
    },
    { message: "depends_on references a node id that does not exist" }
  )
  .refine(
    (dag) => !hasCycle(dag.nodes),
    { message: "DAG contains a cycle" }
  );

export type DagNode = z.infer<typeof DagNodeSchema>;
export type Dag = z.infer<typeof DagSchema>;

function hasCycle(nodes: DagNode[]): boolean {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, n.depends_on]));
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string): boolean {
    visited.add(id);
    inStack.add(id);
    for (const dep of adj.get(id) ?? []) {
      if (!visited.has(dep) && dfs(dep)) return true;
      if (inStack.has(dep)) return true;
    }
    inStack.delete(id);
    return false;
  }

  return nodes.some((n) => !visited.has(n.id) && dfs(n.id));
}

/*
 * DEFAULT_DAG:
 *
 *   planner
 *   ├── account_research ─┐
 *   └── contact_research ─┤
 *                         ├── outreach_writer ─┐
 *                         ├── linkedin_writer  ├── tone_checker
 *                         └── agenda_writer   ─┘
 */
export const DEFAULT_DAG: Dag = {
  nodes: [
    { id: "planner", agent: "planner", depends_on: [] },
    { id: "account_research", agent: "account_research", depends_on: ["planner"] },
    { id: "contact_research", agent: "contact_research", depends_on: ["planner"] },
    {
      id: "outreach_writer",
      agent: "outreach_writer",
      depends_on: ["account_research", "contact_research"],
    },
    {
      id: "linkedin_writer",
      agent: "linkedin_writer",
      depends_on: ["account_research", "contact_research"],
    },
    {
      id: "agenda_writer",
      agent: "agenda_writer",
      depends_on: ["account_research", "contact_research"],
    },
    {
      id: "tone_checker",
      agent: "tone_checker",
      depends_on: ["outreach_writer", "linkedin_writer", "agenda_writer"],
    },
  ],
};
