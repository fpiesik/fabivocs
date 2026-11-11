import { STORAGE_KEY, alternatives, createQueue, importDecks, isCorrect, localDate, makeChoices, matchingWords, orient, remainingSeconds, shuffle, streak, validateDeck, vocabularySignature, wordKey } from './core.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icons = {
  practice: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
  cards: '<rect x="7" y="5" width="13" height="16" rx="3"/><path d="M4 17V5a3 3 0 0 1 3-3h9M11 11h5m-5 4h3"/>',
  match: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M14 6h4a2 2 0 0 1 2 2v2M10 18H6a2 2 0 0 1-2-2v-2"/>',
  sprint: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  race: '<circle cx="12" cy="14" r="8"/><path d="M12 10v4l3 2M9 2h6m-3 0v4m6 2 2-2"/>',
  book: '<path d="M12 5v16m0-16C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trophy: '<path d="M8 3h8v8a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v6m-4 0h8"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.book}</svg>`;
const modes = [
  { id: 'practice', name: 'Ganz entspannt', tag: 'ÜBEN', description: 'Wort für Wort. Ohne Zeitdruck, mit Tipps für deinen nächsten Versuch.', label: 'In deinem Tempo', color: 'mint' },
  { id: 'cards', name: 'Karteikarten', tag: 'ENTDECKEN', description: 'Erst überlegen, dann umdrehen. Wie viele Wörter kennst du schon?', label: 'Ansehen & merken', color: 'blue' },
  { id: 'match', name: 'Wörter verbinden', tag: 'KOMBINIEREN', description: 'Finde die Wortpaare, die zusammengehören. Ein Match für dein Gehirn!', label: 'Bis zu 6 Paare', color: 'lilac' },
  { id: 'sprint', name: 'Gegen die Uhr', tag: 'SPEEDRUN', description: 'Die Zeit läuft! Wie viele richtige Antworten schaffst du?', label: '30, 60 oder 120 Sekunden', color: 'peach' },
  { id: 'race', name: 'Auf die Plätze!', tag: 'SPEEDRUN', description: 'Eine feste Anzahl Wörter. Wie schnell erreichst du dein Ziel?', label: 'Deine neue Bestzeit?', color: 'yellow' },
];

const emptyState = () => ({ decks: [], progress: {}, history: [] });
let saved = emptyState(), storageWarning = '';
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  if (raw) {
    if (!Array.isArray(raw.decks) || !Array.isArray(raw.history) || !raw.progress || typeof raw.progress !== 'object' || Array.isArray(raw.progress)) throw new Error();
    saved = { decks: raw.decks.map(deck => ({ ...validateDeck(deck), id: String(deck.id), shared: false })), progress: raw.progress, history: raw.history.filter(entry => entry && typeof entry.day === 'string' && Number.isFinite(entry.correct) && Number.isFinite(entry.total) && Number.isFinite(entry.seconds)).slice(0, 500) };
  }
} catch { storageWarning = 'Gespeicherte Daten konnten nicht geladen werden. Du kannst üben; exportiere wichtige Listen zur Sicherheit.'; }

let sharedDecks = [], sharedError = false;
let selectedDeckId = '', selectedMode = 'practice', session = null, timer = null, result = null, importPreview = null;
let settings = { direction: 'forward', answer: 'choice', length: '10', duration: '60', target: '10', difficult: false };
const allDecks = () => [...sharedDecks, ...saved.decks];
const currentDeck = () => allDecks().find(deck => deck.id === selectedDeckId) ?? allDecks()[0];
const activeWords = deck => settings.difficult ? deck.words.filter(word => { const p = saved.progress[wordKey(deck.id, word, settings.direction)]; return p?.wrong > 0 && p.streak < 3; }) : deck.words;
const answerLabel = answer => answer === 'choice' ? 'Multiple Choice' : 'Freies Schreiben';

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); storageWarning = ''; return true; }
  catch { storageWarning = 'Der Browser kann deine Daten nicht speichern. Sie bleiben nur bis zum Neuladen erhalten. Exportiere deine Listen.'; toast(storageWarning); return false; }
}

let toastTimer;
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500);
}

function route() {
  if (session) { location.hash = '#spiel'; return; }
  const page = location.hash.slice(1);
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === (['wortschatz', 'fortschritt'].includes(page) ? page : 'lernen');
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (page === 'wortschatz') renderLibrary();
  else if (page === 'fortschritt') renderProgress();
  else if (page === 'ergebnis' && result) renderResult();
  else renderHome();
}

const warning = () => `${storageWarning ? `<div class="notice warning" role="status">${escape(storageWarning)}</div>` : ''}${sharedError ? '<div class="notice warning">Die gemeinsamen Listen konnten nicht geladen werden. <button class="text-button" id="reload-button">Erneut laden</button> oder eigene Vokabeln importieren.</div>' : ''}`;

function renderHome() {
  const deck = currentDeck();
  if (deck) selectedDeckId = deck.id;
  const today = saved.history.filter(entry => entry.day === localDate()).reduce((sum, entry) => sum + entry.correct, 0);
  $('#main').innerHTML = `${warning()}
    <section class="welcome"><div><p class="eyebrow"><span class="status-dot"></span> DEIN WORTABENTEUER · ENGLISCH, KLASSE 5</p><h1>Aus Wörtern<br>wird <span>Wissen.</span><svg class="heading-spark" viewBox="0 0 48 48" aria-hidden="true"><path d="m24 3 3 14 13-6-9 12 14 5-15 2 3 14-9-11-10 11 3-15L3 25l14-3-8-12 13 6Z" fill="currentColor"/></svg></h1><p class="welcome-copy">Ein kleines Spiel. Ein neues Wort. Ein gutes Gefühl.<br>Was möchtest du heute ausprobieren?</p></div>
      <aside class="daily-card"><span class="daily-icon">${icon('practice')}</span><div><p>DEIN KLEINER LERNMOMENT</p><strong>${today ? `${today} richtige Antworten heute!` : 'Heute ist ein guter Tag zum Lernen.'}</strong><span>${today ? 'Jedes Wort zählt. Mach weiter so!' : 'Schon 5 Minuten machen einen Unterschied.'}</span></div><div class="daily-bottom"><span>${streak(saved.history)} ${streak(saved.history) === 1 ? 'Lerntag' : 'Lerntage'} in Folge</span><span aria-hidden="true">✦ ✦ ✦</span></div></aside>
    </section>
    <section class="learning-layout" aria-label="Training einstellen">
      <aside class="setup-panel"><div class="section-number">01 <span>DEINE WÖRTER</span></div><h2>Was üben wir?</h2>
        ${deck ? `<label for="deck-select">Vokabelliste</label><select id="deck-select">${allDecks().map(item => `<option value="${escape(item.id)}" ${item.id === deck.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}</select><p class="field-hint">${icon('book')} ${deck.words.length} Wörter · ${escape(deck.sourceLanguage)} & ${escape(deck.targetLanguage)}</p>
        <label for="direction-select">Lernrichtung</label><select id="direction-select"><option value="forward" ${settings.direction === 'forward' ? 'selected' : ''}>${escape(deck.sourceLanguage)} → ${escape(deck.targetLanguage)}</option><option value="reverse" ${settings.direction === 'reverse' ? 'selected' : ''}>${escape(deck.targetLanguage)} → ${escape(deck.sourceLanguage)}</option></select>
        <label class="checkbox-label"><input id="difficult-only" type="checkbox" ${settings.difficult ? 'checked' : ''}> Nur schwierige Wörter</label><p class="field-hint">Wörter mit Fehlern, bis du sie dreimal in Folge richtig beantwortest.</p>` : '<p>Noch keine Wörter da. Importiere deine erste Liste!</p>'}
        <a href="#wortschatz" class="import-link">${icon('upload')} Eigene Wörter importieren ${icon('arrow')}</a>
        <div class="little-tip"><span aria-hidden="true">✦</span><p><strong>Kleiner Lerntipp</strong>Lieber jeden Tag ein paar Wörter als alle auf einmal.</p></div>
      </aside>
      <div class="games-panel"><div class="games-heading"><div><div class="section-number">02 <span>DEIN SPIEL</span></div><h2>Wie möchtest du lernen?</h2></div><span class="pill">5 Wege zum Wortschatz</span></div>
        <div class="mode-grid" role="group" aria-label="Spielmodus">${modes.map(mode => `<button class="mode-card ${mode.color} ${selectedMode === mode.id ? 'selected' : ''}" data-mode="${mode.id}" aria-pressed="${selectedMode === mode.id}"><span class="mode-top"><span class="mode-icon">${icon(mode.id)}</span><span class="mode-tag">${mode.tag}</span><span class="selection-dot">${icon('check')}</span></span><strong>${mode.name}</strong><span class="mode-description">${mode.description}</span><span class="mode-label">${mode.label} <span aria-hidden="true">↗</span></span></button>`).join('')}<div class="encouragement"><span aria-hidden="true">a<span>b</span>c</span><p>Du musst noch nicht alles können.<br><strong>Du darfst es hier lernen.</strong></p></div></div>
        <div id="game-settings"></div>
      </div>
    </section>`;
  renderSettings();
}

