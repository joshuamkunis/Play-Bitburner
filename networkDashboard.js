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
  let lastIncome = ns.getTotalScriptIncome()[0];
  let lastSnapshot = {};
  let history = {};
  let activeTargets = {};
  // track when we first saw each running process so we can estimate remaining time
  let processStart = {};    // key: "host:pid" -> timestamp


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


  // helpers for Unicode bars/padding
  function bar(pct, width = 20) {
    // ensure pct is between 0 and 100 to avoid negative repeats
    const clamped = Math.max(0, Math.min(100, pct));
    const filled = Math.round((clamped / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  function pad(str, len) {
    return str + " ".repeat(Math.max(0, len - str.length));
  }

  // ─── new helpers to keep everything the same width ──────────
  const WIDTH = ("╔════════════════════════════════════════════════════════════════════════╗").length;

  function centre(str, innerWidth = WIDTH - 2) {
    const padTotal = innerWidth - str.length;
    const left = Math.floor(padTotal / 2);
    const right = padTotal - left;
    return " ".repeat(left) + str + " ".repeat(right);
  }

  function topBorder() {
    return "╔" + "═".repeat(WIDTH - 2) + "╗";
  }

  function bottomBorder() {
    return "╚" + "═".repeat(WIDTH - 2) + "╝";
  }

  function sectionBorder() {
    return "┌" + "─".repeat(WIDTH - 2) + "┐";
  }

  function sectionFooter() {
    return "└" + "─".repeat(WIDTH - 2) + "┘";
  }
  // ────────────────────────────────────────────────────────────

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

    // track targets
    const hackTargets = new Set();
    const growTargets = new Set();
    const weakenTargets = new Set();

    // for RAM timer calculation
    const currentPids = new Set();

    for (const s of servers) {
      if (!ns.hasRootAccess(s)) continue;

      const max = ns.getServerMaxRam(s);
      const used = ns.getServerUsedRam(s);

      totalRam += max;
      usedRam += used;

      const processes = ns.ps(s);
      for (const p of processes) {
        const ram = ns.getScriptRam(p.filename, s) * p.threads;

        // record process start time and estimate remaining
        const key = `${s}:${p.pid}`;
        currentPids.add(key);
        if (!processStart[key]) processStart[key] = now;
        // determine expected duration based on script type
        let duration = 0;
        const tgt = p.args && p.args.length > 0 ? p.args[0] : null;
        if (p.filename.includes("hack") && tgt) duration = ns.getHackTime(tgt);
        else if (p.filename.includes("grow") && tgt) duration = ns.getGrowTime(tgt);
        else if (p.filename.includes("weaken") && tgt) duration = ns.getWeakenTime(tgt);
        else if (p.filename.includes("share")) {
          if (ns.getShareTime) {
            duration = ns.getShareTime();
          }
        }
        const elapsed = now - processStart[key];
        const remaining = Math.max(0, duration - elapsed);

        if (p.filename.includes("hack")) hackRam += ram;
        else if (p.filename.includes("grow")) growRam += ram;
        else if (p.filename.includes("weaken")) weakenRam += ram;
        else if (p.filename.includes("share")) shareRam += ram;

        if ((p.filename.includes("hack") || p.filename.includes("grow") || p.filename.includes("weaken")) &&
            p.args && p.args.length > 0) {
          const tgt = p.args[0];
          activeTargets[tgt] = now;
          if (p.filename.includes("hack")) hackTargets.add(tgt);
          else if (p.filename.includes("grow")) growTargets.add(tgt);
          else if (p.filename.includes("weaken")) weakenTargets.add(tgt);
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
      if (moneyChanged || secChanged) activeTargets[s] = now;

      history[s].push({ money, sec });
      if (history[s].length > SERVER_HISTORY) history[s].shift();
      lastSnapshot[s] = { money, sec };
    }

    // === DASHBOARD OUTPUT ===

    ns.print(topBorder());
    ns.print("║" + centre("NETWORK OPERATIONS DASHBOARD") + "║");
    ns.print(bottomBorder());

    ns.print("");
    ns.print("📈 Income / sec");
    ns.print("  Current: " + formatMoney(currentIncome) + "/sec");

    ns.print("");
    ns.print("💾 RAM Usage");
    // make sure the bars all start in the same column
    const ramLabels = ["Home:", "Network:"];
    const ramLabelWidth = Math.max(...ramLabels.map(l => l.length));

    const homeMax = ns.getServerMaxRam("home");
    const homeUsed = ns.getServerUsedRam("home");
    const homeFree = homeMax - homeUsed;
    const homeFreePct = homeMax === 0 ? 0 : (homeFree / homeMax) * 100;
    ns.print(
      "  " + pad("Home:", ramLabelWidth) +
        " [" + bar(homeFreePct) + "] " +
        homeFreePct.toFixed(1) + "% free (" +
        formatRam(homeFree) + " / " + formatRam(homeMax) + ")"
    );

    const netFree = totalRam - usedRam;
    const netFreePct = totalRam === 0 ? 0 : (netFree / totalRam) * 100;
    ns.print(
      "  " + pad("Network:", ramLabelWidth) +
        " [" + bar(netFreePct) + "] " +
        netFreePct.toFixed(1) + "% free (" +
        formatRam(netFree) + " / " + formatRam(totalRam) + ")"
    );

    ns.print("");
    ns.print("⚙️ Script RAM Allocation");
    // align the script labels as well
    const scriptLabels = ["Hack   :", "Grow   :", "Weaken :", "Share  :"];
    const scriptLabelWidth = Math.max(...scriptLabels.map(l => l.length));
    // fixed width for the percentage column – large enough for "100.0%"
    const pctWidth = 6;

    function pctStr(val) {
      return (pct(val).toFixed(1) + "%").padStart(pctWidth);
    }

    ns.print(
      "  " + pad("Hack   :", scriptLabelWidth) +
        " " + pctStr(hackRam) + " [" + bar(pct(hackRam)) + "]" +
        (hackTargets.size ? " " + [...hackTargets].join(", ") : "")
    );
    ns.print(
      "  " + pad("Grow   :", scriptLabelWidth) +
        " " + pctStr(growRam) + " [" + bar(pct(growRam)) + "]" +
        (growTargets.size ? " " + [...growTargets].join(", ") : "")
    );
    ns.print(
      "  " + pad("Weaken :", scriptLabelWidth) +
        " " + pctStr(weakenRam) + " [" + bar(pct(weakenRam)) + "]" +
        (weakenTargets.size ? " " + [...weakenTargets].join(", ") : "")
    );
    ns.print(
      "  " + pad("Share  :", scriptLabelWidth) +
        " " + pctStr(shareRam) + " [" + bar(pct(shareRam)) + "]"
    );

    ns.print("");
    ns.print(sectionBorder());
    ns.print("│" + centre("Active Target Servers") + "│");
    ns.print(sectionFooter());

    const recentlyActive = Object.entries(activeTargets)
      .filter(([_, timestamp]) => now - timestamp <= CHANGE_WINDOW)
      .map(([name]) => name);

    if (recentlyActive.length === 0) {
      ns.print("  (no recent changes)");
    } else {
      for (const name of recentlyActive) {
        const money = ns.getServerMoneyAvailable(name);
        const maxMoney = ns.getServerMaxMoney(name);
        const sec = ns.getServerSecurityLevel(name);
        const minSec = ns.getServerMinSecurityLevel(name);

        const moneyPct = maxMoney === 0 ? 0 : (money / maxMoney) * 100;
        const secPct = minSec === 0 ? 0 : (sec / minSec) * 100;
        // compute security bar percentage: 0 at 100% min, full at 500% min
        let secBarPct = 0;
        if (secPct > 100) {
          secBarPct = ((secPct - 100) / 400) * 100;
        }
        if (secBarPct > 100) secBarPct = 100;

        const moneyStr = ns.formatNumber(money);
        const secStr = sec.toFixed(2);
        
        // Line 1: Server name
        ns.print("  " + name);
        // Line 2: Money graph, value, percentage
        ns.print("    $" + bar(moneyPct) + " $" + moneyStr + " (" + moneyPct.toFixed(1) + "%)");
        // Line 3: Security graph, value, percentage
        ns.print("    S" + bar(secBarPct) + " S:" + secStr + " (" + secPct.toFixed(1) + "%)");
      }
    }


    await ns.sleep(INTERVAL);
  }
}