/** @param {NS} ns **/
export async function main(ns) {

  const useFormulas = ns.fileExists("Formulas.exe", "home");
  const reserveHomePercent = 0.10;
  const batchSpacing = 200; // ms between phases
  const maxTargets = 3;     // parallel targets

  const hackScript = "hack.js";
  const growScript = "grow.js";
  const weakenScript = "weaken.js";

  const hackRam = ns.getScriptRam(hackScript);
  const growRam = ns.getScriptRam(growScript);
  const weakenRam = ns.getScriptRam(weakenScript);

  function scanAll() {
    const visited = new Set(["home"]);
    const stack = ["home"];
    while (stack.length) {
      const host = stack.pop();
      tryRoot(host);
      for (const n of ns.scan(host)) {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    return [...visited];
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

  function getServers() {
    return scanAll().filter(s =>
      ns.hasRootAccess(s) &&
      ns.getServerMaxRam(s) > 0
    );
  }

  function getTargets() {
    return scanAll().filter(s =>
      ns.hasRootAccess(s) &&
      ns.getServerMaxMoney(s) > 0 &&
      ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel()
    );
  }

  function getFreeRam(server) {
    const max = ns.getServerMaxRam(server);
    const used = ns.getServerUsedRam(server);
    let free = max - used;
    if (server === "home") free -= max * reserveHomePercent;
    return Math.max(0, free);
  }

  function totalFreeRam(servers) {
    return servers.reduce((sum, s) => sum + getFreeRam(s), 0);
  }

  function calculateROI(target) {
    const player = ns.getPlayer();
    const server = ns.getServer(target);

    if (useFormulas) {
      server.hackDifficulty = server.minDifficulty;
      server.moneyAvailable = server.moneyMax;
    }

    const hackPercent = useFormulas
      ? ns.formulas.hacking.hackPercent(server, player)
      : ns.hackAnalyze(target);

    const hackTime = useFormulas
      ? ns.formulas.hacking.hackTime(server, player)
      : ns.getHackTime(target);

    const hackChance = useFormulas
      ? ns.formulas.hacking.hackChance(server, player)
      : ns.hackAnalyzeChance(target);

    const money = server.moneyMax;

    if (hackPercent <= 0 || hackChance <= 0) return 0;

    const hackThreads = Math.floor(0.1 / hackPercent);
    if (hackThreads <= 0) return 0;

    const expectedMoney = money * hackPercent * hackThreads * hackChance;
    return expectedMoney / hackTime; // money per ms
  }

  function prepState(target) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const sec = ns.getServerSecurityLevel(target);
    const money = ns.getServerMoneyAvailable(target);

    if (sec > minSec + 1) return "weaken";
    if (money < maxMoney * 0.99) return "grow";
    return "ready";
  }

  function distribute(servers, script, threads, target, delay) {
    let remaining = threads;
    const scriptRam = ns.getScriptRam(script);

    for (const s of servers) {
      if (remaining <= 0) break;
      const free = getFreeRam(s);
      const maxThreads = Math.floor(free / scriptRam);
      const run = Math.min(maxThreads, remaining);
      if (run > 0) {
        ns.exec(script, s, run, target, delay);
        remaining -= run;
      }
    }
  }

  while (true) {

    const servers = getServers();
    const targets = getTargets();

    if (targets.length === 0) {
      await ns.sleep(1000);
      continue;
    }

    // ROI sort (descending)
    targets.sort((a, b) => calculateROI(b) - calculateROI(a));

    const activeTargets = targets.slice(0, maxTargets);

    for (const target of activeTargets) {

      const state = prepState(target);

      if (state !== "ready") {
        const script = state === "weaken" ? weakenScript : growScript;
        const scriptRam = ns.getScriptRam(script);
        const threads = Math.floor(totalFreeRam(servers) / scriptRam);

        if (threads > 0) {
          distribute(servers, script, threads, target, 0);
        }
        continue;
      }

      const player = ns.getPlayer();
      const serverObj = ns.getServer(target);

      if (useFormulas) {
        serverObj.hackDifficulty = serverObj.minDifficulty;
        serverObj.moneyAvailable = serverObj.moneyMax;
      }

      const hackPercent = useFormulas
        ? ns.formulas.hacking.hackPercent(serverObj, player)
        : ns.hackAnalyze(target);

      if (hackPercent <= 0) continue;

      const hackThreads = Math.floor(0.1 / hackPercent);
      if (hackThreads <= 0) continue;

      const hackSecurity = hackThreads * 0.002;
      const weakenThreads1 = Math.ceil(hackSecurity / 0.05);

      const growMultiplier = 1 / (1 - hackPercent * hackThreads);
      const growThreads = useFormulas
        ? Math.ceil(ns.formulas.hacking.growThreads(serverObj, player, serverObj.moneyMax))
        : Math.ceil(ns.growthAnalyze(target, growMultiplier));

      const growSecurity = growThreads * 0.004;
      const weakenThreads2 = Math.ceil(growSecurity / 0.05);

      const totalBatchRam =
        hackThreads * hackRam +
        growThreads * growRam +
        (weakenThreads1 + weakenThreads2) * weakenRam;

      const freeRam = totalFreeRam(servers);
      const batches = Math.floor(freeRam / totalBatchRam);
      if (batches <= 0) continue;

      const hackTime = ns.getHackTime(target);
      const growTime = ns.getGrowTime(target);
      const weakenTime = ns.getWeakenTime(target);

      for (let i = 0; i < batches; i++) {
        const offset = i * batchSpacing;

        distribute(servers, hackScript, hackThreads, target,
          weakenTime - hackTime - batchSpacing + offset);

        distribute(servers, weakenScript, weakenThreads1, target,
          offset);

        distribute(servers, growScript, growThreads, target,
          weakenTime - growTime + batchSpacing + offset);

        distribute(servers, weakenScript, weakenThreads2, target,
          batchSpacing * 2 + offset);
      }
    }

    await ns.sleep(200);
  }
}
