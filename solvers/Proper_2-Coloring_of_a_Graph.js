/** @param {NS} ns **/
export async function main(ns) {
    const inputFile = ns.args[0];
    const outputFile = ns.args[1];

    const data = JSON.parse(ns.read(inputFile));

    if (!data || data.length === 0) {
        await ns.write(outputFile, JSON.stringify([]), "w");
        return;
    }

    // Determine if data is adjacency list or edge list
    let graph;
    
    if (Array.isArray(data[0]) && typeof data[0][0] === 'number') {
        // Could be adjacency list or edge list - check format
        // If it's an edge list, elements are [node, node] pairs
        // If it's an adjacency list, it has length equal to number of nodes
        
        // Try to build from edge list format
        let maxNode = 0;
        for (const edge of data) {
            if (Array.isArray(edge) && edge.length === 2) {
                maxNode = Math.max(maxNode, edge[0], edge[1]);
            }
        }
        const n = maxNode + 1;
        graph = Array.from({ length: n }, () => []);
        
        for (const edge of data) {
            if (Array.isArray(edge) && edge.length === 2) {
                const [a, b] = edge;
                graph[a].push(b);
                graph[b].push(a);
            }
        }
    } else {
        // Assume it's already an adjacency list
        graph = data;
    }

    const n = graph.length;
    const colors = new Array(n).fill(-1); // -1 = uncolored, 0/1 = color

    // Try to color the graph using BFS
    for (let start = 0; start < n; start++) {
        if (colors[start] !== -1) continue; // already colored

        const queue = [start];
        colors[start] = 0;

        while (queue.length > 0) {
            const node = queue.shift();
            const nodeColor = colors[node];

            // Check all neighbors
            if (graph[node] && Array.isArray(graph[node])) {
                for (const neighbor of graph[node]) {
                    if (colors[neighbor] === -1) {
                        // Color neighbor with opposite color
                        colors[neighbor] = 1 - nodeColor;
                        queue.push(neighbor);
                    } else if (colors[neighbor] === nodeColor) {
                        // Same color as current node - not 2-colorable
                        await ns.write(outputFile, JSON.stringify([]), "w");
                        return;
                    }
                }
            }
        }
    }

    // Successfully colored
    await ns.write(outputFile, JSON.stringify(colors), "w");
}