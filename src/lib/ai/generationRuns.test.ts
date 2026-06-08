import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { logGenerationRun } from "./runs";

describe("generation run logging", () => {
  it("does not persist API keys in input or output JSON", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db.prepare("insert into projects (title) values (?) returning id").get("测试书") as { id: number };

    logGenerationRun(db, {
      projectId: project.id,
      runType: "test",
      model: "mock-model",
      promptSummary: "schema test",
      input: { apiKey: "REDACTION_TEST_VALUE", nested: { OPENAI_API_KEY: "REDACTION_TEST_VALUE" }, header: { "x-openai-api-key": "REDACTION_TEST_VALUE" } },
      output: { text: "ok", authorization: "REDACTION_TEST_VALUE" }
    });

    const row = db.prepare("select input_json, output_json from generation_runs where project_id = ?").get(project.id) as { input_json: string; output_json: string };
    expect(row.input_json).not.toContain("REDACTION_TEST_VALUE");
    expect(row.output_json).not.toContain("REDACTION_TEST_VALUE");
    expect(row.input_json).toContain("[REDACTED]");
  });
});
