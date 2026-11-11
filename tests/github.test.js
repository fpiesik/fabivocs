import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDeck } from '../src/core.js';
import { githubLinks, prepareRepositoryUpload } from '../src/github.js';

const deck = {
  name: 'Unit 1 – Grüße & Schule', sourceLanguage: 'Englisch', targetLanguage: 'Deutsch',
  words: [{ front: 'hello', back: 'hallo' }, { front: 'teacher', back: 'Lehrer | Lehrerin' }],
};

test('GitHub-Datei ist direkt als gemeinsame Liste verwendbar und enthält keine lokalen Daten', async () => {
  const upload = await prepareRepositoryUpload({ ...deck, id: 'local:example', shared: false, progress: { correct: 42 }, token: 'must-not-export' });
  const parsed = JSON.parse(upload.content);
  assert.deepEqual(parsed, deck);
  assert.deepEqual(validateDeck(parsed), deck);
  assert.equal('decks' in parsed, false);
  assert.match(upload.filename, /^unit-1-grusse-schule-[a-f0-9]{16}\.json$/);
});

test('erneutes Herunterladen erzeugt denselben Dateinamen, auch bei anderer Wortreihenfolge', async () => {
  const first = await prepareRepositoryUpload(deck);
  const second = await prepareRepositoryUpload({ ...deck, id: 'local:other-device', words: [...deck.words].reverse() });
  assert.equal(first.filename, second.filename);
  const different = await prepareRepositoryUpload({ ...deck, words: [{ front: 'dog', back: 'Hund' }] });
  assert.notEqual(first.filename, different.filename);
  const otherLanguage = await prepareRepositoryUpload({ ...deck, sourceLanguage: 'Französisch' });
  assert.notEqual(first.filename, otherLanguage.filename);
});

test('Dateinamen können den Vokabelordner nicht verlassen und funktionieren bei Unicode-Namen', async () => {
  for (const name of ['../../evil.json', '<script>alert(1)</script>', '日本語', 'a'.repeat(200)]) {
    const { filename } = await prepareRepositoryUpload({ ...deck, name });
    assert.match(filename, /^[a-z0-9-]+-[a-f0-9]{16}\.json$/);
    assert.ok(filename.length <= 82);
  }
});

test('auch große Listen werden vollständig als Datei übergeben, ohne Inhalte in einer URL', async () => {
  const large = { ...deck, words: Array.from({ length: 5000 }, (_, i) => ({ front: `word ${i}`, back: `Wort ${i}` })) };
  const { content } = await prepareRepositoryUpload(large);
  assert.equal(JSON.parse(content).words.length, 5000);
  const upload = new URL(githubLinks.upload);
  assert.equal(upload.origin, 'https://github.com');
  assert.equal(upload.pathname, '/fpiesik/fabivocs/upload/main/data/decks');
  assert.equal(upload.search, '');
  assert.equal(new URL(githubLinks.actions).pathname, '/fpiesik/fabivocs/actions/workflows/pages.yml');
});

test('unvollständige Listen werden nicht für GitHub vorbereitet', async () => {
  await assert.rejects(prepareRepositoryUpload({ ...deck, words: [{ front: 'hello', back: '' }] }));
});