function renderSettings() {
  const el = $('#game-settings'); if (!el) return;
  const standard = ['practice', 'sprint', 'race'].includes(selectedMode);
  const deck = currentDeck();
  const count = deck ? activeWords(deck).length : 0;
  el.innerHTML = `<div class="launch-panel"><div class="launch-options">${standard ? `<div><label for="answer-select">Antworten</label><select id="answer-select"><option value="choice" ${settings.answer === 'choice' ? 'selected' : ''}>Multiple Choice</option><option value="write" ${settings.answer === 'write' ? 'selected' : ''}>Freies Schreiben</option></select></div>` : ''}
    ${selectedMode === 'sprint' ? `<div><label for="duration-select">Zeitlimit</label><select id="duration-select">${[30, 60, 120].map(n => `<option value="${n}" ${settings.duration === String(n) ? 'selected' : ''}>${n} Sekunden</option>`).join('')}</select></div>` : ''}
    ${selectedMode === 'race' ? `<div><label for="target-select">Dein Ziel</label><select id="target-select">${[10, 20, 30].map(n => `<option value="${n}" ${settings.target === String(n) ? 'selected' : ''}>${n} richtige Antworten</option>`).join('')}</select></div>` : ''}
    ${['practice', 'cards'].includes(selectedMode) ? `<div><label for="length-select">Rundenlänge</label><select id="length-select">${['10', '20', 'all'].map(n => `<option value="${n}" ${settings.length === n ? 'selected' : ''}>${n === 'all' ? 'Alle' : n} Wörter</option>`).join('')}</select></div>` : ''}
    ${selectedMode === 'match' ? '<p>Wähle erst ein Wort links, dann die passende Übersetzung rechts.</p>' : ''}</div><button class="button primary start-button" id="start-button" ${!count ? 'disabled' : ''}>Los geht’s ${icon('arrow')}</button></div>
    <p class="launch-hint">${!count ? 'Hier gibt es gerade keine passenden Wörter. Wähle eine andere Liste oder deaktiviere den Filter.' : selectedMode === 'cards' ? 'Du entscheidest selbst, ob du die Antwort wusstest.' : selectedMode === 'sprint' || selectedMode === 'race' ? 'Wörter können sich wiederholen. Die Uhr läuft durch, auch beim Lesen der Lösung.' : 'Kein Druck. Jeder Versuch macht dich ein bisschen besser.'}</p>`;
}

