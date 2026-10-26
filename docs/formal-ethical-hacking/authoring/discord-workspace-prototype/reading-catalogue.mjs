// Reading views over pinned snapshots; no runtime source-file/URL loader.
import { createCatalogueRenderer } from './catalogue.mjs';
import { compileLessonReadings } from './source-readings.mjs';
export function createReadingCatalogueRenderer({ courseId, catalogue, labels, manifest, sources } = {}) {
  const metadata = createCatalogueRenderer({ courseId, catalogue, labels });
  const readings = compileLessonReadings({ catalogue, manifest, sources });
  const lessons = catalogue.lessons.map(row => Object.freeze({ id: row.id }));
  const cursors = new Map(), starts = [];
  let total = metadata.groupCount, readingPages = 0;
  lessons.forEach((row, lesson) => {
    starts.push(total);
    const chunks = readings[row.id];
    if (chunks) {
      chunks.forEach((chunk, index) => cursors.set(total++, Object.freeze({ lesson, index, chunk, count: chunks.length })));
      readingPages += chunks.length;
    } else cursors.set(total++, Object.freeze({ lesson, index: 0, chunk: null, count: 1 }));
  });
  if (total > 100) throw new Error('Reading catalogue exceeds bounded navigation');
  return Object.freeze({ pageCount: total, readingLessonCount: Object.keys(readings).length, readingPageCount: readingPages, render(request) {
    if (!request || Object.keys(request).sort().join(',') !== 'courseId,page' || request.courseId !== courseId ||
        !Number.isInteger(request.page) || request.page < 0 || request.page >= total) throw new Error('Reading unavailable');
    const page = request.page;
    if (page < metadata.groupCount) {
      const view = metadata.render(request);
      view.cards = view.cards.map(card => {
        const lesson = card.target - metadata.groupCount, row = lessons[lesson];
        return { ...card, target: starts[lesson], description: readings[row.id]
          ? `Draft source reading available: ${readings[row.id].length} pages. Follow the actual lesson's scope and prerequisites; reading grants no practical permission.`
          : 'Metadata preview only: this lesson body is not included in the current reviewed reading package.' };
      });
      return view;
    }
    const cursor = cursors.get(page), row = lessons[cursor.lesson];
    const routes = { prev: cursor.index > 0 ? page - 1 : null, home: Math.floor(cursor.lesson / 3),
      next: cursor.index + 1 < cursor.count ? page + 1 : null };
    if (!cursor.chunk) return { ...metadata.render({ courseId, page: metadata.groupCount + cursor.lesson }), routes };
    return { kind: 'review-cards-v1', heading: `Draft source reading - ${row.id} ${cursor.index + 1}/${cursor.count}`,
      routes, cards: [{ title: `${row.id}: Reading ${cursor.index + 1} of ${cursor.count}`, art: 'prepare', target: null,
        description: cursor.chunk.display }] };
  } });
}
