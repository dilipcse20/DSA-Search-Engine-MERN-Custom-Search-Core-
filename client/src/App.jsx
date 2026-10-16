import { useEffect, useState } from "react";
const get = async (url, signal) => {
  const r = await fetch(url, { signal });
  const j = await r.json();
  if (!j.success) throw new Error(j.error?.message || "Request failed");
  return j.data;
};
const params = () => Object.fromEntries(new URLSearchParams(location.search));
export default function App() {
  const init = params();
  const [q, setQ] = useState(init.q || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [difficulty, setDifficulty] = useState(init.difficulty || "");
  const [sort, setSort] = useState(init.sort || "relevance");
  const [page, setPage] = useState(+init.page || 1);
  const [dq, setDq] = useState(q);
  const [data, setData] = useState(null);
  const [sugg, setSugg] = useState([]);
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const c = new AbortController();

    if (!dq.trim()) {
      setSugg([]);
      return () => c.abort();
    }

    get(`/api/v1/search/suggest?q=${encodeURIComponent(dq)}`, c.signal)
      .then((d) => setSugg(d.suggestions))
      .catch((e) => {
        if (e.name !== "AbortError") setSugg([]);
      });

    return () => c.abort();
  }, [dq]);
  useEffect(() => {
    if (!dq.trim()) {
      setData(null);
      setState("idle");
      return;
    }
    const c = new AbortController(),
      p = new URLSearchParams({ q: dq, sort, page });
    if (difficulty) p.set("difficulty", difficulty);
    history.replaceState(null, "", "?" + p);
    setState("loading");
    get("/api/v1/search?" + p, c.signal)
      .then((d) => {
        setData(d);
        setState("done");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setErr(e.message);
          setState("error");
        }
      });
    return () => c.abort();
  }, [dq, difficulty, sort, page, retry]); // aborting stale requests prevents overwrites
  const reset = (fn) => (v) => {
    fn(v);
    setPage(1);
  };
  return (
    <main>
      <h1>DSA Search</h1>
      <div className="bar">
        <input
          aria-label="Search problems"
          placeholder="Try: binary search, sliding window, trie…"
          value={q}
          autoComplete="off"
          onFocus={() => setShowSuggestions(true)}
          onChange={(e) => {
            reset(setQ)(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowSuggestions(false);
            }

            if (e.key === "Enter") {
              setShowSuggestions(false);
            }
          }}
        />

        {showSuggestions && q.trim() && sugg.length > 0 && (
          <div className="suggestion-list">
            {sugg.map((s, i) => (
              <button
                type="button"
                className="suggestion-item"
                key={s}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  reset(setQ)(s);
                  setShowSuggestions(false);
                }}
              >
                <span className="suggestion-icon">⌕</span>
                <span>{s}</span>
                <span className="suggestion-arrow">↗</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="filters">
        <select
          aria-label="Difficulty"
          value={difficulty}
          onChange={(e) => reset(setDifficulty)(e.target.value)}
        >
          <option value="">Any difficulty</option>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => reset(setSort)(e.target.value)}
        >
          <option value="relevance">Relevance</option>
          <option value="title">Title</option>
          <option value="difficulty">Difficulty</option>
        </select>
        {(difficulty || sort !== "relevance") && (
          <button
            onClick={() => {
              setDifficulty("");
              setSort("relevance");
            }}
          >
            Clear
          </button>
        )}
      </div>
      {state === "idle" && (
        <p className="muted">Start typing to search problems.</p>
      )}
      {state === "loading" && (
        <p className="muted" aria-live="polite">
          Searching…
        </p>
      )}
      {state === "error" && (
        <p role="alert">
          {err} <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
        </p>
      )}
      {state === "done" && data && (
        <>
          {data.query.suggestion && (
            <p>
              Did you mean{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  reset(setQ)(data.query.suggestion);
                }}
              >
                {data.query.suggestion}
              </a>
              ?
            </p>
          )}
          <p className="muted">{data.pagination.totalItems} result(s)</p>
          {!data.items.length && (
            <p>No matches. Try fewer words or clear filters.</p>
          )}
          {data.items.map((p) => (
            <article key={p.id}>
              <h2>
                {p.title}{" "}
                <span className={"b " + p.difficulty}>{p.difficulty}</span>
              </h2>
              <p>{p.description}</p>
              <p className="muted">
                {[...p.topics, ...p.tags].join(" · ")} — {p.timeComplexity}{" "}
                time, {p.spaceComplexity} space
              </p>
            </article>
          ))}
          {data.pagination.totalPages > 1 && (
            <div className="filters">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </button>
              <span>
                Page {page} / {data.pagination.totalPages}
              </span>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
