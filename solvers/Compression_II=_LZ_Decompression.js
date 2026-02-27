/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];
    const data = JSON.parse(ns.read(inputFile));

    let result = "";
    let i = 0;

    while (i < data.length) {
        const length = parseInt(data[i++]);
        const distance = parseInt(data[i++]);

        if (length === 0) {
            result += data[i++];
        } else {
            const start = result.length - distance;
            result += result.slice(start, start + length);
        }
    }

    await ns.write(outputFile, JSON.stringify(result), "w");
}