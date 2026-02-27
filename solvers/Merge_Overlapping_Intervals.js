/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const intervals = JSON.parse(ns.read(inputFile));

    if (!intervals || intervals.length === 0) {
        await ns.write(outputFile, JSON.stringify([]), "w");
        return;
    }

    // sort by start time
    intervals.sort((a, b) => a[0] - b[0]);

    const merged = [];
    for (const interval of intervals) {
        if (merged.length === 0 || merged[merged.length - 1][1] < interval[0]) {
            // no overlap, add new interval
            merged.push([interval[0], interval[1]]);
        } else {
            // overlapping intervals, merge with the last one
            merged[merged.length - 1][1] =
                Math.max(merged[merged.length - 1][1], interval[1]);
        }
    }

    await ns.write(outputFile, JSON.stringify(merged), "w");
}
