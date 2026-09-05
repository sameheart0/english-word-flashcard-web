import { reconcileProgress, serializeWordbook } from "./markdown.js";

const STORAGE_KEY = "english-word-flashcards:state:v1";

export function loadSavedState(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (value === null) {
      return null;
    }
    return normalizeState(JSON.parse(value));
  } catch {
    clearSavedState(storage);
    return null;
  }
}

export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function clearSavedState(storage) {
  storage.removeItem(STORAGE_KEY);
}

function normalizeState(state) {
  if (!state || state.version !== 1 || typeof state.wordbookName !== "string" || !state.wordbookName.trim()) {
    throw new Error("Invalid saved flashcard state.");
  }
  serializeWordbook(state.cards);
  return {
    version: 1,
    wordbookName: state.wordbookName.trim(),
    cards: state.cards.map((card) => ({ ...card })),
    progress: reconcileProgress(state.cards, state.progress),
  };
}
