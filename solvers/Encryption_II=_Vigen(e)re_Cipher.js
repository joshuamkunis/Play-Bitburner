/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const [text, keyword] = JSON.parse(ns.read(inputFile));

    const A = "A".charCodeAt(0);
    const key = keyword.toUpperCase();
    const plaintext = text.toUpperCase();

    let result = "";
    let keyIndex = 0;

    for (let i = 0; i < plaintext.length; i++) {
        const char = plaintext[i];

        if (char === " ") {
            result += " ";
            continue;
        }

        const textVal = char.charCodeAt(0) - A;
        const keyVal = key[keyIndex % key.length].charCodeAt(0) - A;

        const encryptedVal = (textVal + keyVal) % 26;
        result += String.fromCharCode(encryptedVal + A);

        keyIndex++;
    }

    await ns.write(outputFile, JSON.stringify(result), "w");
}