/**
 * killNetwork.js
 * 
 * Traverses the entire Bitburner network and kills all running scripts
 * on every server except for "home". Useful for clearing out stray jobs
 * before redeploying or when you want to free resources.
 *
 * Usage: run killNetwork.js
 */

/** @param {NS} ns */
export async function main(ns) {
    const visited = new Set();

    // recursively scan from a given host
    function scanAll(host) {
        visited.add(host);
        const neighbors = ns.scan(host);
        for (const n of neighbors) {
            if (!visited.has(n)) {
                scanAll(n);
            }
        }
    }

    scanAll("home");

    for (const host of visited) {
        if (host === "home") continue; // skip home
        ns.tprint(`killing all scripts on ${host}`);
        ns.killall(host);
    }
    ns.tprint("finished killing network scripts");
}
