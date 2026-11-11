import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { importDecks, validateDeck } from '../src/core.js';

export async function loadSharedDecks(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile() && ['.csv', '.json'].includes(extname(entry.name).toLowerCase()))
    .map(entry => entry.name).sort();
  if (!files.length) throw new Error('Mindestens eine CSV- oder JSON-Vokabelliste in data/decks wird benötigt.');

  const decks = [];
  for (const file of files) {
    try {
      const bytes = await readFile(resolve(directory, file));
      const csv = extname(file).toLowerCase() === '.csv';
      if (csv && bytes.length > 2_000_000) throw new Error('Die CSV-Datei darf höchstens 2 MB groß sein.');
      let content;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('Bitte die Datei als UTF-8 speichern (in Excel: CSV UTF-8).'); }
      const deck = csv
        ? importDecks(content, { name: file.slice(0, -extname(file).length), sourceLanguage: 'Englisch', targetLanguage: 'Deutsch' })[0]
        : validateDeck(JSON.parse(content));
      decks.push({ ...deck, id: `shared:${file}`, shared: true });
    } catch (error) {
      throw new Error(`Vokabelliste „${file}“: ${error.message}`, { cause: error });
    }
  }
  return decks;
}
