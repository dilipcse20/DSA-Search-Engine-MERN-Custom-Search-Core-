import { createApp } from "./app.js";
import { SearchEngine } from "./search/searchEngine.js";
import { problems } from "./data/problems.js";
const engine = new SearchEngine(problems);
const port = process.env.PORT || 4000;
createApp(engine).listen(port, () =>
    console.log(
        JSON.stringify({ msg: "listening", port, index: engine.status() }),
    ),
);
