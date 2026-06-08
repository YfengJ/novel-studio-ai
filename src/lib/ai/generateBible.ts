import type { Db } from "@/lib/db/database";
import { seedCharactersFromStoryBible } from "@/lib/characters/characterService";
import { getProject, getSettings, saveStoryBibleVersion, saveStyleBibleVersion } from "@/lib/db/repositories";
import { StoryBibleSchema, StyleBibleSchema } from "./schemas";
import { jsonSystemPrompt, storyBiblePrompt, styleBiblePrompt } from "./prompts";
import { structuredJsonCompletion } from "./client";

export async function generateStoryBible(db: Db, projectId: number, apiKey?: string | null) {
  const project = getProject(db, projectId);
  if (!project) throw new Error("Project not found");
  const settings = getSettings(db, projectId);
  const bible = await structuredJsonCompletion(db, {
    projectId,
    runType: "story_bible",
    model: String(settings.default_model),
    promptSummary: "Generate Story Bible",
    system: jsonSystemPrompt,
    user: storyBiblePrompt(project),
    schema: StoryBibleSchema,
    apiKey
  });
  saveStoryBibleVersion(db, projectId, bible);
  seedCharactersFromStoryBible(db, projectId, bible);
  return bible;
}

export async function generateStyleBible(db: Db, projectId: number, storyBible: unknown, apiKey?: string | null) {
  const project = getProject(db, projectId);
  if (!project) throw new Error("Project not found");
  const settings = getSettings(db, projectId);
  const styleBible = await structuredJsonCompletion(db, {
    projectId,
    runType: "style_bible",
    model: String(settings.default_model),
    promptSummary: "Generate Style Bible",
    system: jsonSystemPrompt,
    user: styleBiblePrompt(project, storyBible),
    schema: StyleBibleSchema,
    apiKey
  });
  saveStyleBibleVersion(db, projectId, styleBible);
  return styleBible;
}
