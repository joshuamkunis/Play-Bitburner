/** @param {NS} ns **/
export async function main(ns) {

    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const prices = JSON.parse(ns.read(inputFile));

    if (!prices || prices.length === 0) {
        await ns.write(outputFile, JSON.stringify(0), "w");
        return;
    }

    let minPrice = prices[0];
    let maxProfit = 0;

    for (let i = 1; i < prices.length; i++) {
        const price = prices[i];

        const profit = price - minPrice;
        if (profit > maxProfit) {
            maxProfit = profit;
        }

        if (price < minPrice) {
            minPrice = price;
        }
    }

    await ns.write(outputFile, JSON.stringify(maxProfit), "w");
}