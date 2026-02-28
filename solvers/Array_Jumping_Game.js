/** @param {NS} ns **/
export async function main(ns) {
  const inputFile = ns.args[0];
  const outputFile = ns.args[1];

  const raw = ns.read(inputFile).trim();
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    // Fallback: assume comma-separated list
    arr = raw.split(/\s*,\s*/).map(x => Number(x));
  }

  // Greedy reachable range algorithm
  let maxReach = 0;
  for (let i = 0; i < arr.length; i++) {
    if (i > maxReach) {
      // Can't reach this index
      await ns.write(outputFile, "0", "w");
      return;
    }
    maxReach = Math.max(maxReach, i + Number(arr[i]));
    if (maxReach >= arr.length - 1) {
      await ns.write(outputFile, "1", "w");
      return;
    }
  }

  // If loop finishes without reaching last index
  await ns.write(outputFile, "0", "w");
}
