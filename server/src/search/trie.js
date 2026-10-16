export class Trie {
  constructor() {
    this.root = { c: new Map(), v: null };
  }

  insert(s) {
    const original = String(s).trim();
    const key = original.toLowerCase();

    if (!key) return;

    let n = this.root;

    for (const ch of key) {
      if (!n.c.has(ch)) {
        n.c.set(ch, { c: new Map(), v: null });
      }

      n = n.c.get(ch);
    }

    // Avoid duplicate entries differing only by letter case.
    if (n.v === null) {
      n.v = original;
    }
  }

  suggest(prefix, limit = 8) {
    const p = String(prefix || "")
      .toLowerCase()
      .trim();

    if (!p) return [];

    // Find the Trie node matching the typed prefix.
    let n = this.root;

    for (const ch of p) {
      n = n.c.get(ch);

      if (!n) return [];
    }

    const matches = [];
    const stack = [n];

    // Collect all matching strings.
    while (stack.length) {
      const current = stack.pop();

      if (current.v !== null) {
        matches.push(current.v);
      }

      // Reverse insertion order for deterministic traversal.
      const keys = [...current.c.keys()].sort().reverse();

      for (const ch of keys) {
        stack.push(current.c.get(ch));
      }
    }

    // Prefer the shortest matching strings.
    matches.sort((a, b) => {
      const aKey = a.toLowerCase();
      const bKey = b.toLowerCase();

      return aKey.length - bKey.length || aKey.localeCompare(bKey);
    });

    return matches.slice(0, Math.max(0, limit));
  }
}
