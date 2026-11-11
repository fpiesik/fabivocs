import test from 'node:test';
import assert from 'node:assert/strict';
import { alternatives, createQueue, importDecks, isCorrect, localDate, makeChoices, matchingWords, normalize, orient, parseDelimited, practiceDirections, remainingSeconds, shuffle, streak, validateDeck, vocabularySignature, wordKey } from '../src/core.js';

test('freie Eingabe toleriert Großschreibung, Unicode und Leerraum, aber keine Rechtschreibfehler', () => {
  assert.equal(isCorrect('  GUTEN   Morgen ', 'guten Morgen'), true);
  assert.equal(isCorrect('Freundin', 'Freund | Freundin'), true);
  assert.equal(isCorrect('Ba\u0308r', 'Bär'), true);
  assert.equal(isCorrect('don’t', "don't"), true);
  assert.equal(isCorrect('Bar', 'Bär'), false);
  assert.equal(isCorrect('aple', 'apple'), false);
  assert.equal(isCorrect('', ' | Apfel'), false);
  assert.equal(normalize('  Hello '), 'hello');
  assert.deepEqual(alternatives('Freund | Freundin | '), ['Freund', 'Freundin']);
});

test('CSV unterstützt BOM, CRLF, Anführungszeichen, Kommas und mehrzeilige Felder', () => {
  const text = '\uFEFFEnglisch;Deutsch\r\n"hello, friend";"hallo, Freund"\r\n"say ""hello""";"sag\nhallo"';
  const [deck] = importDecks(text);
  assert.deepEqual(deck.words, [{ front: 'hello, friend', back: 'hallo, Freund' }, { front: 'say "hello"', back: 'sag\nhallo' }]);
});

test('CSV, Excel-Tabulatoren und Kommaformate werden automatisch erkannt', () => {
  for (const sep of [';', '\t', ',']) {
    const [deck] = importDecks(`front${sep}back\napple${sep}Apfel\nbook${sep}Buch`, { name: 'Unit 1' });
    assert.equal(deck.name, 'Unit 1'); assert.equal(deck.words.length, 2);
    assert.deepEqual(deck.words[0], { front: 'apple', back: 'Apfel' });
  }
});

test('Import ohne Kopfzeile, Leerzeilen und doppelte Wortpaare', () => {
  const [deck] = importDecks('\napple;Apfel\n\nAPPLE;apfel\nbook;Buch\n');
  assert.equal(deck.words.length, 2);
  assert.equal(deck.words[0].front, 'apple');
});

test('ungültige oder unvollständige Daten werden vollständig abgelehnt', () => {
  for (const text of ['', 'apple;', 'apple;Apfel;mehr', 'apple;Apfel\nbook', '"apple;Apfel', '{}', '{broken', '[]', 'front;back']) {
    assert.throws(() => importDecks(text), Error, text);
  }
  assert.throws(() => parseDelimited('"apple"x;Apfel', ';'));
  assert.throws(() => importDecks('a'.repeat(2_000_001)), /groß/);
  assert.throws(() => validateDeck({ words: [{ front: 'a'.repeat(301), back: 'b' }] }), /300/);
  assert.throws(() => validateDeck({ words: Array(5001).fill({ front: 'a', back: 'b' }) }), /5000/);
  assert.throws(() => validateDeck({ words: [{ front: '|', back: 'b' }] }));
});

test('JSON-Listen und exportierte Listen lassen sich verlustfrei importieren', () => {
  const deck = { name: 'Unit 2', sourceLanguage: 'Englisch', targetLanguage: 'Deutsch', words: [{ front: 'friend', back: 'Freund | Freundin' }] };
  assert.deepEqual(importDecks(JSON.stringify(deck)), [deck]);
  assert.deepEqual(importDecks(JSON.stringify({ version: 1, decks: [deck, { ...deck, name: 'Unit 3' }] })), [deck, { ...deck, name: 'Unit 3' }]);
  assert.deepEqual(importDecks(JSON.stringify(deck.words))[0].words, deck.words);
});

test('Lernrichtung und Multiple Choice berücksichtigen Alternativen und gleiche Antworten', () => {
  const words = [{ front: 'friend', back: 'Freund | Freundin' }, { front: 'pal', back: 'Freund' }, { front: 'dog', back: 'Hund' }, { front: 'hound', back: 'Hund' }, { front: 'book', back: 'Buch' }];
  const choices = makeChoices(words[0], words, 'forward');
  assert.equal(choices.filter(choice => isCorrect(choice, words[0].back)).length, 1);
  assert.equal(new Set(choices).size, choices.length);
  assert.equal(choices.length, 3);
  assert.deepEqual(orient(words[0], 'reverse'), { prompt: 'Freund | Freundin', answer: 'friend' });
  assert.ok(makeChoices(words[0], words, 'reverse').includes('friend'));
  assert.equal(wordKey('a', words[0], 'forward') === wordKey('a', words[0], 'reverse'), false);
});

