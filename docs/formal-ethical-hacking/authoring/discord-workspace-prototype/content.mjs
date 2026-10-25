// Compiles only explicitly supplied draft-review text; no filesystem/URL access.
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const shape = (value, keys) => object(value) && Object.keys(value).sort().join(',') === keys;
export function createContentAdapter({ courseId, bundle } = {}) {
  if (typeof courseId !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(courseId) ||
      !shape(bundle, 'courseId,mode,pages,publishable,runtimeIntegration,schemaVersion') ||
      bundle.schemaVersion !== 1 || bundle.mode !== 'draft-review-only' || bundle.courseId !== courseId ||
      bundle.runtimeIntegration !== false || bundle.publishable !== false ||
      !Array.isArray(bundle.pages) || bundle.pages.length < 1 || bundle.pages.length > 20) {
    throw new TypeError('Reviewed draft text bundle required');
  }
  const seen = new Set();
  const pages = bundle.pages.map(page => {
    if (!shape(page, 'audience,id,kind,text,title') || page.audience !== 'learner' || page.kind !== 'reading' ||
        typeof page.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(page.id) || seen.has(page.id) ||
        typeof page.title !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ,:-]{0,79}$/.test(page.title) ||
        typeof page.text !== 'string' || !page.text.trim() || page.text.length > 1600) {
      throw new TypeError('Invalid reviewed reading page');
    }
    seen.add(page.id);
    return Object.freeze({ title: page.title, text: page.text });
  });
  return Object.freeze({ pageCount: pages.length, render(request) {
    if (!shape(request, 'courseId,page') || request.courseId !== courseId ||
        !Number.isInteger(request.page) || request.page < 0 || request.page >= pages.length) {
      throw new Error('Reading unavailable');
    }
    const page = pages[request.page];
    return `**${page.title}**\n\n${page.text}\n\nDraft review - ${request.page + 1}/${pages.length}`;
  } });
}
