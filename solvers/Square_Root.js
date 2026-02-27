/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const input = ns.read(inputFile).trim();

    const n = BigInt(input);

    if (n < 2n) {
        await ns.write(outputFile, n.toString(), "w");
        return;
    }

    let left = 1n;
    let right = n;
    let answer = 0n;

    while (left <= right) {
        const mid = (left + right) / 2n;
        const square = mid * mid;

        if (square === n) {
            answer = mid;
            break;
        }

        if (square < n) {
            answer = mid;       // best floor candidate
            left = mid + 1n;
        } else {
            right = mid - 1n;
        }
    }

    // IMPORTANT: convert BigInt to string before JSON
    await ns.write(outputFile, answer.toString(), "w");
}