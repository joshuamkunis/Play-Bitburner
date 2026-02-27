/** @param {NS} ns **/
export async function main(ns) {
    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const grid = JSON.parse(ns.read(inputFile));

    if (!grid || grid.length === 0 || grid[0].length === 0) {
        await ns.write(outputFile, JSON.stringify(""), "w");
        return;
    }

    const rows = grid.length;
    const cols = grid[0].length;

    // BFS to find shortest path
    // direction: 0=U, 1=D, 2=L, 3=R
    const directions = [[-1, 0, 'U'], [1, 0, 'D'], [0, -1, 'L'], [0, 1, 'R']];
    
    const queue = [[0, 0, '']]; // [row, col, path]
    const visited = new Set(['0,0']);

    while (queue.length > 0) {
        const [row, col, path] = queue.shift();

        // reached destination
        if (row === rows - 1 && col === cols - 1) {
            await ns.write(outputFile, JSON.stringify(path), "w");
            return;
        }

        // try all 4 directions
        for (const [dr, dc, dir] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            const key = `${newRow},${newCol}`;

            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && 
                grid[newRow][newCol] === 0 && !visited.has(key)) {
                visited.add(key);
                queue.push([newRow, newCol, path + dir]);
            }
        }
    }

    // no path found
    await ns.write(outputFile, JSON.stringify(""), "w");
}