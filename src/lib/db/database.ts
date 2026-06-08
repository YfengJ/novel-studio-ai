import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { schemaSql } from "./schema";

export type Db = Database.Database;

let singleton: Db | null = null;

export function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH ?? "./data/story-maker.sqlite";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function runMigrations(db: Db) {
  db.pragma("foreign_keys = ON");
  db.exec(schemaSql);
}

export function getDb() {
  if (singleton) return singleton;
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  singleton = new Database(dbPath);
  runMigrations(singleton);
  return singleton;
}

export function resetDbForTests() {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
}

