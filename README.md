# DSA Search Engine (MERN, custom search core)
Run: `cd server && npm i && npm start` (port 4000), then `cd client && npm i && npm run dev`. Tests: `cd server && npm test`.
Search core (no third-party engine): `server/src/search/` — preprocess, inverted index, BM25F-style ranking with configurable `WEIGHTS`, trie autocomplete, Levenshtein typo suggestions, atomic index rebuild with version id.
Index is in-process: multiple server instances each hold their own copy; use a shared/persisted index before scaling out.
API (/api/v1): GET health, search?q&difficulty&topics&tags&sort&page&limit, search/suggest, search/related/:id, problems, problems/:id, problems/slug/:slug.
Not yet built: MongoDB models, auth, bookmarks, progress, admin, evaluation metrics, Docker/CI.
