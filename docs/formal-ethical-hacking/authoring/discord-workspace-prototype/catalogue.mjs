// Metadata browsing only: no lesson file loading, grants or completion state.
const shape = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === keys;
const validId = v => typeof v === 'string' && /^EH-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(v) && v.length <= 45;
export function createCatalogueRenderer({ courseId, catalogue, labels } = {}) {
  if (typeof courseId !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(courseId) ||
      !shape(catalogue, 'labDelivery,lessons,publishable,runtimeIntegration,schemaVersion,status') ||
      catalogue.schemaVersion !== 1 || catalogue.status !== 'draft-not-published' || catalogue.labDelivery !== 'student-built' ||
      catalogue.runtimeIntegration !== false || catalogue.publishable !== false || !Array.isArray(catalogue.lessons) ||
      catalogue.lessons.length < 1 || catalogue.lessons.length > 60 || !labels || typeof labels !== 'object' || Array.isArray(labels)) {
    throw new TypeError('Explicit reviewed draft catalogue required');
  }
  const ids = new Set(catalogue.lessons.map(row => row?.id));
  if (ids.size !== catalogue.lessons.length || Object.keys(labels).length !== ids.size || Object.keys(labels).some(id => !ids.has(id))) throw new TypeError('Exact unique lesson labels required');
  const lessons = catalogue.lessons.map(row => {
    const title = `${row.id}: ${labels[row.id]}`;
    if (!shape(row, 'id,requires') || !validId(row.id) || typeof labels[row.id] !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9 ,:-]{0,79}$/.test(title) || !labels[row.id].trim() ||
        !Array.isArray(row.requires) || row.requires.length > 10 || new Set(row.requires).size !== row.requires.length ||
        row.requires.some(id => !ids.has(id) || id === row.id)) throw new TypeError('Invalid lesson metadata');
    return Object.freeze({ id: row.id, title, requires: Object.freeze([...row.requires]) });
  });
  const byId = new Map(lessons.map(row => [row.id, row])), active = new Set(), done = new Set();
  function visit(id) {
    if (active.has(id)) throw new TypeError('Cyclic prerequisites');
    if (done.has(id)) return;
    active.add(id); for (const parent of byId.get(id).requires) visit(parent);
    active.delete(id); done.add(id);
  }
  for (const id of ids) visit(id);
  const groups = Math.ceil(lessons.length / 3), total = groups + lessons.length;
  const art = row => row.id.startsWith('EH-LAB') || row.id.startsWith('EH-NET') ? 'prepare' : row.id.startsWith('EH-WEB') ? 'scope' : 'evidence';
  return Object.freeze({ pageCount: total, lessonCount: lessons.length, groupCount: groups, render(request) {
    if (!shape(request, 'courseId,page') || request.courseId !== courseId || !Number.isInteger(request.page) || request.page < 0 || request.page >= total) throw new Error('Catalogue unavailable');
    const page = request.page;
    if (page < groups) return { kind: 'review-cards-v1', heading: `Draft curriculum - cards ${page + 1}/${groups}`,
      routes: { prev: page ? page - 1 : null, home: 0, next: page + 1 < groups ? page + 1 : null },
      cards: lessons.slice(page * 3, page * 3 + 3).map((row, i) => ({ title: row.title,
        description: `Draft metadata preview. ${row.requires.length} documented prerequisites. Open for source location and limits; not lesson completion or execution permission.`,
        art: art(row), target: groups + page * 3 + i })) };
    const index = page - groups, row = lessons[index];
    return { kind: 'review-cards-v1', heading: 'Draft lesson metadata - not lesson content',
      routes: { prev: index ? page - 1 : null, home: Math.floor(index / 3), next: index + 1 < lessons.length ? page + 1 : null },
      cards: [{ title: row.title, art: art(row), target: null,
        description: `Status: draft-not-published.\nSource: lessons/${row.id}.md\nDocumented prerequisites: ${row.requires.join(', ') || 'none in this catalogue'}.\n\nMetadata only: the lesson body is not loaded here. The actual lesson can add prerequisites and scope limits. This graph is planning metadata, not an access/progression check. No completion, lab permission, badge or award is granted.` }] };
  } });
}
