/** @param {NS} ns **/
export async function main(ns) {
    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const grid = JSON.parse(ns.read(inputFile));

    if (!grid || grid.length === 0 || grid[0].length === 0) {
        await ns.write(outputFile, JSON.stringify(0), "w");
        return;
    }

    const rows = grid.length;
    const cols = grid[0].length;

    // use a single array for dp to save space
    const dp = new Array(cols).fill(0);

    // initialize first cell
    dp[0] = grid[0][0];
    // first row
    for (let j = 1; j < cols; j++) {
        dp[j] = dp[j - 1] + grid[0][j];
    }

    for (let i = 1; i < rows; i++) {
        // update first column for this row
        dp[0] = dp[0] + grid[i][0];
        for (let j = 1; j < cols; j++) {
            dp[j] = Math.min(dp[j - 1], dp[j]) + grid[i][j];
        }
    }

    await ns.write(outputFile, JSON.stringify(dp[cols - 1]), "w");
}