/** @param {NS} ns */
export async function main(ns) {
    const budgetPercent = ns.args[0] ? (ns.args[0]) : 100;
    const budget = (ns.getPlayer().money * budgetPercent) / 100;
    let spent = 0;

    // Buy new hacknet nodes first
    while (spent < budget) {
        const cost = ns.hacknet.getPurchaseNodeCost();
        if (spent + cost <= budget) {
            ns.hacknet.purchaseNode();
            spent += cost;
            ns.print(`Purchased node. Total spent: $${ns.formatNumber(spent)}`);
        } else {
            break;
        }
    }

    // Upgrade existing nodes for ROI
    let upgraded = true;
    while (upgraded && spent < budget) {
        upgraded = false;
        const numNodes = ns.hacknet.numNodes();

        for (let i = 0; i < numNodes; i++) {
            const node = ns.hacknet.getNodeStats(i);
            
            // Prioritize level, then RAM, then cores
            const upgrades = [
                { cost: ns.hacknet.getLevelUpgradeCost(i, 1), type: "level" },
                { cost: ns.hacknet.getRamUpgradeCost(i, 1), type: "ram" },
                { cost: ns.hacknet.getCoreUpgradeCost(i, 1), type: "core" }
            ].sort((a, b) => a.cost - b.cost);

            for (const upgrade of upgrades) {
                if (spent + upgrade.cost <= budget) {
                    if (upgrade.type === "level") ns.hacknet.upgradeLevel(i, 1);
                    else if (upgrade.type === "ram") ns.hacknet.upgradeRam(i, 1);
                    else ns.hacknet.upgradeCore(i, 1);
                    
                    spent += upgrade.cost;
                    upgraded = true;
                    break;
                }
            }
        }
    }

    ns.tprint(`Hacknet optimization complete. Total spent: $${ns.formatNumber(spent)}`);
}