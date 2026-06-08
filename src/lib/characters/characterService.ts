import type { Db } from "@/lib/db/database";

const tierRank: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export function promoteCharacterIfNeeded(
  db: Db,
  input: {
    projectId: number;
    characterId: number;
    mentionCount: number;
    plotRelevant: boolean;
    chapterNumber: number;
  }
) {
  const row = db
    .prepare("select id, tier, name from characters where id = ? and project_id = ?")
    .get(input.characterId, input.projectId) as { id: number; tier: "S" | "A" | "B" | "C" | "D"; name: string } | undefined;
  if (!row) throw new Error("Character not found");

  let targetTier: "S" | "A" | "B" | "C" | "D" = row.tier;
  if (input.plotRelevant && input.mentionCount >= 3) targetTier = "B";
  else if (input.plotRelevant || input.mentionCount >= 2) targetTier = "C";

  if (tierRank[targetTier] > tierRank[row.tier]) {
    db.prepare("update characters set tier = ?, last_seen_chapter = ? where id = ?").run(targetTier, input.chapterNumber, row.id);
    return { ...row, tier: targetTier };
  }

  db.prepare("update characters set last_seen_chapter = coalesce(?, last_seen_chapter) where id = ?").run(input.chapterNumber, row.id);
  return row;
}

export function ensureCharacterByName(
  db: Db,
  input: {
    projectId: number;
    name: string;
    tier?: "S" | "A" | "B" | "C" | "D";
    chapterNumber?: number;
    description?: string;
    appearance?: string;
    role?: string;
    tags?: string[];
  }
) {
  const existing = db
    .prepare("select id, tier from characters where project_id = ? and name = ?")
    .get(input.projectId, input.name) as { id: number; tier: "S" | "A" | "B" | "C" | "D" } | undefined;
  if (existing) {
    db.prepare("update characters set last_seen_chapter = coalesce(?, last_seen_chapter) where id = ?").run(input.chapterNumber ?? null, existing.id);
    return existing.id;
  }

  const created = db
    .prepare(
      `insert into characters
        (project_id, name, tier, role, first_chapter, last_seen_chapter, description, appearance, tags_json, is_active)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       returning id`
    )
    .get(
      input.projectId,
      input.name,
      input.tier ?? "D",
      input.role ?? "",
      input.chapterNumber ?? null,
      input.chapterNumber ?? null,
      input.description ?? "",
      input.appearance ?? "",
      JSON.stringify(input.tags ?? [])
    ) as { id: number };
  return created.id;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function ensureInitialState(db: Db, projectId: number, characterId: number, notes: string) {
  const existing = db.prepare("select id from character_states where project_id = ? and character_id = ? limit 1").get(projectId, characterId);
  if (existing) return;
  db.prepare(
    `insert into character_states
      (project_id, character_id, chapter_number, alive_status, location, current_goal, faction, notes, source_chapter)
     values (?, ?, 0, 'alive', '', '', '', ?, 0)`
  ).run(projectId, characterId, notes);
}

export function seedCharactersFromStoryBible(db: Db, projectId: number, storyBible: unknown) {
  const bible = asRecord(storyBible);
  const protagonist = asRecord(bible.protagonist);
  const protagonistName = textField(protagonist, ["name", "姓名"]);
  if (protagonistName) {
    const id = ensureCharacterByName(db, {
      projectId,
      name: protagonistName,
      tier: "S",
      chapterNumber: 0,
      role: textField(protagonist, ["role", "身份"]) || "主角",
      description: textField(protagonist, ["description", "简介", "background", "背景"]),
      tags: ["story_bible", "protagonist"]
    });
    ensureInitialState(db, projectId, id, "Story Bible 初始化主角状态");
  }

  const cast = Array.isArray(bible.main_cast) ? bible.main_cast : [];
  for (const item of cast) {
    const record = asRecord(item);
    const name = textField(record, ["name", "姓名"]);
    if (!name) continue;
    const id = ensureCharacterByName(db, {
      projectId,
      name,
      tier: "A",
      chapterNumber: 0,
      role: textField(record, ["role", "身份"]),
      description: textField(record, ["description", "简介", "arc", "人物弧光"]),
      tags: ["story_bible", "main_cast"]
    });
    ensureInitialState(db, projectId, id, "Story Bible 初始化主要角色状态");
  }
}
