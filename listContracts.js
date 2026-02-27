/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const contracts = findContracts(ns);

  if (contracts.length === 0) {
    ns.tprint("No contracts found.");
    return;
  }

  ns.tprint("╔════════════════════════════════════════════════════════════════╗");
  ns.tprint("║                      AVAILABLE CONTRACTS                       ║");
  ns.tprint("╠════════════════════════════════════════════════════════════════╣");
  ns.tprint("║ Server              │ Contract Type                              ║");
  ns.tprint("╠════════════════════════════════════════════════════════════════╣");

  for (const c of contracts) {
    const type = ns.codingcontract.getContractType(c.file, c.server);
    const tries = ns.codingcontract.getNumTriesRemaining(c.file, c.server);

    const serverPad = c.server.padEnd(19);
    const typePad = type.padEnd(41);

    ns.tprint(`║ ${serverPad} │ ${typePad} ║`);
    ns.tprint(`║   File: ${c.file.padEnd(54)} ║`);
    ns.tprint(`║   Tries remaining: ${tries.toString().padEnd(41)} ║`);
    ns.tprint("╠════════════════════════════════════════════════════════════════╣");
  }

  ns.tprint(`║ Total: ${contracts.length.toString().padEnd(56)} ║`);
  ns.tprint("╚════════════════════════════════════════════════════════════════╝");
}

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
