function getKey(cell) {
  return `${cell.r},+${cell.c}`;
}

/*
const direction = [
  { row: -1, col: 0 }, // up
  { row: 0, col: 1 }, // right
  { row: 1, col: 0 }, // down
  { row: 0, col: -1 }, // left
];
*/

// we map the neighbors in the grid
const directions = [
  [-1, 0], // up
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
];

function shortestPath(grid, start, goal, trace) {
  // we need a queue to store the cells to visit
  const queue = [start];
  // we need a map to store the parents of the cells
  const parents = new Map();
  // we need a set to store the visited cells (since the should be there only once)
  const visited = new Set([getKey(start)]);

  // we want to empty the queue
  while (queue.length > 0) {
    // we want to get the current cell from the queue
    const currentCell = queue.shift();
    // we want to check if it is the goal

    if (currentCell.r === goal.r && currentCell.c === goal.c) {
      // ONLY HERE TO VISUALIZE THE PROCESS
      trace({ current: currentCell, queue, visited });

      // we will return with the path

      // we need to store the path and start with the goal to go back to the start
      const path = [goal];
      // we need to trace back to the start
      let cursor = getKey(goal);
      // we will go back to the start by getting the parent of the cell
      while (cursor !== getKey(start)) {
        // we need the parent of the cell
        const parent = parents.get(cursor);
        // we add the parent to the path so that will be the next legit cell
        path.push(parent);
        // we update the cursor so we go back to a step in the path
        cursor = getKey(parent);
      }
      // when we are done to traverse the path we just reverse it
      path.reverse();
      // and return the path
      return path;
    }
    // we want to try the other directions out
    for (const [directionRow, directionCol] of directions) {
      // calculate the next cell
      const nextCell = {
        r: currentCell.r + directionRow,
        c: currentCell.c + directionCol,
      };
      // check if it is inside the grid
      if (
        nextCell.r < 0 ||
        nextCell.r >= grid.length ||
        nextCell.c < 0 ||
        nextCell.c > grid[0].length
      ) {
        continue;
      }
      // check if it visited already
      if (visited.has(getKey(nextCell))) {
        continue;
      }
      // check if it is a wall
      if (grid[nextCell.r][nextCell.c] === "#") {
        continue;
      }
      // firstly we mark it as visited
      visited.add(getKey(nextCell));
      // then we set the parent because we will be able to track the path back to the start
      parents.set(getKey(nextCell), currentCell);
      // then we add the next cell into the queue
      queue.push(nextCell);

      // then we call the trace function == JUST HERE TO VISUALIZE THE PROCESS
      trace({ current: currentCell, queue, visited });
    }
  }
  // if the queue is empty we return null
  return null;
}

/*
function shortestPath(grid, start, goal, trace) {
  const queue = [start];
  const visited = new Set([key(start)]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    // is the goal
    if (current.r === goal.r && current.c === goal.c) {
      trace({ current, queue, visited });
      const path = [goal];
      let cursor = key(goal);
      while (cursor !== key(start)) {
        const previous = parent.get(cursor);
        path.push(previous);
        cursor = key(previous);
      }
      path.reverse();
      console.log(JSON.stringify(path, null, 2));
      return path;
    }
    // try all directions
    for (const { row: directionRow, col: directionCol } of direction) {
      // calculate the next cell
      const next = { r: current.r + directionRow, c: current.c + directionCol };
      // out of the map
      if (
        next.c < 0 ||
        next.r < 0 ||
        next.c >= grid[0].length ||
        next.r >= grid.length
      ) {
        continue;
      }
      // is a wall
      if (grid[next.r][next.c] === "#") {
        continue;
      }
      const nextKey = key(next);
      // already visited
      if (visited.has(nextKey)) {
        continue;
      }
      // mark as visited
      visited.add(nextKey);
      // set the parent
      parent.set(nextKey, current);
      // add to the queue
      queue.push(next);
    }
    trace({ current, queue, visited });
  }
  return null;
  // grid[r][c] === "#" is a wall. Every other character is open.
  // start and goal are { r, c }.
  // Return [{ r, c }, ...] from start to goal, or null.
  //
  // Write it in this order:
  // 1. Put start in a queue and in a visited set.
  // 2. parent maps a cell key to the { r, c } that enqueued it.
  // 3. While the queue has cells, shift the front one.
  // 4. If that cell is the goal, walk parent back to start, reverse, return it.
  // 5. Otherwise try up, down, left, right.
  //    Skip edges, walls, and keys already in visited.
  //    Mark visited, set parent, push.
  // 6. After the new neighbors are queued, call:
  //      trace({ current, queue, visited })
  //    Do the same call before returning the goal path.
  // 7. If the queue empties, return null.

  return null;
}
  */
