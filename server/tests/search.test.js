import { describe, it, expect } from "vitest";
import request from "supertest";
import { levenshtein, closest } from "../src/search/editDistance.js";
import { Trie } from "../src/search/trie.js";
import { tokenize } from "../src/search/preprocess.js";
import { SearchEngine } from "../src/search/searchEngine.js";
import { createApp } from "../src/app.js";
import { problems } from "../src/data/problems.js";
const engine = new SearchEngine(problems),
    app = createApp(engine);
describe("edit distance", () => {
    it("handles ins/del/sub/exact", () => {
        expect(levenshtein("cat", "cat")).toBe(0);
        expect(levenshtein("cat", "cats")).toBe(1);
        expect(levenshtein("cats", "cat")).toBe(1);
        expect(levenshtein("cat", "cut")).toBe(1);
    });
    it("closest ignores unrelated words", () => {
        expect(closest("binar", ["binary", "graph"])).toBe("binary");
        expect(closest("zzzzz", ["binary"])).toBeNull();
    });
});
describe("trie", () => {
    it("prefix, case-insensitive, no dupes", () => {
        const t = new Trie();
        ["Binary Search", "binary search", "Binary Tree"].forEach((s) =>
            t.insert(s),
        );
        expect(t.suggest("BINARY S")).toHaveLength(1);
        expect(t.suggest("")).toEqual([]);
    });
});
describe("preprocess", () => {
    it("expands aliases, keeps c++", () => {
        expect(tokenize("DP in C++")).toEqual([
            "dynamic",
            "programming",
            "in",
            "cpp",
        ]);
    });
});
describe("engine", () => {
    it("ranks exact title first", () =>
        expect(engine.search("binary search").items[0].id).toBe("p1"));
    it("finds sliding window", () =>
        expect(engine.search("sliding window").items[0].id).toBe("p2"));
    it("suggests typo fix", () =>
        expect(engine.search("binar search").query.suggestion).toBe(
            "binary search",
        ));
    it("filters before pagination", () => {
        const r = engine.search("dynamic programming", { difficulty: "easy" });
        expect(r.pagination.totalItems).toBe(r.items.length);
        expect(r.items.every((i) => i.difficulty === "Easy")).toBe(true);
    });
    it("update/remove keep index consistent", () => {
        const e = new SearchEngine(problems);
        e.remove("p1");
        expect(
            e.search("binary search").items.find((i) => i.id === "p1"),
        ).toBeUndefined();
    });
});
describe("api", () => {
    it("health", async () => {
        expect((await request(app).get("/api/v1/health")).status).toBe(200);
    });
    it("400 on empty q", async () => {
        expect((await request(app).get("/api/v1/search?q=")).status).toBe(400);
    });
    it("search contract", async () => {
        const r = await request(app).get("/api/v1/search?q=trie");
        expect(r.body.success).toBe(true);
        expect(r.body.data.pagination.totalItems).toBeGreaterThan(0);
    });
    it("suggest + 404", async () => {
        expect(
            (await request(app).get("/api/v1/search/suggest?q=bin")).body.data
                .suggestions.length,
        ).toBeGreaterThan(0);
        expect((await request(app).get("/api/v1/problems/nope")).status).toBe(404);
    });
});
