/**
 * brandly_list_projects — List all projects
 */

import type { ToolContext } from "./context.js";

export function createListProjectsTool(ctx: ToolContext) {
  return {
    name: "brandly_list_projects",
    description: "List all Brandly projects",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (args: Record<string, unknown>) => {
      const projectIds = await ctx.listProjects();

      if (projectIds.length === 0) {
        return {
          projects: [],
          total: 0,
          message: "No projects found. Use brandly_start to create one!",
        };
      }

      // Load each project for summary info
      const projects = [];
      for (const id of projectIds) {
        try {
          const project = await ctx.readProject(id);
          if (project) {
            projects.push({
              id: project.id,
              name: project.name,
              description: project.description,
              status: project.status,
              style: project.style,
              currentPhase: project.currentPhase,
              budget: project.budget,
              spent: project.spent,
              createdAt: project.createdAt,
            });
          }
        } catch {
          // Skip corrupted projects
        }
      }

      // Sort by creation date (newest first)
      projects.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        projects,
        total: projects.length,
        message: `Found ${projects.length} Brandly project(s)`,
      };
    },
  };
}
