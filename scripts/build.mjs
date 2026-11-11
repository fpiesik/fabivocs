import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateDeck } from '../src/core.js';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
  const output = resolve(root, 'dist');
  await mkdir(resolve(output, 'data'), { recursive: true });
  const files = (await readdir(resolve(root, 'data/decks'))).filter(file => file.endsWith('.json')).sort();
  if (!files.length) throw new Error('Mindestens eine Vokabelliste in data/decks wird benötigt.');
  const decks = [];
  for (const file of files) {
    const deck = validateDeck(JSON.parse(await readFile(resolve(root, 'data/decks', file), 'utf8')));
    decks.push({ ...deck, id: `shared:${file}`, shared: true });
  }
  for (const name of ['index.html', 'styles.css', 'src', 'assets', 'examples']) {
    await cp(resolve(root, name), resolve(output, name), { recursive: true });
  }
  await writeFile(resolve(output, 'data/decks.json'), JSON.stringify(decks));
  await writeFile(resolve(output, '.nojekyll'), '');
  console.log(`Build fertig: ${decks.length} Listen, ${decks.reduce((sum, deck) => sum + deck.words.length, 0)} Wörter → dist/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
