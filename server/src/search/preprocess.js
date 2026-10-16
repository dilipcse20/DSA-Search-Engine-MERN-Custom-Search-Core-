const ALIASES = {
    dp: "dynamic programming",
    bfs: "breadth first search",
    dfs: "depth first search",
    bst: "binary search tree",
    lis: "longest increasing subsequence",
};
export function normalize(t) {
    return String(t ?? "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/c\+\+/g, "cpp")
        .replace(/c#/g, "csharp")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
export function tokenize(t) {
    let n = normalize(t);
    for (const [k, v] of Object.entries(ALIASES))
        n = n.replace(new RegExp(`\\b${k}\\b`, "g"), v);
    return n ? n.split(" ") : [];
}