function renderLibrary() {
  $('#main').innerHTML = `${warning()}<section class="page-heading"><p class="eyebrow">DEINE WÖRTER, DEINE WELT</p><h1>Mein <span>Wortschatz.</span></h1><p>Alles, was du lernen möchtest, an einem Ort.</p></section>
    <div class="library-layout"><section><div class="section-title"><h2>Deine Vokabellisten <span class="count-badge">${allDecks().length}</span></h2><button class="text-button" id="export-all" ${!allDecks().length ? 'disabled' : ''}>Alle exportieren ↓</button></div>
      <div class="deck-list">${allDecks().map(deck => `<article class="deck-card"><span class="deck-icon">${icon('book')}</span><div class="deck-info"><span class="eyebrow">${deck.shared ? 'GEMEINSAME LISTE' : 'DEINE EIGENE LISTE'}</span><h3>${escape(deck.name)}</h3><p>${deck.words.length} Wörter · ${escape(deck.sourceLanguage)} → ${escape(deck.targetLanguage)}</p><div class="deck-actions"><button class="text-button" data-use-deck="${escape(deck.id)}">Lernen →</button><button class="text-button" data-view-deck="${escape(deck.id)}">Ansehen</button><button class="text-button" data-export-deck="${escape(deck.id)}">Exportieren</button>${!deck.shared ? `<button class="text-button danger-text" data-delete-deck="${escape(deck.id)}">Löschen</button>` : ''}</div></div></article>`).join('') || '<div class="empty-state">Deine erste Liste wartet schon. Importiere rechts deine Wörter.</div>'}</div>
      <div class="notice">Gemeinsame Listen werden aus den CSV- und JSON-Dateien im Repository automatisch aktualisiert. Eigene Importe bleiben in diesem Browser. Mit „Exportieren“ kannst du sie sichern.</div>
    </section><section class="import-panel"><span class="mode-icon mint">${icon('upload')}</span><h2>Neue Wörter mitbringen</h2><p class="muted">Aus deiner Tabelle direkt ins nächste Spiel.</p><form id="import-form">
      <label for="import-name">Name der Liste</label><input id="import-name" name="name" maxlength="80" value="Meine Englisch-Vokabeln" required>
      <div class="two-cols"><div><label for="import-source">Erste Spalte</label><input id="import-source" name="sourceLanguage" maxlength="80" value="Englisch" required></div><div><label for="import-target">Zweite Spalte</label><input id="import-target" name="targetLanguage" maxlength="80" value="Deutsch" required></div></div>
      <label class="file-zone" for="import-file">${icon('upload')}<strong>CSV- oder JSON-Datei auswählen</strong><span>UTF-8 · bis 2 MB</span><input type="file" id="import-file" accept=".csv,.tsv,.txt,.json,text/csv,application/json"></label>
      <label for="import-text">Oder Wortpaare einfügen</label><textarea id="import-text" name="text" rows="6" placeholder="apple;Apfel&#10;book;Buch&#10;friend;Freund | Freundin" aria-describedby="import-hint"></textarea>
      <p class="field-hint" id="import-hint">Zwei Spalten, getrennt durch Tabulator, Semikolon oder Komma. Mehrere richtige Übersetzungen mit | trennen. Eine Kopfzeile ist optional. Excel-Dateien bitte als CSV UTF-8 speichern.</p>
      <label for="import-delimiter">Trennzeichen</label><select id="import-delimiter" name="delimiter"><option value="auto">Automatisch erkennen</option><option value=";">Semikolon ;</option><option value=",">Komma ,</option><option value="tab">Tabulator (Excel)</option></select>
      <div id="import-error" class="form-error" role="alert"></div><button class="button primary full-width" type="submit">Vorschau ansehen ${icon('arrow')}</button><a class="sample-link" href="./examples/vokabeln.csv" download>CSV-Beispiel herunterladen ↓</a>
    </form><div id="import-preview"></div></section></div>`;
}

