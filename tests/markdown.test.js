import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProgress,
  parseWordbook,
  progressFilenameFor,
  reconcileProgress,
  serializeProgress,
  serializeWordbook,
} from "../js/markdown.js";

const WORDBOOK = `# Flashcard Wordbook

| ID | English | Korean |
| --- | --- | --- |
| card-1 | serendipity | 뜻밖의 행운 |
| card-2 | resilient | 회복력이 있는 |
`;

test("parses the existing wordbook Markdown table into cards", () => {
  assert.deepEqual(parseWordbook(WORDBOOK), [
    { id: "card-1", english: "serendipity", korean: "뜻밖의 행운" },
    { id: "card-2", english: "resilient", korean: "회복력이 있는" },
  ]);
});

test("rejects a wordbook with a different table header", () => {
  assert.throws(
    () => parseWordbook("# Notes\n\n| Word | Meaning |\n| --- | --- |\n| apple | 사과 |\n"),
    /Invalid wordbook format/,
  );
});

test("rejects duplicate wordbook IDs", () => {
  assert.throws(
    () => parseWordbook(WORDBOOK.replace("| card-2 |", "| card-1 |")),
    /duplicate IDs/,
  );
});

test("serializes wordbooks using the existing Markdown table", () => {
  assert.equal(serializeWordbook([{ id: "card-1", english: "apple", korean: "사과" }]), "# Flashcard Wordbook\n\n| ID | English | Korean |\n| --- | --- | --- |\n| card-1 | apple | 사과 |\n");
});

test("round-trips progress in the existing Markdown table", () => {
  const markdown = serializeProgress({ "card-2": 0, "card-1": 3 });

  assert.equal(markdown, "# Flashcard Progress\n\n| ID | Study Count |\n| --- | --- |\n| card-1 | 3 |\n| card-2 | 0 |\n");
  assert.deepEqual(parseProgress(markdown), { "card-1": 3, "card-2": 0 });
});

test("rejects a negative progress count", () => {
  assert.throws(
    () => parseProgress("# Flashcard Progress\n\n| ID | Study Count |\n| --- | --- |\n| card-1 | -1 |\n"),
    /non-negative integer/,
  );
});

test("derives the companion progress file name from a wordbook name", () => {
  assert.equal(progressFilenameFor("vocabulary.md"), "vocabulary.progress.md");
  assert.equal(progressFilenameFor("daily.words.md"), "daily.words.progress.md");
});

test("reconciles progress to current cards", () => {
  const cards = parseWordbook(WORDBOOK);

  assert.deepEqual(reconcileProgress(cards, { "card-1": 2, removed: 8 }), { "card-1": 2, "card-2": 0 });
});
