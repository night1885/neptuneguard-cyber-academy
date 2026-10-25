// Native embed cards only. No external URL, file-path or arbitrary payload input.
import { createHash } from 'node:crypto';
import { createCardArt } from './card-art.mjs';
import { createContentAdapter } from './content.mjs';
const shape = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === keys;
const artKeys = ['scope', 'prepare', 'evidence'];

export function createCardRenderer({ courseId, bundle } = {}) {
  createContentAdapter({ courseId, bundle });
  if (bundle.pages.length > 3) throw new TypeError('This reviewed card slice supports at most three readings');
  const pages = bundle.pages.map((page, index) => Object.freeze({ title: page.title, text: page.text, art: artKeys[index] }));
  return Object.freeze({ pageCount: pages.length + 1, render(request) {
    if (!shape(request, 'courseId,page') || request.courseId !== courseId ||
        !Number.isInteger(request.page) || request.page < 0 || request.page > pages.length) throw new Error('Card unavailable');
    if (request.page === 0) return { kind: 'review-cards-v1', heading: 'Draft course workspace - choose a card',
      cards: pages.map((page, index) => ({ title: page.title,
        description: page.text.length > 180 ? page.text.slice(0, 177) + '...' : page.text,
        art: page.art, target: index + 1 })) };
    const page = pages[request.page - 1];
    return { kind: 'review-cards-v1', heading: 'Draft reading workspace',
      cards: [{ title: page.title, description: page.text, art: page.art, target: null }] };
  } });
}

export function buildCardFrame(view, { pages } = {}) {
  if (!(shape(view, 'cards,heading,kind') || shape(view, 'cards,heading,kind,routes')) || view.kind !== 'review-cards-v1' ||
      typeof view.heading !== 'string' || !view.heading.trim() || view.heading.length > 120 ||
      !Number.isInteger(pages) || pages < 2 || pages > 100 || !Array.isArray(view.cards) ||
      view.cards.length < 1 || view.cards.length > 3) throw new Error('Invalid card frame');
  let routes;
  if (Object.hasOwn(view, 'routes')) {
    if (!shape(view.routes, 'home,next,prev') || !Number.isInteger(view.routes.home) ||
        Object.values(view.routes).some(page => page !== null && (!Number.isInteger(page) || page < 0 || page >= pages))) throw new Error('Invalid card routes');
    routes = Object.freeze({ prev: view.routes.prev, home: view.routes.home, next: view.routes.next });
  }
  const embeds = [], choices = [], files = new Map(), targets = new Set();
  let total = 0;
  for (const card of view.cards) {
    if (!shape(card, 'art,description,target,title') ||
        typeof card.title !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ,:-]{0,79}$/.test(card.title) ||
        typeof card.description !== 'string' || !card.description.trim() || card.description.length > 1600 ||
        !artKeys.includes(card.art) || card.target !== null &&
        (!Number.isInteger(card.target) || card.target < 1 || card.target >= pages || targets.has(card.target))) {
      throw new Error('Invalid card');
    }
    const asset = createCardArt(card.art), bytes = Buffer.from(asset.base64, 'base64');
    if (bytes.length < 32 || bytes.length > 4096 || bytes.toString('base64') !== asset.base64 ||
        bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Invalid illustration');
    const name = `card-${card.art}.png`, footer = 'Draft review - reading card';
    files.set(name, { attachment: bytes, name, description: `Decorative ${card.art} illustration; the card title supplies meaning.` });
    embeds.push({ title: card.title, description: card.description, color: asset.color,
      thumbnail: { url: `attachment://${name}` }, footer: { text: footer } });
    total += card.title.length + card.description.length + footer.length;
    if (card.target !== null) {
      targets.add(card.target); choices.push({ page: card.target, label: ('Open ' + card.title).slice(0, 70) });
    }
  }
  if (total > 5500) throw new Error('Card text exceeds reviewed bounds');
  return { payload: { content: view.heading, embeds, attachments: [], files: [...files.values()] }, choices, routes };
}
