import { afterEach } from "vitest";
import { resetDbForTests } from "@/lib/db/database";

afterEach(() => {
  resetDbForTests();
});

