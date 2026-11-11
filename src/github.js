import { validateDeck } from './core.js';

// Public destination only. Authentication happens on github.com.
export const GITHUB_REPOSITORY = 'fpiesik/fabivocs';
export const GITHUB_BRANCH = 'main';
export const DECK_DIRECTORY = 'data/decks';

const repositoryUrl = `https://github.com/${GITHUB_REPOSITORY}`;
export const githubLinks = Object.freeze({
  upload: `${repositoryUrl}/upload/${encodeURIComponent(GITHUB_BRANCH)}/${DECK_DIRECTORY}`,
  actions: `${repositoryUrl}/actions/workflows/pages.yml`,
});

export async function prepareRepositoryUpload(input) {
  // Repository files contain one validated deck, unlike multi-deck backup exports.
  // This also strips device-specific IDs, learning progress and unknown fields.
  const deck = validateDeck(input);
  const content = `${JSON.stringify(deck, null, 2)}\n`;
  const canonical = JSON.stringify({ ...deck, words: [...deck.words].sort((a, b) => {
    const first = JSON.stringify([a.front, a.back]);
    const second = JSON.stringify([b.front, b.back]);
    return first < second ? -1 : first > second ? 1 : 0;
  }) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const suffix = Array.from(new Uint8Array(digest)).slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('');
  const slug = deck.name.toLowerCase().replace(/ß/g, 'ss').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60).replace(/^-+|-+$/g, '') || 'vokabeln';
  return { content, filename: `${slug}-${suffix}.json` };
}
