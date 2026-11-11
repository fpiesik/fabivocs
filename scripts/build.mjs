import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadSharedDecks } from './decks.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
  const output = resolve(root, 'dist');
  const decks = await loadSharedDecks(resolve(root, 'data/decks'));
  await rm(output, { recursive: true, force: true });
  await mkdir(resolve(output, 'data'), { recursive: true });
  for (const name of ['index.html', 'styles.css', 'src', 'assets', 'examples']) {
    await cp(resolve(root, name), resolve(output, name), { recursive: true });
  }
  await writeFile(resolve(output, 'data/decks.json'), JSON.stringify(decks));
  await writeFile(resolve(output, '.nojekyll'), '');
  console.log(`Build fertig: ${decks.length} Listen, ${decks.reduce((sum, deck) => sum + deck.words.length, 0)} Wörter → dist/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
