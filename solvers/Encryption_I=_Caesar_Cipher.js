/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const [text, shift] = JSON.parse(ns.read(inputFile));

    const A = "A".charCodeAt(0);
    const Z = "Z".charCodeAt(0);

    const normalizedShift = shift % 26;

    let result = "";

    for (const ch of text) {

        if (ch === " ") {
            result += " ";
            continue;
        }

        const code = ch.charCodeAt(0);

        if (code >= A && code <= Z) {
            let shifted = code - normalizedShift;

            if (shifted < A) {
                shifted += 26;
            }

            result += String.fromCharCode(shifted);
        } else {
            // Shouldn't occur per contract, but safe fallback
            result += ch;
        }
    }

    await ns.write(outputFile, JSON.stringify(result), "w");
}