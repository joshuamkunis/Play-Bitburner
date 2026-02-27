/** @param {NS} ns **/
export async function main(ns) {
    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const triangle = JSON.parse(ns.read(inputFile));

    if (!triangle || triangle.length === 0) {
        await ns.write(outputFile, JSON.stringify(0), "w");
        return;
    }

    // we'll use a bottom-up DP approach, reusing a single array
    const dp = triangle[triangle.length - 1].slice();

    for (let i = triangle.length - 2; i >= 0; i--) {
        const row = triangle[i];
        for (let j = 0; j < row.length; j++) {
            dp[j] = row[j] + Math.min(dp[j], dp[j + 1]);
        }
    }

    await ns.write(outputFile, JSON.stringify(dp[0]), "w");
}