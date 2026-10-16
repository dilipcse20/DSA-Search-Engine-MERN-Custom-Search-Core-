import { tokenize, normalize } from "./preprocess.js";
import { InvertedIndex } from "./invertedIndex.js";
import { Trie } from "./trie.js";
import { closest } from "./editDistance.js";
export const WEIGHTS = {
  title: 5,
  tags: 3,
  topics: 3,
  algorithms: 3,
  dataStructures: 3,
  description: 1,
  exactTitle: 20,
  phrase: 6,
  coverage: 2,
  k1: 1.2,
  b: 0.75,
};
const FIELDS = [
  "title",
  "tags",
  "topics",
  "algorithms",
  "dataStructures",
  "description",
];
const txt = (p, f) => (Array.isArray(p[f]) ? p[f].join(" ") : p[f] || "");
const DIFF = { Easy: 1, Medium: 2, Hard: 3 };
const fieldTokens = (p) =>
  Object.fromEntries(FIELDS.map((f) => [f, tokenize(txt(p, f))]));
export class SearchEngine {
  constructor(problems = []) {
    this.state = null;
    this.version = 0;
    this.rebuild(problems);
  }
  // Build fully, then publish with a single assignment so readers never see a partial index.
  rebuild(problems) {
    const index = new InvertedIndex(),
      trie = new Trie(),
      byId = new Map();
    for (const p of problems) {
      byId.set(p.id, p);
      index.add(p.id, fieldTokens(p));
      [
        p.title,
        ...(p.topics || []),
        ...(p.algorithms || []),
        ...(p.dataStructures || []),
        ...(p.tags || []),
      ].forEach((s) => trie.insert(s));
    }
    this.state = {
      index,
      trie,
      byId,
      builtAt: new Date().toISOString(),
      version: ++this.version,
    };
    return this.status();
  }
  status() {
    const s = this.state;
    return {
      version: s.version,
      documents: s.index.size,
      terms: s.index.postings.size,
      builtAt: s.builtAt,
    };
  }
  upsert(p) {
    const s = this.state;
    s.byId.set(p.id, p);
    s.index.update(p.id, fieldTokens(p));
    s.trie.insert(p.title);
    s.version = ++this.version;
  }
  remove(id) {
    this.state.byId.delete(id);
    this.state.index.remove(id);
    this.state.version = ++this.version;
  }
  suggest(q, limit = 8) {
    return this.state.trie.suggest(q, Math.min(limit, 20));
  }
  score(id, terms, norm) {
    const { index, byId } = this.state,
      N = index.size,
      W = WEIGHTS;
    let s = 0,
      hit = 0;
    const uniq = new Set(terms);
    for (const t of uniq) {
      const post = index.lookup(t).get(id);
      if (!post) continue;
      hit++;
      let tf = 0;
      for (const [f, c] of Object.entries(post)) tf += (W[f] || 1) * c;
      const df = index.lookup(t).size,
        idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s +=
        (idf * (tf * (W.k1 + 1))) /
        (tf + W.k1 * (1 - W.b + (W.b * index.docLen.get(id)) / index.avgLen));
    }
    s += W.coverage * (hit / uniq.size);
    const p = byId.get(id),
      title = normalize(p.title);
    if (title === norm) s += W.exactTitle;
    else if (terms.length > 1 && title.includes(norm)) s += W.phrase;
    else if (
      terms.length > 1 &&
      normalize(txt(p, "description")).includes(norm)
    )
      s += W.phrase / 3;
    return s;
  }
  search(
    q,
    { difficulty, topics, tags, sort = "relevance", page = 1, limit = 20 } = {},
  ) {
    const terms = tokenize(q),
      { index, byId } = this.state;
    if (!terms.length)
      return {
        items: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 },
        query: { original: q, normalized: "", suggestion: null },
      };
    const norm = terms.join(" ");
    let cand = index.candidates(terms, "and"),
      mode = "and";
    if (!cand.size) {
      cand = index.candidates(
        terms.filter((t) => index.has(t)),
        "or",
      );
      mode = "or";
    }
    const has = (arr, want) =>
      !want?.length ||
      want.every((w) => (arr || []).some((x) => normalize(x) === normalize(w)));
    const items = [...cand]
      .map((id) => byId.get(id))
      .filter(
        (p) =>
          (!difficulty ||
            p.difficulty.toLowerCase() === String(difficulty).toLowerCase()) &&
          has(p.topics, topics) &&
          has(p.tags, tags),
      )
      .map((p) => ({ ...p, score: +this.score(p.id, terms, norm).toFixed(4) }));
    const cmp = {
      relevance: (a, b) => b.score - a.score || a.title.localeCompare(b.title),
      title: (a, b) => a.title.localeCompare(b.title),
      difficulty: (a, b) =>
        DIFF[a.difficulty] - DIFF[b.difficulty] || b.score - a.score,
    }[sort];
    if (cmp) items.sort(cmp);
    const fixed = terms.map((t) =>
      index.has(t) ? t : closest(t, index.vocabulary()) || t,
    );
    const suggestion = fixed.join(" ") !== norm ? fixed.join(" ") : null;
    const totalItems = items.length;
    return {
      items: items.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      query: { original: q, normalized: norm, suggestion, matchMode: mode },
    };
  }
  related(id, limit = 5) {
    const p = this.state.byId.get(id);
    if (!p) return null;
    const key = (o) =>
      new Set(
        [...(o.topics || []), ...(o.tags || []), ...(o.algorithms || [])].map(
          normalize,
        ),
      ),
      set = key(p);
    return [...this.state.byId.values()]
      .filter((o) => o.id !== id)
      .map((o) => {
        const s2 = key(o),
          i = [...set].filter((x) => s2.has(x)).length;
        return { ...o, sim: i / (set.size + s2.size - i || 1) };
      })
      .filter((o) => o.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit);
  }
}
