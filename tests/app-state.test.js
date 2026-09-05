import assert from "node:assert/strict";
import test from "node:test";

import { applyProgressImport } from "../js/app.js";

const cards = [
  { id: "card-1", english: "serendipity", korean: "뜻밖의 행운" },
  { id: "card-2", english: "resilient", korean: "회복력이 있는" },
];

test("reconciles imported progress to IDs in the active wordbook", () => {
  assert.deepEqual(applyProgressImport(cards, { "card-1": 4, removed: 9 }), { "card-1": 4, "card-2": 0 });
});

test("rejects progress import without an active wordbook", () => {
  assert.throws(() => applyProgressImport(null, { "card-1": 4 }), /Load a wordbook before importing progress/);
});
