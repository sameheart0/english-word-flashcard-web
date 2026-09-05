import { parseProgress, parseWordbook, progressFilenameFor, reconcileProgress, serializeProgress, serializeWordbook } from "./markdown.js";
import { loadSavedState, saveState } from "./persistence.js";
import { clickStudyCard, selectSessionCards } from "./session.js";

export function applyProgressImport(cards, importedProgress) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("Load a wordbook before importing progress.");
  }
  return reconcileProgress(cards, importedProgress);
}

if (typeof document !== "undefined") {
  startBrowserApp();
}

function startBrowserApp() {
  const root = document.querySelector("#app");
  const wordbookInput = document.querySelector("#wordbook-input");
  const progressInput = document.querySelector("#progress-input");
  let state = loadSavedState(window.localStorage);
  let screen = "home";
  let selectedId = null;
  let sessionCards = [];
  let sessionIndex = 0;
  let message = "";
  let error = "";

  const persist = () => {
    try { saveState(window.localStorage, state); } catch (cause) { error = `학습 상태를 저장할 수 없습니다. ${cause.message}`; }
  };
  const setMessage = (value) => { message = value; error = ""; };
  const setError = (value) => { error = value; message = ""; };
  const active = () => state?.cards ?? [];
  const visibleLanguage = (studyCard) => studyCard.flipped === (studyCard.frontLanguage === "korean") ? "english" : "korean";
  const renderNotice = () => `${message ? `<p class="status">${escapeHtml(message)}</p>` : ""}${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}`;

  function render() {
    if (screen === "editor") return renderEditor();
    if (screen === "setup") return renderSetup();
    if (screen === "study") return renderStudy();
    if (screen === "complete") return renderComplete();
    renderHome();
  }

  function renderHome() {
    root.innerHTML = `<section class="panel center"><h1>영어 단어 플래시카드</h1><p>${state ? `<strong>${escapeHtml(state.wordbookName)}</strong> 단어장 ${state.cards.length}개가 복원되었습니다.` : "Markdown 단어장을 불러와 학습을 시작하세요."}</p>${renderNotice()}<div class="actions"><button data-action="import-wordbook">단어장 불러오기</button><button class="secondary" data-action="editor" ${state ? "" : "disabled"}>입력 모드</button><button class="secondary" data-action="setup" ${state ? "" : "disabled"}>학습 모드</button></div><div class="actions"><button class="secondary" data-action="import-progress" ${state ? "" : "disabled"}>진행도 불러오기</button><button class="secondary" data-action="export-progress" ${state ? "" : "disabled"}>진행도 내보내기</button><button class="secondary" data-action="export-wordbook" ${state ? "" : "disabled"}>단어장 내보내기</button></div><p class="progress">학습 상태는 이 브라우저에 자동 저장됩니다. 기기 변경이나 사이트 데이터 삭제 전에는 진행도를 내보내세요.</p></section>`;
  }

  function renderEditor() {
    const selected = active().find((card) => card.id === selectedId);
    root.innerHTML = `<section class="panel"><h2>단어장 입력 모드</h2>${renderNotice()}<form class="editor-form" id="editor-form"><input name="english" required placeholder="영어 단어" value="${escapeAttribute(selected?.english ?? "")}"><input name="korean" required placeholder="한글 뜻" value="${escapeAttribute(selected?.korean ?? "")}"><button>${selected ? "수정" : "추가"}</button></form><ul class="card-list">${active().map((card) => `<li><span><strong>${escapeHtml(card.english)}</strong> — ${escapeHtml(card.korean)}</span><span><button class="secondary" data-select="${escapeAttribute(card.id)}">선택</button><button class="danger" data-delete="${escapeAttribute(card.id)}">삭제</button></span></li>`).join("")}</ul><div class="actions"><button class="secondary" data-action="home">처음으로</button><button class="secondary" data-action="export-wordbook">단어장 내보내기</button></div></section>`;
    document.querySelector("#editor-form").addEventListener("submit", submitEditor);
  }

  function renderSetup() {
    root.innerHTML = `<section class="panel center"><h2>학습 모드</h2>${renderNotice()}<p>현재 단어 수: ${active().length}</p><label>학습할 카드 수<br><input class="count-input" id="study-count" type="number" min="1" value="${Math.min(10, active().length)}"></label><div class="actions"><button data-action="start-study">학습 시작</button><button class="secondary" data-action="home">처음으로</button></div></section>`;
  }

  function renderStudy() {
    const studyCard = sessionCards[sessionIndex];
    const language = visibleLanguage(studyCard);
    const text = language === "english" ? studyCard.card.english : studyCard.card.korean;
    root.innerHTML = `<section class="panel center"><p class="progress">카드 ${sessionIndex + 1} / ${sessionCards.length}</p><button class="study-card ${language === "korean" ? "korean" : ""}" data-action="card-click"><span class="word">${escapeHtml(text)}</span><span class="hint">${studyCard.flipped ? "다시 클릭하면 다음 카드" : "클릭하거나 Enter 키로 뒤집기"}</span><span class="count">학습 횟수: ${state.progress[studyCard.card.id]}회</span></button><div class="actions"><button class="secondary" data-action="home">학습 중단</button></div></section>`;
  }

  function renderComplete() {
    root.innerHTML = `<section class="panel center"><h1>학습 완료</h1><p>${sessionCards.length}개의 카드를 학습했습니다.</p><button data-action="home">모드 선택으로</button></section>`;
  }

  async function importWordbook(file) {
    try { const cards = parseWordbook(await file.text()); state = { version: 1, wordbookName: file.name, cards, progress: reconcileProgress(cards, {}) }; persist(); setMessage(`${file.name} 단어장을 불러왔습니다.`); } catch (cause) { setError(`단어장을 불러올 수 없습니다. ${cause.message}`); }
    render();
  }
  async function importProgress(file) {
    try { state.progress = applyProgressImport(state?.cards, parseProgress(await file.text())); persist(); setMessage("학습 기록을 불러왔습니다."); } catch (cause) { setError(`학습 기록을 불러올 수 없습니다. ${cause.message}`); }
    render();
  }
  function submitEditor(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const english = String(form.get("english")).trim(); const korean = String(form.get("korean")).trim();
    if (!english || !korean || /[|\r\n]/.test(english + korean)) return setError("단어와 뜻을 올바르게 입력하세요."), render();
    if (selectedId) { state.cards = state.cards.map((card) => card.id === selectedId ? { ...card, english, korean } : card); selectedId = null; setMessage("단어를 수정했습니다."); } else { state.cards.push({ id: crypto.randomUUID(), english, korean }); state.progress = reconcileProgress(state.cards, state.progress); setMessage("단어를 추가했습니다."); }
    persist(); render();
  }
  function download(name, text) { const link = document.createElement("a"); const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" })); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
  function handleAction(action) {
    if (action === "import-wordbook") return wordbookInput.click(); if (action === "import-progress") return progressInput.click(); if (action === "editor") screen = "editor"; else if (action === "setup") screen = "setup"; else if (action === "home") { screen = "home"; sessionCards = []; } else if (action === "export-progress") download(progressFilenameFor(state.wordbookName), serializeProgress(state.progress)); else if (action === "export-wordbook") download(state.wordbookName, serializeWordbook(state.cards)); else if (action === "start-study") { try { const count = Number(document.querySelector("#study-count").value); sessionCards = selectSessionCards(state.cards, state.progress, count, Math.random); sessionIndex = 0; screen = "study"; } catch (cause) { setError(cause.message); } } else if (action === "card-click") { const result = clickStudyCard(sessionCards[sessionIndex], state.progress); if (result.action === "next") { sessionIndex += 1; if (sessionIndex >= sessionCards.length) screen = "complete"; } persist(); }
    render();
  }
  root.addEventListener("click", (event) => { const target = event.target.closest("button"); if (!target) return; if (target.dataset.select) { selectedId = target.dataset.select; screen = "editor"; render(); return; } if (target.dataset.delete) { state.cards = state.cards.filter((card) => card.id !== target.dataset.delete); state.progress = reconcileProgress(state.cards, state.progress); selectedId = null; persist(); setMessage("단어를 삭제했습니다."); screen = "editor"; render(); return; } handleAction(target.dataset.action); });
  wordbookInput.addEventListener("change", () => { const [file] = wordbookInput.files; if (file) importWordbook(file); wordbookInput.value = ""; });
  progressInput.addEventListener("change", () => { const [file] = progressInput.files; if (file) importProgress(file); progressInput.value = ""; });
  render();
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
function escapeAttribute(value) { return escapeHtml(value); }