function showImportPreview(decks) {
  importPreview = decks;
  $('#import-preview').innerHTML = `<div class="preview-box"><h3>Sieht das richtig aus?</h3><p>${decks.length} ${decks.length === 1 ? 'Liste' : 'Listen'} · ${decks.reduce((sum, deck) => sum + deck.words.length, 0)} Wortpaare (exakte Duplikate entfernt)</p>${decks.map(deck => `<h4>${escape(deck.name)}</h4>${wordTable(deck, 5)}`).join('')}<button class="button primary full-width" id="confirm-import">${icon('check')} Jetzt importieren</button></div>`;
  $('#confirm-import').focus();
}

function wordTable(deck, max = Infinity) {
  return `<div class="table-wrap"><table><thead><tr><th>${escape(deck.sourceLanguage)}</th><th>${escape(deck.targetLanguage)}</th></tr></thead><tbody>${deck.words.slice(0, max).map(word => `<tr><td>${escape(word.front)}</td><td>${escape(word.back)}</td></tr>`).join('')}</tbody></table></div>${deck.words.length > max ? `<p class="field-hint">… und ${deck.words.length - max} weitere Wortpaare.</p>` : ''}`;
}

function exportDecks(decks) {
  const data = { version: 1, decks: decks.map(({ name, sourceLanguage, targetLanguage, words }) => ({ name, sourceLanguage, targetLanguage, words })) };
  downloadJSON(JSON.stringify(data, null, 2), `fabivocs-vokabeln-${localDate()}.json`);
}

