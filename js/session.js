export function selectSessionCards(cards, progress, requestedCount, random) {
  if (!Number.isInteger(requestedCount) || requestedCount <= 0) {
    throw new Error("Requested card count must be positive.");
  }
  if (!Array.isArray(cards)) {
    throw new Error("Cards are required.");
  }
  if (typeof random !== "function") {
    throw new Error("Random source is required.");
  }

  const remaining = [...cards];
  const selected = [];
  const targetCount = Math.min(requestedCount, remaining.length);
  for (let index = 0; index < targetCount; index += 1) {
    const weights = remaining.map((card) => weightFor(card, progress));
    const selectedIndex = weightedIndex(weights, random);
    const [card] = remaining.splice(selectedIndex, 1);
    selected.push({ card, frontLanguage: randomValue(random) < 0.5 ? "english" : "korean", flipped: false });
  }
  return selected;
}

export function clickStudyCard(studyCard, progress) {
  if (studyCard.flipped) {
    return { action: "next" };
  }
  studyCard.flipped = true;
  const cardId = studyCard.card.id;
  progress[cardId] = (progress[cardId] ?? 0) + 1;
  return { action: "flipped" };
}

function weightFor(card, progress) {
  const count = progress[card.id] ?? 0;
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Study count must be a non-negative integer.");
  }
  return 1 / (count + 1);
}

function weightedIndex(weights, random) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = randomValue(random) * total;
  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) {
      return index;
    }
  }
  return weights.length - 1;
}

function randomValue(random) {
  const value = random();
  if (typeof value !== "number" || value < 0 || value >= 1) {
    throw new Error("Random source must return a value from 0 up to 1.");
  }
  return value;
}
