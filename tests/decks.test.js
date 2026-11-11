import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSharedDecks } from '../scripts/decks.mjs';

async function fixture(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'fabivocs-decks-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [filename, content] of Object.entries(files)) await writeFile(join(directory, filename), content);
  return directory;
}

test('CSV-Dateien werden automatisch neben bestehenden JSON-Listen erkannt', async t => {
  const existing = { name: 'Vorhandene Liste', sourceLanguage: 'Englisch', targetLanguage: 'Deutsch', words: [{ front: 'book', back: 'Buch' }] };
  const directory = await fixture(t, {
    'Unit 1.csv': '\uFEFFEnglisch;Deutsch\r\napple;Apfel\r\nfriend;Freund | Freundin\r\n',
    'existing.json': JSON.stringify(existing),
    'README.md': 'Anleitung, keine Vokabelliste',
  });
  await mkdir(join(directory, 'ignored.csv'));
  const decks = await loadSharedDecks(directory);
  assert.equal(decks.length, 2);
  assert.deepEqual(decks[0], {
    name: 'Unit 1', sourceLanguage: 'Englisch', targetLanguage: 'Deutsch',
    words: [{ front: 'apple', back: 'Apfel' }, { front: 'friend', back: 'Freund | Freundin' }],
    id: 'shared:Unit 1.csv', shared: true,
  });
  assert.deepEqual(decks[1], { ...existing, id: 'shared:existing.json', shared: true });
});

test('CSV unterstützt Komma, Tabulator, Großschreibung der Endung und optionale Kopfzeilen', async t => {
  const directory = await fixture(t, {
    'Komma.CSV': 'English,German\n"hello, friend","hallo, Freund"',
    'Tab.csv': 'dog\tHund\ncat\tKatze',
    'Semikolon.csv': 'blue;blau\n\nblue;blau',
  });
  const decks = await loadSharedDecks(directory);
  assert.deepEqual(decks.map(deck => deck.name), ['Komma', 'Semikolon', 'Tab']);
  assert.equal(decks[0].words[0].front, 'hello, friend');
  assert.equal(decks[1].words.length, 1);
  assert.equal(decks[2].words.length, 2);
});

test('geänderte und neue CSV-Dateien werden beim nächsten Laden übernommen', async t => {
  const directory = await fixture(t, { 'Unit.csv': 'apple;Apfel' });
  const [before] = await loadSharedDecks(directory);
  await writeFile(join(directory, 'Unit.csv'), 'apple;Apfel\nbook;Buch');
  await writeFile(join(directory, 'Neu.csv'), 'cat;Katze');
  const after = await loadSharedDecks(directory);
  assert.equal(after.length, 2);
  assert.equal(after.find(deck => deck.id === before.id).words.length, 2);
  await rm(join(directory, 'Neu.csv'));
  assert.equal((await loadSharedDecks(directory)).length, 1);
});

test('ungültige CSV-Dateien brechen den Build mit Dateinamen ab', async t => {
  for (const [index, content] of ['', 'Englisch;Deutsch', 'apple;', 'apple;Apfel;extra', '"apple;Apfel'].entries()) {
    const filename = `Fehler-${index}.csv`;
    const directory = await fixture(t, { [filename]: content });
    await assert.rejects(loadSharedDecks(directory), error => error.message.includes(filename));
  }
});

test('falsche Zeichenkodierung, zu große CSVs und fehlende Listen werden verständlich gemeldet', async t => {
  const invalidEncoding = await fixture(t, { 'Umlaute.csv': Buffer.from([0x61, 0x3b, 0xe4]) });
  await assert.rejects(loadSharedDecks(invalidEncoding), /Umlaute\.csv.*UTF-8/);
  const oversized = await fixture(t, { 'Gross.csv': 'a'.repeat(2_000_001) });
  await assert.rejects(loadSharedDecks(oversized), /Gross\.csv.*2 MB/);
  const empty = await fixture(t, { 'README.md': 'Keine Listen' });
  await assert.rejects(loadSharedDecks(empty), /Mindestens eine CSV- oder JSON/);
});
