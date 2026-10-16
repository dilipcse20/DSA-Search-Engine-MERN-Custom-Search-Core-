import express from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
const list = (v) =>
  v
    ? String(v)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    : undefined;
const int = (v, d, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? d : Math.min(max, Math.max(min, n));
};
export function createApp(engine, { rate = 300 } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set("X-Request-Id", req.id);
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: rate,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const ok = (res, data) => res.json({ success: true, data });
  const bad = (res, code, msg) =>
    res.status(code).json({ success: false, error: { message: msg } });
  const r = express.Router();
  r.get("/health", (q, res) =>
    ok(res, { status: "ok", index: engine.status() }),
  );
  r.get("/search", (req, res) => {
    const q = String(req.query.q ?? "");
    if (q.length > 200)
      return bad(res, 400, "q must be at most 200 characters");
    if (!q.trim()) return bad(res, 400, "q is required");
    const sort = req.query.sort || "relevance";
    if (!["relevance", "title", "difficulty"].includes(sort))
      return bad(res, 400, "invalid sort");
    ok(
      res,
      engine.search(q, {
        difficulty: req.query.difficulty,
        topics: list(req.query.topics),
        tags: list(req.query.tags),
        sort,
        page: int(req.query.page, 1, 1, 10000),
        limit: int(req.query.limit, 20, 1, 50),
      }),
    );
  });
  r.get("/search/suggest", (req, res) =>
    ok(res, {
      suggestions: engine.suggest(
        String(req.query.q ?? "").slice(0, 100),
        int(req.query.limit, 8, 1, 20),
      ),
    }),
  );
  r.get("/search/related/:id", (req, res) => {
    const x = engine.related(req.params.id);
    x ? ok(res, { items: x }) : bad(res, 404, "Problem not found");
  });
  r.get("/problems", (req, res) => {
    const all = [...engine.state.byId.values()],
      limit = int(req.query.limit, 20, 1, 50),
      page = int(req.query.page, 1, 1, 10000);
    ok(res, {
      items: all.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        totalItems: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    });
  });
  r.get("/problems/slug/:slug", (req, res) => {
    const p = [...engine.state.byId.values()].find(
      (x) => x.slug === req.params.slug,
    );
    p ? ok(res, p) : bad(res, 404, "Problem not found");
  });
  r.get("/problems/:id", (req, res) => {
    const p = engine.state.byId.get(req.params.id);
    p ? ok(res, p) : bad(res, 404, "Problem not found");
  });
  app.use("/api/v1", r);
  app.use((q, res) => bad(res, 404, "Not found"));
  app.use((err, req, res, next) => {
    console.error(JSON.stringify({ id: req.id, err: err.message }));
    bad(res, 500, "Internal server error");
  });
  return app;
}
