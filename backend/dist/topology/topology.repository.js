"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologyRepository = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const cim_types_1 = require("../cim-parser/cim.types");
let TopologyRepository = class TopologyRepository {
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.memoryStore = null;
        this.memoryIndex = null;
        this.MAX_NODES_PER_QUERY = 2000;
        this.MAX_ITERATIONS = 100000;
    }
    buildIndex(nodes, edges) {
        const nodeMap = new Map();
        const edgeMap = new Map();
        const adjacency = new Map();
        for (const n of nodes) {
            nodeMap.set(n.id, n);
            adjacency.set(n.id, []);
        }
        for (const e of edges) {
            edgeMap.set(e.id, e);
            const list = adjacency.get(e.source) || [];
            list.push(e);
            adjacency.set(e.source, list);
        }
        return { nodes: nodeMap, edges: edgeMap, adjacency };
    }
    async saveParsedData(data) {
        this.memoryStore = { nodes: [...data.nodes], edges: [...data.edges] };
        this.memoryIndex = this.buildIndex(data.nodes, data.edges);
        try {
            const session = this.neo4j.getSession();
            try {
                await this.neo4j.getDriver().verifyConnectivity();
                const tx = session.beginTransaction();
                try {
                    await tx.run('MATCH (n) DETACH DELETE n');
                    for (const node of data.nodes) {
                        const props = {};
                        for (const [k, v] of Object.entries(node)) {
                            if (v !== undefined && v !== null) {
                                props[k] = v;
                            }
                        }
                        const cypher = `
              CREATE (n:\`${node.type}\` {props})
              SET n.id = $id, n.mrid = $mrid, n.name = $name, n.type = $type
            `;
                        await tx.run(cypher, { props, id: node.id, mrid: node.mrid, name: node.name, type: node.type });
                    }
                    for (const edge of data.edges) {
                        const cypher = `
              MATCH (a {id: $sourceId})
              MATCH (b {id: $targetId})
              MERGE (a)-[r:\`${edge.relationship}\`]->(b)
              SET r.id = $edgeId
            `;
                        await tx.run(cypher, {
                            sourceId: edge.source,
                            targetId: edge.target,
                            edgeId: edge.id,
                        });
                    }
                    await tx.commit();
                    return true;
                }
                catch (e) {
                    try {
                        await tx.rollback();
                    }
                    catch { }
                    throw e;
                }
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            console.warn('[TopologyRepository] Neo4j unavailable, using memory store:', e.message);
            return true;
        }
    }
    async findAllSubstations() {
        const idx = await this.ensureIndex();
        if (idx) {
            return Array.from(idx.nodes.values()).filter(n => n.type === cim_types_1.EquipmentType.SUBSTATION);
        }
        try {
            const session = this.neo4j.getSession();
            try {
                const result = await session.run('MATCH (n:Substation) RETURN n ORDER BY n.name');
                return result.records.map(r => this.recordToNode(r.get('n')));
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return [];
        }
    }
    async findNodeById(id) {
        const idx = await this.ensureIndex();
        if (idx) {
            return idx.nodes.get(id) || null;
        }
        try {
            const session = this.neo4j.getSession();
            try {
                const result = await session.run('MATCH (n {id: $id}) RETURN n LIMIT 1', { id });
                if (result.records.length === 0)
                    return null;
                return this.recordToNode(result.records[0].get('n'));
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return null;
        }
    }
    async ensureIndex() {
        if (this.memoryIndex)
            return this.memoryIndex;
        if (this.memoryStore) {
            this.memoryIndex = this.buildIndex(this.memoryStore.nodes, this.memoryStore.edges);
            return this.memoryIndex;
        }
        try {
            const session = this.neo4j.getSession();
            try {
                await this.neo4j.getDriver().verifyConnectivity();
                const nodeResult = await session.run('MATCH (n) RETURN n');
                const edgeResult = await session.run('MATCH (a)-[r]->(b) RETURN r, a.id AS sourceId, b.id AS targetId, type(r) AS relType');
                const nodes = nodeResult.records.map(r => this.recordToNode(r.get('n'))).filter(Boolean);
                const edges = edgeResult.records.map(rec => {
                    const r = rec;
                    return {
                        id: r.get('r')?.properties?.id || `${r.get('sourceId')}|${r.get('relType')}|${r.get('targetId')}`,
                        source: r.get('sourceId'),
                        target: r.get('targetId'),
                        relationship: r.get('relType') || 'CONNECTED_TO',
                    };
                }).filter(e => e.source && e.target);
                this.memoryStore = { nodes, edges };
                this.memoryIndex = this.buildIndex(nodes, edges);
                return this.memoryIndex;
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return null;
        }
    }
    async findDownstreamTopology(rootId, maxDepth = 6) {
        const idx = await this.ensureIndex();
        if (!idx) {
            return { nodes: [], edges: [], cycles: [] };
        }
        return this.bfsWithColoring(idx, rootId, maxDepth);
    }
    bfsWithColoring(idx, rootId, maxDepth) {
        const nodeMap = new Map();
        const edgeMap = new Map();
        const visited = new Map();
        const parent = new Map();
        const cycles = [];
        const cycleNodeSet = new Set();
        const root = idx.nodes.get(rootId);
        if (!root)
            return { nodes: [], edges: [], cycles: [] };
        const queue = [];
        queue.push({ id: rootId, depth: 0 });
        visited.set(rootId, 0);
        parent.set(rootId, null);
        nodeMap.set(rootId, root);
        let iter = 0;
        while (queue.length > 0) {
            if (++iter > this.MAX_ITERATIONS) {
                console.warn('[TopologyRepository] BFS hit iteration safety limit');
                break;
            }
            if (nodeMap.size >= this.MAX_NODES_PER_QUERY) {
                console.warn(`[TopologyRepository] BFS hit node limit (${this.MAX_NODES_PER_QUERY})`);
                break;
            }
            const current = queue.shift();
            const { id, depth } = current;
            if (depth >= maxDepth)
                continue;
            const outgoing = idx.adjacency.get(id) || [];
            for (const edge of outgoing) {
                edgeMap.set(edge.id, edge);
                const target = edge.target;
                if (!visited.has(target)) {
                    const node = idx.nodes.get(target);
                    if (node) {
                        visited.set(target, depth + 1);
                        parent.set(target, id);
                        nodeMap.set(target, node);
                        queue.push({ id: target, depth: depth + 1 });
                    }
                }
                else {
                    if (parent.get(id) !== target) {
                        const cycle = this.reconstructCycle(parent, id, target);
                        if (cycle.length > 0) {
                            const cycleKey = cycle.slice().sort().join('|');
                            if (!cycleNodeSet.has(cycleKey)) {
                                cycleNodeSet.add(cycleKey);
                                cycles.push(cycle);
                                for (const nid of cycle) {
                                    const nd = idx.nodes.get(nid);
                                    if (nd) {
                                        nd._inCycle = true;
                                        nodeMap.set(nid, nd);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return {
            nodes: Array.from(nodeMap.values()),
            edges: Array.from(edgeMap.values()),
            cycles,
        };
    }
    reconstructCycle(parent, fromId, toId) {
        const pathA = [];
        let cur = fromId;
        while (cur) {
            pathA.push(cur);
            if (cur === toId)
                break;
            cur = parent.get(cur) || null;
        }
        if (pathA[pathA.length - 1] !== toId) {
            return [];
        }
        return pathA;
    }
    async detectCycles(rootId) {
        const idx = await this.ensureIndex();
        if (!idx)
            return [];
        const cycles = [];
        const visited = new Set();
        const stack = [];
        const roots = rootId ? [rootId] : Array.from(idx.nodes.keys()).slice(0, 100);
        for (const startId of roots) {
            if (visited.has(startId))
                continue;
            stack.push({ id: startId, parent: null, path: [startId] });
            visited.add(startId);
            let iter = 0;
            while (stack.length > 0) {
                if (++iter > this.MAX_ITERATIONS)
                    break;
                const { id, parent: par, path } = stack.pop();
                const outgoing = idx.adjacency.get(id) || [];
                for (const edge of outgoing) {
                    const target = edge.target;
                    if (target === par)
                        continue;
                    if (visited.has(target)) {
                        const pos = path.indexOf(target);
                        if (pos >= 0) {
                            const cycle = path.slice(pos);
                            if (cycle.length >= 3) {
                                const key = cycle.slice().sort().join('|');
                                if (!cycles.some(c => c.slice().sort().join('|') === key)) {
                                    cycles.push(cycle);
                                }
                            }
                        }
                    }
                    else {
                        visited.add(target);
                        stack.push({ id: target, parent: id, path: [...path, target] });
                    }
                }
            }
        }
        return cycles;
    }
    async getStats() {
        const idx = await this.ensureIndex();
        if (idx) {
            const byType = {};
            for (const n of idx.nodes.values()) {
                byType[n.type] = (byType[n.type] || 0) + 1;
            }
            return {
                totalNodes: idx.nodes.size,
                totalEdges: idx.edges.size,
                byType,
            };
        }
        try {
            const session = this.neo4j.getSession();
            try {
                const nodeCount = await session.run('MATCH (n) RETURN count(n) AS count');
                const edgeCount = await session.run('MATCH ()-[r]->() RETURN count(r) AS count');
                const byTypeResult = await session.run('MATCH (n) RETURN n.type AS type, count(n) AS count ORDER BY count DESC');
                const byType = {};
                for (const r of byTypeResult.records) {
                    byType[r.get('type')] = r.get('count').toNumber ? r.get('count').toNumber() : r.get('count');
                }
                return {
                    totalNodes: nodeCount.records[0].get('count').toNumber ? nodeCount.records[0].get('count').toNumber() : nodeCount.records[0].get('count'),
                    totalEdges: edgeCount.records[0].get('count').toNumber ? edgeCount.records[0].get('count').toNumber() : edgeCount.records[0].get('count'),
                    byType,
                };
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return { totalNodes: 0, totalEdges: 0, byType: {} };
        }
    }
    async updateEquipmentStatus(id, open) {
        const idx = await this.ensureIndex();
        if (idx) {
            const node = idx.nodes.get(id);
            if (node) {
                node.open = open;
                node.normalOpen = open;
                node.energized = !open;
                return node;
            }
            return null;
        }
        try {
            const session = this.neo4j.getSession();
            try {
                const result = await session.run('MATCH (n {id: $id}) SET n.open = $open, n.normalOpen = $open, n.energized = $energized RETURN n', { id, open, energized: !open });
                if (result.records.length === 0)
                    return null;
                return this.recordToNode(result.records[0].get('n'));
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return null;
        }
    }
    recordToNode(record) {
        if (!record)
            return null;
        const props = record.properties || record;
        return {
            id: props.id,
            mrid: props.mrid || props.id,
            name: props.name || props.id,
            type: props.type,
            description: props.description,
            baseVoltage: props.baseVoltage ? (props.baseVoltage.toNumber ? props.baseVoltage.toNumber() : props.baseVoltage) : undefined,
            energized: props.energized !== undefined ? (props.energized.toNumber ? props.energized.toNumber() === 1 : props.energized) : true,
            normalOpen: props.normalOpen !== undefined ? (props.normalOpen.toNumber ? props.normalOpen.toNumber() === 1 : props.normalOpen) : undefined,
            open: props.open !== undefined ? (props.open.toNumber ? props.open.toNumber() === 1 : props.open) : undefined,
            ratedKV: props.ratedKV ? (props.ratedKV.toNumber ? props.ratedKV.toNumber() : props.ratedKV) : undefined,
            powerRating: props.powerRating ? (props.powerRating.toNumber ? props.powerRating.toNumber() : props.powerRating) : undefined,
            p: props.p ? (props.p.toNumber ? props.p.toNumber() : props.p) : undefined,
            q: props.q ? (props.q.toNumber ? props.q.toNumber() : props.q) : undefined,
            substationId: props.substationId,
            feederId: props.feederId,
            transformerId: props.transformerId,
            voltageLevelId: props.voltageLevelId,
            sequenceNumber: props.sequenceNumber ? (props.sequenceNumber.toNumber ? props.sequenceNumber.toNumber() : props.sequenceNumber) : undefined,
            connectivityNodeId: props.connectivityNodeId,
        };
    }
};
exports.TopologyRepository = TopologyRepository;
exports.TopologyRepository = TopologyRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], TopologyRepository);
//# sourceMappingURL=topology.repository.js.map