test('gemischte Warteschlangen erhalten alle Wörter, ohne Eingaben zu verändern', () => {
  const words = ['a', 'b', 'c'];
  const mixed = shuffle(words, () => 0);
  assert.deepEqual(words, ['a', 'b', 'c']);
  assert.deepEqual([...mixed].sort(), words);
  const queue = createQueue(words, 8);
  assert.deepEqual(createQueue([], 10), []);
  assert.equal(queue.length, 8);
  assert.deepEqual(queue.slice(0, 3).sort(), words);
  assert.deepEqual(queue.slice(3, 6).sort(), words);
});

test('Gemischt bietet beide Richtungen und filtert schwierige Wörter je Richtung', () => {
  const word = { front: 'dog', back: 'Hund' };
  assert.deepEqual(practiceDirections(word, 'forward'), ['forward']);
  assert.deepEqual(practiceDirections(word, 'reverse'), ['reverse']);
  assert.deepEqual(practiceDirections(word, 'mixed'), ['forward', 'reverse']);
  const progress = {
    [wordKey('deck', word, 'forward')]: { wrong: 1, streak: 3 },
    [wordKey('deck', word, 'reverse')]: { wrong: 2, streak: 0 },
  };
  const options = { deckId: 'deck', progress, difficult: true };
  assert.deepEqual(practiceDirections(word, 'mixed', options), ['reverse']);
  assert.deepEqual(practiceDirections(word, 'forward', options), []);
  progress[wordKey('deck', word, 'forward')].streak = 0;
  assert.deepEqual(practiceDirections(word, 'mixed', options), ['forward', 'reverse']);
  assert.deepEqual(practiceDirections(word, 'mixed', { difficult: true }), []);
});

test('gemischte Wortpaare behalten ihre Richtung und vermeiden doppelte sichtbare Antworten', () => {
  const words = [{ front: 'cat', back: 'Katze' }, { front: 'Hund', back: 'dog' }, { front: 'hound', back: 'Hund' }];
  const directions = new Map([[words[0], 'forward'], [words[1], 'reverse'], [words[2], 'forward']]);
  const selected = matchingWords(words, word => directions.get(word));
  assert.equal(selected.length, 2);
  assert.equal(new Set(selected.map(word => orient(word, directions.get(word)).answer)).size, 2);
  assert.deepEqual(orient(words[1], directions.get(words[1])), { prompt: 'dog', answer: 'Hund' });
});

test('Rekordvergleich erkennt geänderte Wortlisten unabhängig von der Reihenfolge', () => {
  const words = [{ front: 'dog', back: 'Hund' }, { front: 'cat', back: 'Katze' }];
  assert.equal(vocabularySignature(words), vocabularySignature([...words].reverse()));
  assert.notEqual(vocabularySignature(words), vocabularySignature([{ front: 'dog', back: 'Hund | Rüde' }, words[1]]));
  assert.ok(vocabularySignature(Array(5000).fill(words[0])).length < 40);
});

test('Zuordnungsspiel vermeidet identische sichtbare Wörter auf beiden Seiten', () => {
  const words = [{ front: 'dog', back: 'Hund' }, { front: 'hound', back: 'Hund' }, { front: 'dog', back: 'Rüde' }, { front: 'cat', back: 'Katze' }];
  for (const direction of ['forward', 'reverse']) {
    const selected = matchingWords(words, direction);
    const prompts = selected.map(word => orient(word, direction).prompt);
    const answers = selected.map(word => orient(word, direction).answer);
    assert.equal(new Set(prompts).size, selected.length);
    assert.equal(new Set(answers).size, selected.length);
  }
});

test('Lernserie zählt lokale Kalendertage und kann gestern enden', () => {
  const now = new Date(2026, 10, 11, 10);
  assert.equal(localDate(now), '2026-11-11');
  assert.equal(streak([{ day: '2026-11-11' }, { day: '2026-11-11' }, { day: '2026-11-10' }, { day: '2026-11-09' }], now), 3);
  assert.equal(streak([{ day: '2026-11-10' }, { day: '2026-11-09' }], now), 2);
  assert.equal(streak([{ day: '2026-11-09' }], now), 0);
  assert.equal(streak([{ day: '2026-11-01' }, { day: '2026-10-31' }], new Date(2026, 10, 1)), 2);
});

test('Speedrun-Zeit folgt der verstrichenen Zeit, nicht der Anzahl Timer-Aufrufe', () => {
  assert.equal(remainingSeconds(1000, 60, 1000), 60);
  assert.equal(remainingSeconds(1000, 60, 1590), 60);
  assert.equal(remainingSeconds(1000, 60, 2150), 59);
  assert.equal(remainingSeconds(1000, 60, 60_999), 1);
  assert.equal(remainingSeconds(1000, 60, 61_000), 0);
  assert.equal(remainingSeconds(1000, 60, 120_000), 0);
});