function downloadJSON(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  (document.querySelector('dialog[open]') ?? document.body).append(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showDeck(deck) {
  const dialog = document.createElement('dialog'); dialog.className = 'deck-dialog';
  dialog.innerHTML = `<div class="dialog-heading"><h2>${escape(deck.name)}</h2><button class="icon-button" data-close-dialog aria-label="Schließen">×</button></div>${wordTable(deck)}`;
  document.body.append(dialog); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal();
}

function startGame() {
  const deck = currentDeck(); if (!deck) return;
  const words = activeWords(deck); if (!words.length) return;
  const mode = selectedMode;
  const pool = mode === 'match' ? matchingWords(words, settings.direction) : words;
  const length = settings.length === 'all' ? words.length : Math.min(Number(settings.length), words.length);
  const queue = mode === 'match' ? pool : mode === 'sprint' || mode === 'race' ? createQueue(pool, Math.max(30, pool.length)) : shuffle(pool).slice(0, length);
  const answer = settings.answer === 'choice' && words.length < 2 ? 'write' : settings.answer;
  session = { deck, words: pool, queue, mode, answer, direction: settings.direction, duration: Number(settings.duration), target: Number(settings.target), index: 0, correct: 0, total: 0, start: performance.now(), feedback: null, revealed: false, mistakes: [], rightOrder: shuffle(pool.map((_, index) => index)), matched: [], left: null, right: null, matchFeedback: '', locked: false };
  result = null; location.hash = '#spiel';
  renderGame();
  clearInterval(timer);
  if (mode === 'sprint' || mode === 'race' || mode === 'match') timer = setInterval(tick, 100);
}

function elapsed() { return Math.max(0, (performance.now() - session.start) / 1000); }
function timeLabel(seconds) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function tick() {
  if (!session) return;
  if (session.mode === 'sprint' && elapsed() >= session.duration) { finishGame(); return; }
  const display = $('#timer');
  if (display) {
    const remaining = remainingSeconds(session.start, session.duration, performance.now());
    display.textContent = session.mode === 'sprint' ? `${remaining} s` : timeLabel(elapsed());
    display.classList.toggle('urgent', session.mode === 'sprint' && remaining <= 10);
  }
}

function renderGame() {
  const s = session; if (!s) return;
  const mode = modes.find(item => item.id === s.mode);
  const timed = ['sprint', 'race', 'match'].includes(s.mode);
  const target = s.mode === 'race' ? s.target : s.queue.length;
  const done = s.mode === 'race' ? s.correct : s.mode === 'match' ? s.matched.length : s.index;
  $('#main').innerHTML = `<section class="game-shell"><div class="game-top"><button class="text-button" id="quit-game">← Runde beenden</button><span>${escape(s.deck.name)}</span><span class="pill">${mode.name}</span></div>
    <div class="game-status"><div><span class="eyebrow">${s.mode === 'sprint' ? 'RICHTIGE ANTWORTEN' : s.mode === 'race' ? 'DEIN ZIEL' : s.mode === 'match' ? 'GEFUNDENE PAARE' : 'DEINE RUNDE'}</span><strong id="game-count">${s.mode === 'sprint' ? s.correct : `${Math.min(done + (s.mode === 'practice' || s.mode === 'cards' ? 1 : 0), target)} <span>/ ${target}</span>`}</strong></div>${timed ? `<div class="timer-box">${icon('race')}<strong id="timer">${s.mode === 'sprint' ? `${remainingSeconds(s.start, s.duration, performance.now())} s` : timeLabel(elapsed())}</strong></div>` : `<span class="game-score">${icon('check')} ${s.correct} richtig</span>`}</div>
    ${s.mode !== 'sprint' ? `<div class="progress-track" role="progressbar" aria-label="Rundenfortschritt" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${done}"><span style="width:${Math.min(100, done / target * 100)}%"></span></div>` : ''}
    <div id="question-area"></div></section>`;
  if (s.mode === 'match') renderMatching(); else renderQuestion();
}

function renderQuestion() {
  const s = session, word = s.queue[s.index], entry = orient(word, s.direction);
  const from = s.direction === 'forward' ? s.deck.sourceLanguage : s.deck.targetLanguage;
  const to = s.direction === 'forward' ? s.deck.targetLanguage : s.deck.sourceLanguage;
  const cards = s.mode === 'cards';
  const choices = s.answer === 'choice' ? makeChoices(word, s.words, s.direction) : [];
  if (!cards && choices.length < 2) s.currentAnswer = 'write'; else s.currentAnswer = s.answer;
  $('#question-area').innerHTML = `<div class="question-card"><p class="eyebrow">${escape(from)} → ${escape(to)}</p><p class="question-instruction">${cards ? 'Kennst du die Übersetzung?' : `Wie heißt das auf ${escape(to)}?`}</p><h1 class="question-word">${escape(alternatives(entry.prompt).join(' / '))}</h1>
    ${cards ? `<div class="card-reveal" aria-live="polite">${s.revealed ? `<span class="eyebrow">DIE ÜBERSETZUNG</span><strong>${escape(alternatives(entry.answer).join(' / '))}</strong>` : '<span>Erst kurz überlegen …</span>'}</div><div class="card-actions">${s.revealed ? '<button class="button secondary" data-card-grade="wrong">Noch üben</button><button class="button primary" data-card-grade="correct">Das wusste ich ✓</button>' : '<button class="button primary" id="reveal-card">Karte umdrehen ↻</button>'}</div>` : `
      ${s.currentAnswer === 'choice' ? `<div class="answer-grid">${choices.map((choice, index) => `<button class="answer-option" data-answer="${escape(choice)}"><span>${index + 1}</span>${escape(choice)}</button>`).join('')}</div>` : `<form id="answer-form" autocomplete="off"><label for="written-answer" class="sr-only">Deine Übersetzung</label><div class="write-answer"><input id="written-answer" placeholder="Deine Übersetzung …" autocapitalize="off" autocomplete="off" spellcheck="false" required maxlength="300"><button class="button primary" type="submit">Prüfen ${icon('arrow')}</button></div><p class="field-hint">Eine Übersetzung reicht. Groß-/Kleinschreibung ist egal.</p></form>`}
      <button class="text-button skip-answer" id="skip-answer">Weiß ich noch nicht</button><div id="answer-feedback" aria-live="polite"></div>`}
    </div><p class="game-bottom-note">${cards ? 'Ehrlich zu dir selbst sein hilft dir beim Lernen.' : s.currentAnswer === 'choice' ? 'Wähle deine Antwort. Mit den Tasten 1–4 geht es auch.' : 'Mit Enter prüfen und danach mit Enter weiter.'}</p>`;
  if (!cards && s.currentAnswer === 'write') $('#written-answer').focus();
  if (!cards && s.currentAnswer === 'choice') $('.answer-option')?.focus();
  if (cards && !s.revealed) $('#reveal-card').focus();
  if (cards && s.revealed) $('[data-card-grade="wrong"]').focus();
}

function recordAnswer(word, correct) {
  const s = session;
  s.total++; if (correct) s.correct++;
  const key = wordKey(s.deck.id, word, s.direction);
  const previous = saved.progress[key] ?? { correct: 0, wrong: 0, streak: 0 };
  saved.progress[key] = { correct: (Number(previous.correct) || 0) + (correct ? 1 : 0), wrong: (Number(previous.wrong) || 0) + (correct ? 0 : 1), streak: correct ? (Number(previous.streak) || 0) + 1 : 0 };
  if (!correct && !s.mistakes.some(item => item.front === word.front && item.back === word.back)) s.mistakes.push(word);
}

function submitAnswer(answer, skipped = false) {
  const s = session; if (!s || s.feedback) return;
  if (s.mode === 'sprint' && elapsed() >= s.duration) { finishGame(); return; }
  if (!skipped && !answer.trim()) return;
  const word = s.queue[s.index], expected = orient(word, s.direction).answer;
  const correct = !skipped && isCorrect(answer, expected);
  recordAnswer(word, correct); s.feedback = { correct };
  if (s.mode === 'race' && s.correct >= s.target) { finishGame(); return; }
  document.querySelectorAll('.answer-option, #answer-form button, #written-answer, #skip-answer').forEach(el => { el.disabled = true; });
  document.querySelectorAll('.answer-option').forEach(el => {
    if (isCorrect(el.dataset.answer, expected)) el.classList.add('correct');
    else if (el.dataset.answer === answer) el.classList.add('incorrect');
  });
  $('#answer-feedback').innerHTML = `<div class="feedback ${correct ? 'good' : 'try-again'}"><div><strong>${correct ? 'Genau richtig! ✦' : 'Das lernst du noch.'}</strong><span>${correct ? 'Weiter zum nächsten Wort.' : `Richtig ist: ${escape(alternatives(expected).join(' / '))}`}</span></div><button class="button ${correct ? 'primary' : 'secondary'}" id="next-question">${s.mode === 'practice' && s.index + 1 >= s.queue.length ? 'Ergebnis' : 'Weiter'} →</button></div>`;
  if (s.mode === 'sprint') $('#game-count').textContent = s.correct;
  $('#next-question').focus();
}

function nextQuestion() {
  const s = session; if (!s) return;
  s.index++; s.feedback = null; s.revealed = false;
  if (s.index >= s.queue.length) {
    if (s.mode === 'sprint' || s.mode === 'race') s.queue.push(...createQueue(s.words, Math.max(30, s.words.length)));
    else { finishGame(); return; }
  }
  renderGame();
}

function renderMatching() {
  const s = session;
  const button = (index, side) => {
    const entry = orient(s.words[index], s.direction);
    const matched = s.matched.includes(index), selected = s[side] === index;
    return `<button class="match-word ${matched ? 'matched' : ''} ${selected ? 'picked' : ''}" data-match-index="${index}" data-match-side="${side}" aria-pressed="${selected}" ${matched || s.locked ? 'disabled' : ''}>${escape(alternatives(side === 'left' ? entry.prompt : entry.answer)[0])}${matched ? ' ✓' : ''}</button>`;
  };
  $('#question-area').innerHTML = `<div class="match-board"><h2>Was gehört zusammen?</h2><p>Wähle auf jeder Seite ein Wort.</p><div class="match-columns"><div>${s.words.map((_, index) => button(index, 'left')).join('')}</div><div>${s.rightOrder.map(index => button(index, 'right')).join('')}</div></div><div class="match-feedback" role="status">${s.matchFeedback || 'Finde dein erstes Wortpaar.'}</div>${s.locked ? '<button class="button secondary" id="retry-match">Weiter versuchen →</button>' : ''}</div>`;
}

function selectMatch(index, side) {
  const s = session; if (!s || s.locked || s.matched.includes(index)) return;
  s[side] = s[side] === index ? null : index;
  if (s.left !== null && s.right !== null) {
    const correct = s.left === s.right;
    recordAnswer(s.words[s.left], correct);
    if (correct) {
      s.matched.push(s.left); s.left = null; s.right = null; s.matchFeedback = 'Ein tolles Paar! Weiter so. ✓';
      if (s.matched.length === s.words.length) { finishGame(); return; }
    } else { s.locked = true; s.matchFeedback = 'Diese beiden passen noch nicht zusammen. Versuch es gleich noch einmal.'; }
  }
  renderGame();
  if (s.locked) $('#retry-match').focus();
}

function finishGame(aborted = false) {
  const s = session; if (!s) return;
  const seconds = s.mode === 'sprint' && !aborted ? s.duration : elapsed();
  clearInterval(timer); timer = null;
  const entry = { id: crypto.randomUUID(), day: localDate(), date: new Date().toISOString(), deckId: s.deck.id, deckName: s.deck.name, mode: s.mode, answer: s.answer, direction: s.direction, duration: s.duration, target: s.target, correct: s.correct, total: s.total, seconds, aborted, filtered: settings.difficult, wordCount: s.words.length, signature: vocabularySignature(s.words) };
  if (s.total) { saved.history.unshift(entry); saved.history = saved.history.slice(0, 500); persist(); }
  result = { ...entry, mistakes: s.mistakes, deck: s.deck };
  session = null; location.hash = '#ergebnis'; renderResult();
}

function renderResult() {
  const r = result;
  const percent = r.total ? Math.round(r.correct / r.total * 100) : 0;
  const comparable = item => !item.aborted && item.mode === r.mode && item.deckId === r.deckId && item.answer === r.answer && item.direction === r.direction && item.filtered === r.filtered && item.signature === r.signature && (r.mode === 'sprint' ? item.duration === r.duration : item.target === r.target);
  const records = saved.history.filter(comparable);
  const best = r.mode === 'sprint' ? Math.max(0, ...records.map(item => item.correct)) : Math.min(Infinity, ...records.map(item => item.seconds));
  const isBest = !r.aborted && r.total > 0 && ['sprint', 'race'].includes(r.mode) && (r.mode === 'sprint' ? r.correct === best : r.seconds === best);
  $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon(isBest ? 'trophy' : 'practice')}</div><p class="eyebrow">${r.aborted ? 'RUNDE BEENDET' : isBest ? 'DEINE PERSÖNLICHE BESTLEISTUNG' : 'GUT GEMACHT, WORTENTDECKER!'}</p><h1>${r.total ? 'Ein Stück <span>weiter!</span>' : 'Bis zum <span>nächsten Mal!</span>'}</h1><p>${r.aborted ? 'Deine bisherigen Antworten sind gespeichert. Abgebrochene Runden zählen nicht als Rekord.' : r.mode === 'race' ? `Du hast dein Ziel von ${r.target} richtigen Antworten erreicht.` : 'Jede Runde macht deinen Wortschatz ein bisschen größer.'}</p>
      <div class="result-stats"><div><strong>${r.correct}<span> / ${r.total}</span></strong><span>${r.mode === 'cards' ? 'selbst als gewusst markiert' : 'richtige Antworten'}</span></div><div><strong>${r.seconds.toFixed(1).replace('.', ',')}<span> s</span></strong><span>${r.mode === 'sprint' ? 'Spielzeit' : 'benötigte Zeit'}</span></div><div><strong>${percent}<span> %</span></strong><span>Trefferquote</span></div></div>
      ${isBest ? '<div class="record-banner">✦ Stark! Das ist dein bisher bester Wert mit diesen Einstellungen.</div>' : ''}
      <div class="result-actions"><button class="button primary" id="play-again">Noch eine Runde ${icon('arrow')}</button><a class="button secondary" href="#lernen">Anderes Spiel wählen</a></div>
      ${r.mistakes.length ? `<section class="review-panel"><h2>Diese Wörter schauen wir uns nochmal an</h2><p class="muted">Fehler sind deine nächste Lernchance.</p>${wordTable({ ...r.deck, words: r.mistakes })}<button class="button secondary" id="practice-mistakes">Diese Wörter entspannt üben →</button></section>` : r.total ? '<p class="perfect-note">Kein Fehler in dieser Runde. Das kannst du schon richtig gut! ✨</p>' : ''}</section>`;
}

function renderProgress() {
  const history = saved.history, total = history.reduce((sum, entry) => sum + entry.total, 0), correct = history.reduce((sum, entry) => sum + entry.correct, 0);
  const currentKeys = new Set(allDecks().flatMap(deck => deck.words.flatMap(word => ['forward', 'reverse'].map(direction => wordKey(deck.id, word, direction)))));
  const known = Object.entries(saved.progress).filter(([key, value]) => currentKeys.has(key) && value.streak >= 3).length;
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return { label: date.toLocaleDateString('de-DE', { weekday: 'short' }), day: localDate(date), count: history.filter(entry => entry.day === localDate(date)).reduce((sum, entry) => sum + entry.correct, 0) }; });
  const max = Math.max(5, ...days.map(day => day.count));
  $('#main').innerHTML = `${warning()}<section class="page-heading"><p class="eyebrow">SCHRITT FÜR SCHRITT</p><h1>Das hast du <span>geschafft.</span></h1><p>Vergleiche dich mit dir selbst. Dein Wortschatz wächst mit jeder Runde.</p></section>
    <div class="stats-grid"><div class="stat-card"><span class="stat-symbol mint">${icon('practice')}</span><strong>${correct}</strong><span>richtige Antworten</span></div><div class="stat-card"><span class="stat-symbol blue">${icon('book')}</span><strong>${known}</strong><span>sichere Wörter je Lernrichtung</span></div><div class="stat-card"><span class="stat-symbol peach">${icon('sprint')}</span><strong>${streak(history)}</strong><span>Lerntage in Folge</span></div><div class="stat-card"><span class="stat-symbol lilac">${icon('check')}</span><strong>${total ? Math.round(correct / total * 100) : 0}%</strong><span>Trefferquote</span></div></div>
    <div class="progress-layout"><section class="white-panel"><h2>Deine letzte Woche</h2><p class="muted">Richtige Antworten pro Tag</p><div class="week-chart">${days.map(day => `<div class="chart-column"><span>${day.count}</span><div class="bar-track"><div style="height:${day.count / max * 100}%" class="${day.day === localDate() ? 'today' : ''}"></div></div><span>${day.label}</span></div>`).join('')}</div><p class="field-hint">Ein Wort gilt nach drei richtigen Antworten in Folge als sicher. Karteikarten zählen nach deiner Selbsteinschätzung.</p></section>
    <section class="white-panel"><h2>Deine letzten Runden</h2>${history.length ? `<div class="history-list">${history.slice(0, 8).map(entry => `<div class="history-row"><span class="history-icon">${icon(entry.mode)}</span><div><strong>${escape(modes.find(mode => mode.id === entry.mode)?.name ?? 'Übung')}</strong><span>${escape(entry.deckName)} · ${escape(entry.day)}${entry.aborted ? ' · beendet' : ''}</span><span>${['practice', 'race', 'sprint'].includes(entry.mode) ? `${answerLabel(entry.answer)} · ` : ''}${entry.seconds.toFixed(1).replace('.', ',')} s</span></div><strong>${entry.correct}/${entry.total}</strong></div>`).join('')}</div>` : '<div class="empty-state"><span>✦</span><h3>Hier beginnt deine Geschichte</h3><p>Spiele deine erste Runde und sieh zu, wie dein Fortschritt wächst.</p><a class="button primary" href="#lernen">Jetzt loslegen →</a></div>'}</section></div><p class="privacy-note">Die Statistik umfasst die letzten 500 Runden auf diesem Browser. Dein Wortlernstand bleibt darüber hinaus erhalten.</p>`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.matches('[data-close-dialog]')) { button.closest('dialog').close(); return; }
  const id = button.id;
  if (id === 'help-button') { $('#help-dialog').showModal(); return; }
  if (id === 'reload-button') { location.reload(); return; }
  if (button.dataset.mode) { selectedMode = button.dataset.mode; document.querySelectorAll('[data-mode]').forEach(el => { el.classList.toggle('selected', el.dataset.mode === selectedMode); el.setAttribute('aria-pressed', el.dataset.mode === selectedMode); }); renderSettings(); }
  if (id === 'start-button' || id === 'play-again') startGame();
  if (id === 'quit-game') { if (confirm('Diese Runde beenden? Deine bisherigen Antworten bleiben gespeichert.')) finishGame(true); }
  if (id === 'reveal-card' && session) { session.revealed = true; renderQuestion(); }
  if (button.dataset.cardGrade && session?.revealed) { recordAnswer(session.queue[session.index], button.dataset.cardGrade === 'correct'); nextQuestion(); }
  if (button.hasAttribute('data-answer')) submitAnswer(button.dataset.answer);
  if (id === 'skip-answer') submitAnswer('', true);
  if (id === 'next-question') nextQuestion();
  if (button.dataset.matchSide) selectMatch(Number(button.dataset.matchIndex), button.dataset.matchSide);
  if (id === 'retry-match' && session) { session.locked = false; session.left = null; session.right = null; renderMatching(); }
  if (id === 'practice-mistakes') {
    const r = result; selectedDeckId = r.deck.id; selectedMode = 'practice'; settings.difficult = false; settings.direction = r.direction;
    startGame();
    if (session) { session.words = r.mistakes; session.queue = shuffle(r.mistakes); renderGame(); }
  }
  if (button.dataset.useDeck) { selectedDeckId = button.dataset.useDeck; settings.difficult = false; location.hash = '#lernen'; }
  if (button.dataset.viewDeck) showDeck(allDecks().find(deck => deck.id === button.dataset.viewDeck));
  if (button.dataset.exportDeck) exportDecks(allDecks().filter(deck => deck.id === button.dataset.exportDeck));
  if (id === 'export-all') exportDecks(allDecks());
  if (button.dataset.deleteDeck) {
    const deck = saved.decks.find(item => item.id === button.dataset.deleteDeck);
    if (deck && confirm(`„${deck.name}“ aus diesem Browser löschen? Exportiere die Liste vorher, wenn du sie behalten möchtest.`)) {
      saved.decks = saved.decks.filter(item => item.id !== deck.id); persist(); renderLibrary(); toast('Liste gelöscht.');
    }
  }
  if (id === 'confirm-import' && importPreview) {
    const added = importPreview.map(deck => ({ ...deck, id: `local:${crypto.randomUUID()}`, shared: false }));
    saved.decks.push(...added); selectedDeckId = added[0].id; const stored = persist(); importPreview = null; renderLibrary();
    toast(stored ? `${added.length === 1 ? 'Deine Liste ist' : 'Deine Listen sind'} bereit. Viel Spaß beim Lernen!` : storageWarning);
  }
});

