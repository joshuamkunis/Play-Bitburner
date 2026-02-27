/** @param {NS} ns **/
export async function main(ns) {

  ns.disableLog("ALL");
  ns.clearLog();
  ns.ui.openTail();
  ns.ui.resizeTail(900, 600);

  const INTERVAL = 2000;
  const HISTORY_LENGTH = 30;
  const SERVER_HISTORY = 10;
  const CHANGE_WINDOW = 20000; // show servers changed in last 20s

  let incomeHistory = [];
  let serverStats = {};
  let lastIncome = ns.getTotalScriptIncome()[0];
  let lastSnapshot = {};
  let history = {};
  let activeTargets = {};

  function scanAll() {
    const visited = new Set();
    const stack = ["home"];

    while (stack.length) {
      const s = stack.pop();
      if (!visited.has(s)) {
        visited.add(s);
        for (const n of ns.scan(s)) stack.push(n);
      }
    }
    return [...visited];
  }

  function formatMoney(n) {
    return "$" + ns.formatNumber(n);
  }

  function formatRam(n) {
    return ns.formatRam(n);
  }

  function sparkline(data) {
    const ticks = "▁▂▃▄▅▆▇█";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map(v => {
      const i = Math.floor(((v - min) / range) * (ticks.length - 1));
      return ticks[i];
    }).join("");
  }

  while (true) {

    ns.clearLog();
    const servers = scanAll();
    const now = Date.now(); // timestamp for any activity we detect

    // === INCOME TRACKING ===
    const currentIncome = ns.getTotalScriptIncome()[0];
    const delta = currentIncome - lastIncome;
    lastIncome = currentIncome;

    incomeHistory.push(delta);
    if (incomeHistory.length > HISTORY_LENGTH)
      incomeHistory.shift();

    // === RAM TRACKING ===
    let totalRam = 0;
    let usedRam = 0;

    let hackRam = 0;
    let growRam = 0;
    let weakenRam = 0;
    let shareRam = 0;

    for (const s of servers) {
      if (!ns.hasRootAccess(s)) continue;

      const max = ns.getServerMaxRam(s);
      const used = ns.getServerUsedRam(s);

      totalRam += max;
      usedRam += used;

      const processes = ns.ps(s);
      for (const p of processes) {
        const ram = ns.getScriptRam(p.filename, s) * p.threads;

        if (p.filename.includes("hack")) hackRam += ram;
        else if (p.filename.includes("grow")) growRam += ram;
        else if (p.filename.includes("weaken")) weakenRam += ram;
        else if (p.filename.includes("share")) shareRam += ram;

        // if this script is targeting another server, mark that target as active
        if ((p.filename.includes("hack") || p.filename.includes("grow") || p.filename.includes("weaken")) && p.args && p.args.length > 0) {
          const tgt = p.args[0];
          // record the time we last saw this target mentioned
          activeTargets[tgt] = now;
        }
      }
    }

    const freeRam = totalRam - usedRam;

    const pct = (x) => totalRam === 0 ? 0 : ((x / totalRam) * 100);

    // === SERVER CHANGE TRACKING ===

    for (const s of servers) {

      if (!ns.hasRootAccess(s)) continue;
      if (ns.getServerMaxMoney(s) === 0) continue;

      const money = ns.getServerMoneyAvailable(s);
      const sec = ns.getServerSecurityLevel(s);

      if (!history[s]) history[s] = [];
      if (!lastSnapshot[s]) {
        lastSnapshot[s] = { money, sec };
      }

      const prev = lastSnapshot[s];

      const moneyChanged = money !== prev.money;
      const secChanged = sec !== prev.sec;

      if (moneyChanged || secChanged) {
        activeTargets[s] = now;
      }

      // Always store rolling history
      history[s].push({ money, sec });

      if (history[s].length > SERVER_HISTORY)
        history[s].shift();

      // Update snapshot
      lastSnapshot[s] = { money, sec };
    }

    // === DASHBOARD OUTPUT ===

    ns.print("╔══════════════════════════════════════════════════════════════╗");
    ns.print("║                    NETWORK OPERATIONS DASHBOARD              ║");
    ns.print("╚══════════════════════════════════════════════════════════════╝");

    // Income
    ns.print("");
    ns.print("📈 Income / sec (delta over time)");
    if (incomeHistory.length > 1) {
      ns.print("  " + sparkline(incomeHistory));
    }
    ns.print("  Current: " + formatMoney(currentIncome) + "/sec");

    // === RAM ===
    ns.print("");
    ns.print("💾 RAM Usage");

    // --- HOME ---
    const homeMax = ns.getServerMaxRam("home");
    const homeUsed = ns.getServerUsedRam("home");
    const homeFree = homeMax - homeUsed;
    const homeFreePct = homeMax === 0 ? 0 : (homeFree / homeMax) * 100;

    ns.print(
      "  Home:     " +
      formatRam(homeFree) +
      " (" + homeFreePct.toFixed(1) + "%) Free | " +
      formatRam(homeUsed) + " / " +
      formatRam(homeMax)
    );

    // --- NETWORK ---
    const netFree = totalRam - usedRam;
    const netFreePct = totalRam === 0 ? 0 : (netFree / totalRam) * 100;

    ns.print(
      "  Network:  " +
      formatRam(netFree) +
      " (" + netFreePct.toFixed(1) + "%) Free | " +
      formatRam(usedRam) + " / " +
      formatRam(totalRam)
    );

    // Script breakdown
    ns.print("");
    ns.print("⚙️ Script RAM Allocation");
    ns.print("  Hack   : " + pct(hackRam).toFixed(1) + "%");
    ns.print("  Grow   : " + pct(growRam).toFixed(1) + "%");
    ns.print("  Weaken : " + pct(weakenRam).toFixed(1) + "%");
    ns.print("  Share  : " + pct(shareRam).toFixed(1) + "%");

    // === ACTIVE TARGETS DISPLAY ===
    ns.print("");
    ns.print("🧠 Active Target Servers");

    const recentlyActive = Object.entries(activeTargets)
      .filter(([_, timestamp]) => now - timestamp <= CHANGE_WINDOW)
      .map(([name]) => name);

    if (recentlyActive.length === 0) {
      ns.print("  (No recent changes detected)");
    } else {
      for (const name of recentlyActive) {
        // current metrics
        const money = ns.getServerMoneyAvailable(name);
        const maxMoney = ns.getServerMaxMoney(name);
        const sec = ns.getServerSecurityLevel(name);
        const minSec = ns.getServerMinSecurityLevel(name);

        const moneyPct = maxMoney === 0 ? 0 : (money / maxMoney) * 100;
        const secPct = minSec === 0 ? 0 : (sec / minSec) * 100;

        // print header line with numeric values and percentages
        // pad fields to keep columns roughly aligned
        const namePad = name.padEnd(15);
        const moneyStr = ns.formatNumber(money).padStart(12);
        const secStr = sec.toFixed(2).padStart(6);
        ns.print(
          "  " + namePad +
            " $" + moneyStr +
            " (" + moneyPct.toFixed(1) + "%)" +
            "  S:" + secStr +
            " (" + secPct.toFixed(1) + "%)"
        );

        // also show history graphs if we have them
        const serverHistory = history[name];
        if (serverHistory && serverHistory.length >= 2) {
          const moneyGraph = sparkline(serverHistory.map(h => h.money));
          const secGraph = sparkline(serverHistory.map(h => h.sec));
          ns.print("    $ " + moneyGraph);
          ns.print("    S " + secGraph);
        }
      }
    }

    await ns.sleep(INTERVAL);
  }
}