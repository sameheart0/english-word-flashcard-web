const WORDBOOK_TITLE = "# Flashcard Wordbook";
const WORDBOOK_HEADER = "| ID | English | Korean |";
const PROGRESS_TITLE = "# Flashcard Progress";
const PROGRESS_HEADER = "| ID | Study Count |";

export function parseWordbook(markdown) {
  const lines = meaningfulLines(markdown);
  if (lines.length < 3 || lines[0] !== WORDBOOK_TITLE || lines[1] !== WORDBOOK_HEADER) {
    throw new Error("Invalid wordbook format.");
  }
  validateSeparator(lines[2], 3, "wordbook");

  const cards = lines.slice(3).map((row) => {
    const [id, english, korean] = parseRow(row, 3, "wordbook");
    const card = { id, english, korean };
    validateCard(card);
    return card;
  });
  validateCards(cards);
  return cards;
}

export function serializeWordbook(cards) {
  validateCards(cards);
  const rows = [WORDBOOK_TITLE, "", WORDBOOK_HEADER, "| --- | --- | --- |"];
  rows.push(...cards.map((card) => `| ${card.id} | ${card.english} | ${card.korean} |`));
  return `${rows.join("\n")}\n`;
}

export function parseProgress(markdown) {
  const lines = meaningfulLines(markdown);
  if (lines.length < 3 || lines[0] !== PROGRESS_TITLE || lines[1] !== PROGRESS_HEADER) {
    throw new Error("Invalid progress format.");
  }
  validateSeparator(lines[2], 2, "progress");

  const progress = {};
  for (const row of lines.slice(3)) {
    const [id, countText] = parseRow(row, 2, "progress");
    if (Object.hasOwn(progress, id)) {
      throw new Error("Progress contains duplicate IDs.");
    }
    if (!/^\d+$/.test(countText)) {
      throw new Error("Study count must be a non-negative integer.");
    }
    progress[id] = Number(countText);
  }
  validateProgress(progress);
  return progress;
}

export function serializeProgress(progress) {
  validateProgress(progress);
  const rows = [PROGRESS_TITLE, "", PROGRESS_HEADER, "| --- | --- |"];
  for (const id of Object.keys(progress).sort()) {
    rows.push(`| ${id} | ${progress[id]} |`);
  }
  return `${rows.join("\n")}\n`;
}

export function progressFilenameFor(wordbookName) {
  const normalizedName = String(wordbookName).trim();
  if (!normalizedName) {
    throw new Error("Wordbook name is required.");
  }
  const extensionIndex = normalizedName.lastIndexOf(".");
  const stem = extensionIndex > 0 ? normalizedName.slice(0, extensionIndex) : normalizedName;
  return `${stem}.progress.md`;
}

export function reconcileProgress(cards, progress) {
  validateCards(cards);
  validateProgress(progress);
  return Object.fromEntries(cards.map((card) => [card.id, progress[card.id] ?? 0]));
}

function meaningfulLines(markdown) {
  if (typeof markdown !== "string") {
    throw new Error("Markdown text is required.");
  }
  return markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseRow(row, expectedColumns, formatName) {
  if (!row.startsWith("|") || !row.endsWith("|")) {
    throw new Error(`Invalid ${formatName} format.`);
  }
  const values = row.slice(1, -1).split("|").map((value) => value.trim());
  if (values.length !== expectedColumns || values.some((value) => !value)) {
    throw new Error(`Invalid ${formatName} format.`);
  }
  return values;
}

function validateSeparator(row, expectedColumns, formatName) {
  if (parseRow(row, expectedColumns, formatName).some((value) => value !== "---")) {
    throw new Error(`Invalid ${formatName} format.`);
  }
}

function validateCards(cards) {
  if (!Array.isArray(cards)) {
    throw new Error("Wordbook cards are required.");
  }
  const ids = cards.map((card) => {
    validateCard(card);
    return card.id;
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error("Wordbook contains duplicate IDs.");
  }
}

function validateCard(card) {
  if (!card || typeof card !== "object") {
    throw new Error("Wordbook values cannot be blank.");
  }
  for (const value of [card.id, card.english, card.korean]) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Wordbook values cannot be blank.");
    }
    if (value.includes("|") || value.includes("\n") || value.includes("\r")) {
      throw new Error("Wordbook values cannot contain Markdown table separators.");
    }
  }
}

function validateProgress(progress) {
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    throw new Error("Progress records are required.");
  }
  for (const [id, count] of Object.entries(progress)) {
    if (!id || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("Study count must be a non-negative integer.");
    }
  }
}
