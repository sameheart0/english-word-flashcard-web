import assert from "node:assert/strict";
import test from "node:test";

import { clearSavedState, loadSavedState, saveState } from "../js/persistence.js";

class MapStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, value);
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

const state = {
  version: 1,
  wordbookName: "vocabulary.md",
  cards: [{ id: "card-1", english: "serendipity", korean: "뜻밖의 행운" }],
  progress: { "card-1": 2 },
};

test("restores a saved active wordbook state", () => {
  const storage = new MapStorage();

  saveState(storage, state);

  assert.deepEqual(loadSavedState(storage), state);
});

test("clears malformed saved data instead of restoring it", () => {
  const storage = new MapStorage();
  storage.setItem("english-word-flashcards:state:v1", "not-json");

  assert.equal(loadSavedState(storage), null);
  assert.equal(storage.getItem("english-word-flashcards:state:v1"), null);
});

test("clears the saved state on request", () => {
  const storage = new MapStorage();
  saveState(storage, state);

  clearSavedState(storage);

  assert.equal(loadSavedState(storage), null);
});
