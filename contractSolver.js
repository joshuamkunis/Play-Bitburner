/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const contracts = findContracts(ns);

  if (contracts.length === 0) {
    ns.tprint("No contracts found.");
    return;
  }

  let solved = 0;
  let failed = 0;
  let skipped = 0;

  for (const c of contracts) {
    const type = ns.codingcontract.getContractType(c.file, c.server);
    const data = ns.codingcontract.getData(c.file, c.server);
    const tries = ns.codingcontract.getNumTriesRemaining(c.file, c.server);

    const solverFile = `/solvers/${
        type
            .replace(/ /g, "_")
            .replace(/:/g, "=")
            .replace(/è/g,"(e)")
        }.js`;

    if (!ns.fileExists(solverFile, "home")) {
      skipped++;
      ns.tprint("❓ Missing solver: " + solverFile)
      continue;
    }

    const inputFile = `/tmp_contract_input.txt`;
    const outputFile = `/tmp_contract_output.txt`;

    await ns.write(inputFile, JSON.stringify(data), "w");
    await ns.rm(outputFile, "home");

    ns.print("Attempting to solve " + type + " @ " + c.server + " (tries left: " + tries + ")");

    const pid = ns.exec(solverFile, "home", 1, inputFile, outputFile);
    if (pid === 0) {
      ns.tprint(`⚠ Failed to start solver for ${type}`);
      skipped++;
      continue;
    }

    // Wait for solver to finish
    while (ns.isRunning(pid)) {
      await ns.sleep(50);
    }

    if (!ns.fileExists(outputFile, "home")) {
      ns.tprint(`⚠ No output from solver for ${type}`);
      skipped++;
      continue;
    }

    const answer = JSON.parse(ns.read(outputFile));

    const reward = ns.codingcontract.attempt(
      answer,
      c.file,
      c.server,
      { returnReward: true }
    );

    if (reward) {
      solved++;
      ns.tprint(`✅ ${type} @ ${c.server} → ${reward}`);
    } else {
      failed++;
      ns.tprint(`❌ Failed ${type} @ ${c.server}`);
    }
  }

  ns.tprint("\n===== SUMMARY =====");
  ns.tprint(`Solved: ${solved}`);
  ns.tprint(`Failed: ${failed}`);
  ns.tprint(`Skipped (no solver): ${skipped}`);
}

/* =============================
   NETWORK SCAN
============================= */

function findContracts(ns) {
  const visited = new Set();
  const stack = ["home"];
  const found = [];

  while (stack.length > 0) {
    const host = stack.pop();
    if (!visited.has(host)) {
      visited.add(host);

      for (const file of ns.ls(host, ".cct")) {
        found.push({ server: host, file });
      }

      for (const neighbor of ns.scan(host)) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
  }

  return found;
}