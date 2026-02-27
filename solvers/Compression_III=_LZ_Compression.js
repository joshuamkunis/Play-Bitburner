/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];
    const input = JSON.parse(ns.read(inputFile));

    let result = "";
    let i = 0;

    while (i < input.length) {

        let bestLen = 0;
        let bestDist = 0;

        for (let dist = 1; dist <= i; dist++) {
            let len = 0;
            while (
                len < 9 &&
                i + len < input.length &&
                input[i + len] === input[i - dist + len]
            ) {
                len++;
            }
            if (len > bestLen && len >= 2) {
                bestLen = len;
                bestDist = dist;
            }
        }

        if (bestLen >= 2) {
            result += bestLen.toString() + bestDist.toString();
            i += bestLen;
        } else {
            result += "0" + input[i];
            i++;
        }
    }

    await ns.write(outputFile, JSON.stringify(result), "w");
}