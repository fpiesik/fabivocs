export const STORAGE_KEY = 'fabivocs-v1';
export const MAX_WORDS = 5000;

export function normalize(value) {
  return String(value).normalize('NFC').trim().toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}

export function alternatives(value) {
  return String(value).split('|').map(part => part.trim()).filter(Boolean);
}

export function isCorrect(answer, expected) {
  return alternatives(expected).some(value => normalize(value) === normalize(answer));
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function orient(word, direction) {
  return direction === 'reverse' ? { prompt: word.back, answer: word.front } : { prompt: word.front, answer: word.back };
}

export function makeChoices(word, words, direction, random = Math.random) {
  const expected = orient(word, direction).answer;
  const correct = alternatives(expected)[0];
  const seen = new Set(alternatives(expected).map(normalize));
  const distractors = [];
  for (const candidate of shuffle(words, random)) {
    const values = alternatives(orient(candidate, direction).answer);
    if (values.some(value => seen.has(normalize(value)))) continue;
    distractors.push(values[0]);
    values.forEach(value => seen.add(normalize(value)));
    if (distractors.length === 3) break;
  }
  return shuffle([correct, ...distractors], random);
}

// Quoted fields, escaped quotes, CRLF and line breaks inside fields are supported.
export function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === delimiter || char === '\n') {
      row.push(field.trim()); field = ''; closed = false;
      if (char === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (char === '"' && !field && !closed) quoted = true;
    else if (closed && char.trim()) throw new Error('Nach einem schließenden Anführungszeichen muss ein Trennzeichen folgen.');
    else if (!closed) field += char;
  }
  if (quoted) throw new Error('Ein Anführungszeichen ist nicht geschlossen.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function validateDeck(input, fallback = 'Meine Vokabeln') {
  if (!input || typeof input !== 'object' || !Array.isArray(input.words)) throw new Error('Jede Liste braucht ein Array „words“ mit „front“ und „back“.');
  if (!input.words.length || input.words.length > MAX_WORDS) throw new Error(`Eine Liste muss 1 bis ${MAX_WORDS} Wortpaare enthalten.`);
  const seen = new Set();
  const words = [];
  for (const [index, entry] of input.words.entries()) {
    if (!entry || typeof entry.front !== 'string' || typeof entry.back !== 'string' || !alternatives(entry.front).length || !alternatives(entry.back).length) {
      throw new Error(`Wortpaar ${index + 1}: Bitte beide Seiten ausfüllen.`);
    }
    const front = entry.front.trim(), back = entry.back.trim();
    if (front.length > 300 || back.length > 300) throw new Error(`Wortpaar ${index + 1}: Höchstens 300 Zeichen pro Seite.`);
    const key = JSON.stringify([normalize(front), normalize(back)]);
    if (!seen.has(key)) { words.push({ front, back }); seen.add(key); }
  }
  const label = (value, defaultValue) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : defaultValue;
  return { name: label(input.name, fallback), sourceLanguage: label(input.sourceLanguage, 'Englisch'), targetLanguage: label(input.targetLanguage, 'Deutsch'), words };
}

export function importDecks(text, { name = 'Meine Vokabeln', delimiter = 'auto', sourceLanguage = 'Englisch', targetLanguage = 'Deutsch' } = {}) {
  if (!text.trim()) throw new Error('Füge zuerst Vokabeln ein oder wähle eine Datei.');
  if (text.length > 2_000_000) throw new Error('Die Datei ist zu groß. Bitte verwende höchstens 2 MB.');
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (clean.startsWith('{') || clean.startsWith('[')) {
    let parsed;
    try { parsed = JSON.parse(clean); } catch { throw new Error('Die JSON-Datei ist ungültig. Prüfe Kommas und Anführungszeichen.'); }
    const decks = Array.isArray(parsed) ? [{ name, sourceLanguage, targetLanguage, words: parsed }] : parsed.decks ?? [parsed];
    if (!Array.isArray(decks) || !decks.length || decks.length > 50) throw new Error('Importiere 1 bis 50 Listen auf einmal.');
    return decks.map(deck => validateDeck(deck, name));
  }
  let rows;
  if (delimiter === 'auto') {
    const candidates = ['\t', ';', ','].map(sep => {
      try { return { rows: parseDelimited(clean, sep), sep }; } catch { return null; }
    }).filter(Boolean);
    const best = candidates.find(candidate => candidate.rows.every(row => row.length === 2));
    if (!best) throw new Error('Bitte genau zwei Spalten verwenden, getrennt durch Tabulator, Semikolon oder Komma. Texte mit Trennzeichen in Anführungszeichen setzen.');
    rows = best.rows;
  } else rows = parseDelimited(clean, delimiter);
  const headers = new Set(['front', 'back', 'source', 'target', 'wort', 'übersetzung', 'vorderseite', 'rückseite', 'englisch', 'deutsch', 'english', 'german', 'französisch', 'spanisch', 'latein']);
  if (rows[0]?.length === 2 && rows[0].every(value => headers.has(normalize(value)))) rows.shift();
  const words = rows.map((row, index) => {
    if (row.length !== 2) throw new Error(`Zeile ${index + 1}: Erwartet werden genau zwei Spalten.`);
    return { front: row[0], back: row[1] };
  });
  return [validateDeck({ name, sourceLanguage, targetLanguage, words })];
}

export function wordKey(deckId, word, direction) {
  return JSON.stringify([deckId, word.front, word.back, direction]);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function streak(history, now = new Date()) {
  const dates = new Set(history.map(item => item.day));
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!dates.has(localDate(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (dates.has(localDate(day))) { count++; day.setDate(day.getDate() - 1); }
  return count;
}

export function remainingSeconds(start, duration, now) {
  return Math.max(0, Math.ceil((start + duration * 1000 - now) / 1000));
}

export function createQueue(words, count) {
  if (!words.length || count <= 0) return [];
  const queue = [];
  while (queue.length < count) queue.push(...shuffle(words));
  return queue.slice(0, count);
}

// Compact identity for comparing records without storing a full deck per round.
export function vocabularySignature(words) {
  const text = JSON.stringify(words.map(word => [word.front, word.back]).sort());
  let first = 2166136261, second = 5381;
  for (let i = 0; i < text.length; i++) {
    first = Math.imul(first ^ text.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ text.charCodeAt(i);
  }
  return `${text.length}:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}`;
}

export function matchingWords(words, direction, limit = 6) {
  const prompts = new Set(), answers = new Set(), selected = [];
  for (const word of shuffle(words)) {
    const entry = orient(word, direction);
    const prompt = normalize(alternatives(entry.prompt)[0]);
    const answer = normalize(alternatives(entry.answer)[0]);
    if (prompts.has(prompt) || answers.has(answer)) continue;
    prompts.add(prompt); answers.add(answer); selected.push(word);
    if (selected.length === limit) break;
  }
  return selected;
}
