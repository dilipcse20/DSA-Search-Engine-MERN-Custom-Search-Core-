export class InvertedIndex {
  constructor() {
    this.postings = new Map();
    this.docTerms = new Map();
    this.docLen = new Map();
    this.totalLen = 0;
  }
  get size() {
    return this.docLen.size;
  }
  add(id, fields) {
    if (this.docLen.has(id)) this.remove(id);
    const terms = new Set();
    let len = 0;
    for (const [f, toks] of Object.entries(fields))
      for (const t of toks) {
        len++;
        terms.add(t);
        let p = this.postings.get(t);
        if (!p) this.postings.set(t, (p = new Map()));
        let e = p.get(id);
        if (!e) p.set(id, (e = {}));
        e[f] = (e[f] || 0) + 1;
      }
    this.docTerms.set(id, terms);
    this.docLen.set(id, len);
    this.totalLen += len;
  }
  remove(id) {
    const terms = this.docTerms.get(id);
    if (!terms) return;
    for (const t of terms) {
      const p = this.postings.get(t);
      p.delete(id);
      if (!p.size) this.postings.delete(t);
    }
    this.totalLen -= this.docLen.get(id);
    this.docTerms.delete(id);
    this.docLen.delete(id);
  }
  update(id, fields) {
    this.add(id, fields);
  }
  lookup(term) {
    return this.postings.get(term) || new Map();
  }
  has(term) {
    return this.postings.has(term);
  }
  get avgLen() {
    return this.size ? this.totalLen / this.size : 0;
  }
  vocabulary() {
    return this.postings.keys();
  }
  candidates(terms, mode = "and") {
    const sets = terms.map((t) => new Set(this.lookup(t).keys()));
    if (!sets.length) return new Set();
    if (mode === "and")
      return sets.reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
    return sets.reduce((a, b) => new Set([...a, ...b]));
  }
}
