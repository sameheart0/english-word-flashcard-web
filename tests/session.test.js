import assert from "node:assert/strict";
import test from "node:test";

import { clickStudyCard, selectSessionCards } from "../js/session.js";

const cards = [
  { id: "new", english: "novel", korean: "새로운" },
  { id: "known", english: "familiar", korean: "익숙한" },
  { id: "middle", english: "steady", korean: "꾸준한" },
];

test("adjusts requested session count and never repeats a card", () => {
  const selected = selectSessionCards(cards, { new: 0, known: 3, middle: 1 }, 10, () => 0);

  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map((studyCard) => studyCard.card.id)).size, 3);
});

test("assigns one of the two languages as each card front", () => {
  const selected = selectSessionCards(cards, {}, 3, () => 0.4);

  assert.ok(selected.every((studyCard) => ["english", "korean"].includes(studyCard.frontLanguage)));
});

test("increments progress exactly once then requests the next card", () => {
  const studyCard = { card: cards[0], frontLanguage: "english", flipped: false };
  const progress = { new: 0 };

  assert.deepEqual(clickStudyCard(studyCard, progress), { action: "flipped" });
  assert.deepEqual(clickStudyCard(studyCard, progress), { action: "next" });
  assert.equal(progress.new, 1);
});

test("rejects a non-positive requested session count", () => {
  assert.throws(() => selectSessionCards(cards, {}, 0, () => 0), /Requested card count must be positive/);
});
