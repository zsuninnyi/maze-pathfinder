# Maze pathfinder

Practice writing breadth-first search. `index.html` loads `shortestPath` from `path.js`, draws the queue, and checks whether the route is shortest.

## Run

From this folder:

```bash
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765).

Opening `index.html` as a file will not work. The page fetches `path.js`, and browsers block that on `file://`.

## Practice

Edit `shortestPath` in `path.js` and save. The page reloads that file on its own. Use Back, Next, and Play to step through the search.
