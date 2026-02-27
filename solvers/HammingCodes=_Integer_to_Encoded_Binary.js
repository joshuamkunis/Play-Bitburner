/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];
    const n = JSON.parse(ns.read(inputFile));

    const data = n.toString(2).split("").reverse();

    let m = data.length;
    let r = 0;
    while ((1 << r) < m + r + 1) r++;

    const result = [];
    let j = 0;

    for (let i = 1; i <= m + r; i++) {
        if ((i & (i - 1)) === 0) {
            result.push(0);
        } else {
            result.push(Number(data[j++] || 0));
        }
    }

    for (let i = 0; i < r; i++) {
        const pos = 1 << i;
        let parity = 0;
        for (let k = 1; k <= result.length; k++) {
            if (k & pos) parity ^= result[k - 1];
        }
        result[pos - 1] = parity;
    }

    await ns.write(outputFile, JSON.stringify(result.reverse().join("")), "w");
}