document.addEventListener('change', async event => {
  const { id, value, checked } = event.target;
  if (id === 'deck-select') { selectedDeckId = value; renderHome(); }
  if (id === 'direction-select') { settings.direction = value; renderSettings(); }
  if (id === 'difficult-only') { settings.difficult = checked; renderSettings(); }
  const keys = { 'answer-select': 'answer', 'duration-select': 'duration', 'target-select': 'target', 'length-select': 'length' };
  if (keys[id]) settings[keys[id]] = value;
  if (id === 'import-file') {
    const file = event.target.files[0]; if (!file) return;
    invalidatePreview();
    if (file.size > 2_000_000) { $('#import-error').textContent = 'Bitte verwende eine Datei bis 2 MB.'; return; }
    try { $('#import-text').value = await file.text(); $('#import-name').value = file.name.replace(/\.[^.]+$/, '').slice(0, 80); $('#import-error').textContent = ''; }
    catch { $('#import-error').textContent = 'Die Datei konnte nicht gelesen werden.'; }
  }
  if (event.target.closest('#import-form')) invalidatePreview();
});

function invalidatePreview() { importPreview = null; if ($('#import-preview')) $('#import-preview').innerHTML = ''; }
document.addEventListener('input', event => { if (event.target.closest('#import-form')) invalidatePreview(); });
document.addEventListener('submit', event => {
  if (event.target.id === 'answer-form') { event.preventDefault(); submitAnswer($('#written-answer').value); }
  if (event.target.id === 'import-form') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    try {
      $('#import-error').textContent = '';
      showImportPreview(importDecks(values.text, { ...values, delimiter: values.delimiter === 'tab' ? '\t' : values.delimiter }));
    } catch (error) { invalidatePreview(); $('#import-error').textContent = error.message; }
  }
});
document.addEventListener('keydown', event => {
  if (!session || session.feedback || $('dialog[open]') || event.target.matches('input, textarea, select') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[1-4]$/.test(event.key)) document.querySelectorAll('.answer-option')[Number(event.key) - 1]?.click();
});
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', event => { if (session) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && session) tick(); });

$('#main').innerHTML = '<div class="loading-state">Dein Wortabenteuer wird vorbereitet …</div>';
try {
  const response = await fetch('./data/decks.json');
  if (!response.ok) throw new Error('Keine Vokabellisten');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error();
  sharedDecks = data.map(deck => ({ ...validateDeck(deck), id: String(deck.id), shared: true }));
} catch { sharedError = true; }
route();
