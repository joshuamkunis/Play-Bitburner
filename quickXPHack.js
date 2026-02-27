/** best-hack-deployer.js
 * Scans the network, picks the server with the highest expected payout/time ratio,
 * writes a one-shot hack worker (hack.js) to home, copies it to all servers you
 * have root on that have enough RAM, and runs one thread of it on each.
 *
 * Usage: run best-hack-deployer.js
 */

export async function main(ns) {
    const workerName = 'hack.js';
    const workerCode =
`/** hack.js - single hack worker */
export async function main(ns) {
    if (ns.args.length < 1) {
        ns.tprint('Usage: run hack.js <target>');
        return;
    }
    const target = ns.args[0];
    try {
        await ns.hack(target);
    } catch (e) {
        ns.tprint('hack.js error: ' + e);
    }
}
`;

    // Ensure worker exists on home
    if (ns.read(workerName) !== workerCode) {
        ns.write(workerName, workerCode, 'w');
    }

      // --- AUTO ROOT ---
  function tryRoot(server) {
    //Copy hacking scripts to all servers
    ns.scp("hack.js", server)
    ns.scp("weaken.js", server)
    ns.scp("grow.js", server)

    if (ns.hasRootAccess(server)) return;

    let ports = 0;
    if (ns.fileExists("BruteSSH.exe")) { ns.brutessh(server); ports++; }
    if (ns.fileExists("FTPCrack.exe")) { ns.ftpcrack(server); ports++; }
    if (ns.fileExists("relaySMTP.exe")) { ns.relaysmtp(server); ports++; }
    if (ns.fileExists("HTTPWorm.exe")) { ns.httpworm(server); ports++; }
    if (ns.fileExists("SQLInject.exe")) { ns.sqlinject(server); ports++; }

    if (ports >= ns.getServerNumPortsRequired(server)) {
      ns.nuke(server);
    }
  }

    // Scan entire network (BFS)
    function scanAll() {
        const seen = new Set(['home']);
        const queue = ['home'];
        while (queue.length) {
            const cur = queue.shift();
            for (const n of ns.scan(cur)) {
                if (!seen.has(n)) {
                    tryRoot(n);
                    seen.add(n);
                    queue.push(n);
                }
            }
        }
        return Array.from(seen);
    }

    const allServers = scanAll();

    // Choose the target with the smallest hack time
    let bestTarget = null;
    let bestHackTime = Infinity;
    for (const s of allServers) {
        try {
            const maxMoney = ns.getServerMaxMoney(s);
            if (maxMoney <= 0) continue;
            const hackTime = ns.getHackTime(s);
            if (!isFinite(hackTime) || hackTime <= 0) continue;
            if (hackTime < bestHackTime) {
                bestHackTime = hackTime;
                bestTarget = s;
            }
        } catch (_) {
            // ignore servers we can't query
        }
    }

    if (!bestTarget) {
        ns.tprint('No suitable hack target found.');
        return;
    }
    ns.tprint(`Selected target: ${bestTarget} (time ${bestHackTime} ms)`);

    // RAM constant for `hack.js` and deploy max threads per host across the network
    const HACK_RAM = 1.70;

    // Ensure worker exists on home (was done earlier) and then deploy to hosts
    for (const host of allServers) {
        try {
            if (!ns.hasRootAccess(host)) continue;
            const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
            const threads = Math.floor(freeRam / HACK_RAM);
            if (threads <= 0) continue;
            await ns.scp(workerName, host);
            const pid = ns.exec(workerName, host, threads, bestTarget);
            if (pid > 0) ns.tprint(`Launched on ${host} (${threads} threads)`);
            else ns.tprint(`Failed to launch on ${host}`);
        } catch (e) {
            ns.tprint(`Error deploying to ${host}: ${e}`);
        }
    }
}