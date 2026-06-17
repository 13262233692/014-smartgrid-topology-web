import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { EquipmentNode, ConnectionEdge, ParsedCimData, EquipmentType } from '../cim-parser/cim.types';

interface GraphIndex {
  nodes: Map<string, EquipmentNode>;
  edges: Map<string, ConnectionEdge>;
  adjacency: Map<string, ConnectionEdge[]>;
}

@Injectable()
export class TopologyRepository {
  private memoryStore: { nodes: EquipmentNode[]; edges: ConnectionEdge[] } | null = null;
  private memoryIndex: GraphIndex | null = null;
  private readonly MAX_NODES_PER_QUERY = 2000;
  private readonly MAX_ITERATIONS = 100000;

  constructor(private readonly neo4j: Neo4jService) {}

  private buildIndex(nodes: EquipmentNode[], edges: ConnectionEdge[]): GraphIndex {
    const nodeMap = new Map<string, EquipmentNode>();
    const edgeMap = new Map<string, ConnectionEdge>();
    const adjacency = new Map<string, ConnectionEdge[]>();

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

  async saveParsedData(data: ParsedCimData): Promise<boolean> {
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
            const props: Record<string, any> = {};
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
        } catch (e) {
          try { await tx.rollback(); } catch {}
          throw e;
        }
      } finally {
        await session.close();
      }
    } catch (e) {
      console.warn('[TopologyRepository] Neo4j unavailable, using memory store:', e.message);
      return true;
    }
  }

  async findAllSubstations(): Promise<EquipmentNode[]> {
    const idx = await this.ensureIndex();
    if (idx) {
      return Array.from(idx.nodes.values()).filter(n => n.type === EquipmentType.SUBSTATION);
    }

    try {
      const session = this.neo4j.getSession();
      try {
        const result = await session.run('MATCH (n:Substation) RETURN n ORDER BY n.name');
        return result.records.map(r => this.recordToNode(r.get('n')));
      } finally {
        await session.close();
      }
    } catch (e) {
      return [];
    }
  }

  async findNodeById(id: string): Promise<EquipmentNode | null> {
    const idx = await this.ensureIndex();
    if (idx) {
      return idx.nodes.get(id) || null;
    }

    try {
      const session = this.neo4j.getSession();
      try {
        const result = await session.run('MATCH (n {id: $id}) RETURN n LIMIT 1', { id });
        if (result.records.length === 0) return null;
        return this.recordToNode(result.records[0].get('n'));
      } finally {
        await session.close();
      }
    } catch (e) {
      return null;
    }
  }

  private async ensureIndex(): Promise<GraphIndex | null> {
    if (this.memoryIndex) return this.memoryIndex;
    if (this.memoryStore) {
      this.memoryIndex = this.buildIndex(this.memoryStore.nodes, this.memoryStore.edges);
      return this.memoryIndex;
    }

    try {
      const session = this.neo4j.getSession();
      try {
        await this.neo4j.getDriver().verifyConnectivity();

        const nodeResult = await session.run('MATCH (n) RETURN n');
        const edgeResult = await session.run(
          'MATCH (a)-[r]->(b) RETURN r, a.id AS sourceId, b.id AS targetId, type(r) AS relType'
        );

        const nodes: EquipmentNode[] = nodeResult.records.map(r => this.recordToNode(r.get('n'))).filter(Boolean);
        const edges: ConnectionEdge[] = edgeResult.records.map(rec => {
          const r = rec as any;
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
      } finally {
        await session.close();
      }
    } catch (e) {
      return null;
    }
  }

  async findDownstreamTopology(
    rootId: string,
    maxDepth: number = 6
  ): Promise<{ nodes: EquipmentNode[]; edges: ConnectionEdge[]; cycles?: string[][] }> {
    const idx = await this.ensureIndex();
    if (!idx) {
      return { nodes: [], edges: [], cycles: [] };
    }
    return this.bfsWithColoring(idx, rootId, maxDepth);
  }

  private bfsWithColoring(
    idx: GraphIndex,
    rootId: string,
    maxDepth: number
  ): { nodes: EquipmentNode[]; edges: ConnectionEdge[]; cycles: string[][] } {
    const nodeMap = new Map<string, EquipmentNode>();
    const edgeMap = new Map<string, ConnectionEdge>();
    const visited = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const cycles: string[][] = [];
    const cycleNodeSet = new Set<string>();

    const root = idx.nodes.get(rootId);
    if (!root) return { nodes: [], edges: [], cycles: [] };

    const queue: Array<{ id: string; depth: number }> = [];
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

      const current = queue.shift()!;
      const { id, depth } = current;
      if (depth >= maxDepth) continue;

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
        } else {
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
                    (nd as any)._inCycle = true;
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

  private reconstructCycle(
    parent: Map<string, string | null>,
    fromId: string,
    toId: string
  ): string[] {
    const pathA: string[] = [];
    let cur: string | null = fromId;
    while (cur) {
      pathA.push(cur);
      if (cur === toId) break;
      cur = parent.get(cur) || null;
    }

    if (pathA[pathA.length - 1] !== toId) {
      return [];
    }

    return pathA;
  }

  async detectCycles(rootId?: string): Promise<string[][]> {
    const idx = await this.ensureIndex();
    if (!idx) return [];

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack: Array<{ id: string; parent: string | null; path: string[] }> = [];
    const roots = rootId ? [rootId] : Array.from(idx.nodes.keys()).slice(0, 100);

    for (const startId of roots) {
      if (visited.has(startId)) continue;
      stack.push({ id: startId, parent: null, path: [startId] });
      visited.add(startId);

      let iter = 0;
      while (stack.length > 0) {
        if (++iter > this.MAX_ITERATIONS) break;
        const { id, parent: par, path } = stack.pop()!;
        const outgoing = idx.adjacency.get(id) || [];

        for (const edge of outgoing) {
          const target = edge.target;
          if (target === par) continue;

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
          } else {
            visited.add(target);
            stack.push({ id: target, parent: id, path: [...path, target] });
          }
        }
      }
    }

    return cycles;
  }

  async getStats(): Promise<{ totalNodes: number; totalEdges: number; byType: Record<string, number> }> {
    const idx = await this.ensureIndex();
    if (idx) {
      const byType: Record<string, number> = {};
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

        const byType: Record<string, number> = {};
        for (const r of byTypeResult.records) {
          byType[r.get('type')] = r.get('count').toNumber ? r.get('count').toNumber() : r.get('count');
        }

        return {
          totalNodes: nodeCount.records[0].get('count').toNumber ? nodeCount.records[0].get('count').toNumber() : nodeCount.records[0].get('count'),
          totalEdges: edgeCount.records[0].get('count').toNumber ? edgeCount.records[0].get('count').toNumber() : edgeCount.records[0].get('count'),
          byType,
        };
      } finally {
        await session.close();
      }
    } catch (e) {
      return { totalNodes: 0, totalEdges: 0, byType: {} };
    }
  }

  async updateEquipmentStatus(id: string, open: boolean): Promise<EquipmentNode | null> {
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
        const result = await session.run(
          'MATCH (n {id: $id}) SET n.open = $open, n.normalOpen = $open, n.energized = $energized RETURN n',
          { id, open, energized: !open }
        );
        if (result.records.length === 0) return null;
        return this.recordToNode(result.records[0].get('n'));
      } finally {
        await session.close();
      }
    } catch (e) {
      return null;
    }
  }

  private recordToNode(record: any): EquipmentNode {
    if (!record) return null as any;
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
}
