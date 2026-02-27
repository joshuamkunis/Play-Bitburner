/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];
    const s = JSON.parse(ns.read(inputFile));

    if (!s.length) {
        await ns.write(outputFile, JSON.stringify(""), "w");
        return;
    }

    let result = "";
    let count = 1;

    for (let i = 1; i <= s.length; i++) {
        if (s[i] === s[i - 1]) {
            count++;
        } else {
            result += count + s[i - 1];
            count = 1;
        }
    }

    await ns.write(outputFile, JSON.stringify(result), "w");
}