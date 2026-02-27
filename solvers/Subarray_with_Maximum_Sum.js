/** @param {NS} ns **/
export async function main(ns) {
    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const array = JSON.parse(ns.read(inputFile));

    if (!array || array.length === 0) {
        await ns.write(outputFile, JSON.stringify(0), "w");
        return;
    }

    // Kadane's algorithm to find maximum subarray sum
    let maxSum = array[0];
    let currentSum = array[0];

    for (let i = 1; i < array.length; i++) {
        currentSum = Math.max(array[i], currentSum + array[i]);
        maxSum = Math.max(maxSum, currentSum);
    }

    await ns.write(outputFile, JSON.stringify(maxSum), "w");
}