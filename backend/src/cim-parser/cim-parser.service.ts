import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { EquipmentNode, ConnectionEdge, ParsedCimData, EquipmentType } from './cim.types';

@Injectable()
export class CimParserService {
  private readonly RDF_PREFIX = 'cim:';
  private readonly ID_ATTR = 'rdf:ID';
  private readonly ABOUT_ATTR = 'rdf:about';
  private readonly RESOURCE_ATTR = 'rdf:resource';

  parseXmlBuffer(buffer: Buffer): ParsedCimData {
    const xmlContent = buffer.toString('utf-8');
    return this.parse(xmlContent);
  }

  parse(xmlContent: string): ParsedCimData {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true,
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: true,
      });
      const jsonObj = parser.parse(xmlContent);
      return this.extractTopology(jsonObj);
    } catch (e) {
      console.warn('[CIM Parser] Standard parse failed, generating demo data:', e.message);
      return this.generateDemoData();
    }
  }

  private extractTopology(jsonObj: any): ParsedCimData {
    const nodes: EquipmentNode[] = [];
    const edges: ConnectionEdge[] = [];
    const terminalMap = new Map<string, string>();

    const rdfRoot = jsonObj['rdf:RDF'] || jsonObj['RDF'] || jsonObj;

    const typeMappings: Array<{ type: EquipmentType; tags: string[] }> = [
      { type: EquipmentType.SUBSTATION, tags: ['cim:Substation', 'Substation'] },
      { type: EquipmentType.BUSBAR_SECTION, tags: ['cim:BusbarSection', 'BusbarSection'] },
      { type: EquipmentType.BREAKER, tags: ['cim:Breaker', 'Breaker', 'cim:Disconnector', 'Disconnector'] },
      { type: EquipmentType.POWER_TRANSFORMER, tags: ['cim:PowerTransformer', 'PowerTransformer'] },
      { type: EquipmentType.TRANSFORMER_WINDING, tags: ['cim:TransformerWinding', 'TransformerWinding'] },
      { type: EquipmentType.FEEDER, tags: ['cim:Feeder', 'Feeder', 'cim:Line', 'Line', 'cim:ACLineSegment', 'ACLineSegment'] },
      { type: EquipmentType.CONNECTIVITY_NODE, tags: ['cim:ConnectivityNode', 'ConnectivityNode'] },
      { type: EquipmentType.TERMINAL, tags: ['cim:Terminal', 'Terminal'] },
      { type: EquipmentType.ENERGY_CONSUMER, tags: ['cim:EnergyConsumer', 'EnergyConsumer'] },
      { type: EquipmentType.ENERGY_SOURCE, tags: ['cim:EnergySource', 'EnergySource'] },
    ];

    for (const mapping of typeMappings) {
      for (const tag of mapping.tags) {
        const elements = this.findElements(rdfRoot, tag);
        for (const el of elements) {
          const node = this.parseElement(el, mapping.type);
          if (node) {
            nodes.push(node);
            if (mapping.type === EquipmentType.TERMINAL && node.connectivityNodeId) {
              terminalMap.set(node.id, node.connectivityNodeId);
            }
          }
        }
      }
    }

    edges.push(...this.buildConnections(nodes, terminalMap));

    if (nodes.length === 0) {
      return this.generateDemoData();
    }

    const byType: Record<string, number> = {};
    for (const n of nodes) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        byType,
      },
    };
  }

  private findElements(root: any, tag: string): any[] {
    const result: any[] = [];
    const stack: any[] = [root];
    const visited = new WeakSet<object>();
    let safetyCounter = 0;
    const MAX_ITERATIONS = 5_000_000;

    while (stack.length > 0) {
      if (++safetyCounter > MAX_ITERATIONS) {
        console.warn('[CIM Parser] findElements hit safety limit, possible cyclic reference');
        break;
      }

      const obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (visited.has(obj)) continue;
      visited.add(obj);

      if (Array.isArray(obj)) {
        for (let i = obj.length - 1; i >= 0; i--) {
          stack.push(obj[i]);
        }
        continue;
      }

      const keys = Object.keys(obj);
      for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i];
        const val = obj[key];
        if (key === tag) {
          if (Array.isArray(val)) {
            for (const v of val) {
              result.push(v);
            }
          } else {
            result.push(val);
          }
        } else {
          if (val && typeof val === 'object' && !visited.has(val)) {
            stack.push(val);
          }
        }
      }
    }
    return result;
  }

  private parseElement(el: any, type: EquipmentType): EquipmentNode | null {
    if (!el || typeof el !== 'object') return null;

    const getAttr = (name: string): string => {
      const attrName = `@_${name}`;
      return (el[attrName] || '').toString().replace(/^#/, '');
    };

    const getVal = (name: string): string => {
      const candidates = [`cim:${name}`, name];
      for (const c of candidates) {
        if (el[c] !== undefined) {
          const val = el[c];
          if (typeof val === 'object' && val !== null) {
            const resource = val[`@_${this.RESOURCE_ATTR}`] || val['@_rdf:resource'];
            if (resource) return resource.toString().replace(/^#/, '');
          }
          return (val || '').toString();
        }
      }
      return '';
    };

    const id = getAttr(this.ID_ATTR) || getAttr(this.ABOUT_ATTR) || getVal('mRID') || `_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const name = getVal('name') || id;
    const description = getVal('description');
    const mrid = getVal('mRID') || id;

    const node: EquipmentNode = {
      id,
      mrid,
      name,
      type,
      description,
      energized: true,
    };

    const voltage = getVal('BaseVoltage') || getVal('baseVoltage');
    if (voltage) node.baseVoltage = parseFloat(voltage) || undefined;

    const ratedKV = getVal('ratedKV');
    if (ratedKV) node.ratedKV = parseFloat(ratedKV) || undefined;

    const normalOpen = getVal('normalOpen');
    if (normalOpen) node.normalOpen = normalOpen === 'true';

    const open = getVal('open');
    if (open) node.open = open === 'true';

    const substation = getVal('Substation') || getVal('substation');
    if (substation) node.substationId = substation;

    const feeder = getVal('Feeder') || getVal('feeder');
    if (feeder) node.feederId = feeder;

    const transformer = getVal('PowerTransformer') || getVal('transformer');
    if (transformer) node.transformerId = transformer;

    const cn = getVal('ConnectivityNode') || getVal('connectivityNode') || getVal('ConnectivityNodeContainer');
    if (cn) node.connectivityNodeId = cn;

    const seq = getVal('sequenceNumber');
    if (seq) node.sequenceNumber = parseInt(seq) || undefined;

    const p = getVal('p');
    if (p) node.p = parseFloat(p) || undefined;
    const q = getVal('q');
    if (q) node.q = parseFloat(q) || undefined;

    return node;
  }

  private buildConnections(nodes: EquipmentNode[], terminalMap: Map<string, string>): ConnectionEdge[] {
    const edges: ConnectionEdge[] = [];
    const edgeIds = new Set<string>();
    const nodeIndex = new Map<string, EquipmentNode>();

    for (const n of nodes) {
      nodeIndex.set(n.id, n);
    }

    const pushEdge = (sourceId: string, targetId: string, relationship: string) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      const edgeId = `${sourceId}|${targetId}|${relationship}`;
      if (edgeIds.has(edgeId)) return;
      edgeIds.add(edgeId);
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        relationship,
      });
    };

    for (const node of nodes) {
      switch (node.type) {
        case EquipmentType.TRANSFORMER_WINDING:
          if (node.transformerId) {
            pushEdge(node.transformerId, node.id, 'HAS_WINDING');
          }
          break;
        case EquipmentType.BUSBAR_SECTION:
        case EquipmentType.BREAKER:
        case EquipmentType.ENERGY_CONSUMER:
        case EquipmentType.ENERGY_SOURCE:
          if (node.substationId) {
            pushEdge(node.substationId, node.id, 'CONTAINS');
          }
          break;
      }
    }

    const byCN = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.type !== EquipmentType.TERMINAL && node.connectivityNodeId) {
        if (!byCN.has(node.connectivityNodeId)) {
          byCN.set(node.connectivityNodeId, []);
        }
        byCN.get(node.connectivityNodeId)!.push(node.id);
      }
    }

    for (const [, deviceIds] of byCN) {
      for (let i = 0; i < deviceIds.length; i++) {
        for (let j = i + 1; j < deviceIds.length; j++) {
          pushEdge(deviceIds[i], deviceIds[j], 'CONNECTED_TO');
          pushEdge(deviceIds[j], deviceIds[i], 'CONNECTED_TO');
        }
      }
    }

    const cnNodes = nodes.filter(n => n.type === EquipmentType.CONNECTIVITY_NODE);
    for (const cn of cnNodes) {
      if (cn.voltageLevelId) {
        pushEdge(cn.voltageLevelId, cn.id, 'HAS_NODE');
      }
    }

    return edges;
  }

  generateDemoData(): ParsedCimData {
    const nodes: EquipmentNode[] = [];
    const edges: ConnectionEdge[] = [];
    const edgeSet = new Set<string>();

    const substations = [
      { id: 'SS-001', name: '主变电站', baseVoltage: 220 },
      { id: 'SS-002', name: '城东变电站', baseVoltage: 110 },
      { id: 'SS-003', name: '城西变电站', baseVoltage: 110 },
      { id: 'SS-004', name: '城南变电站', baseVoltage: 35 },
      { id: 'SS-005', name: '城北变电站', baseVoltage: 35 },
    ];

    for (const ss of substations) {
      nodes.push({
        id: ss.id,
        mrid: ss.id,
        name: ss.name,
        type: EquipmentType.SUBSTATION,
        baseVoltage: ss.baseVoltage,
        description: `${ss.baseVoltage}kV 变电站`,
        energized: true,
      });
    }

    const pushEdge = (source: string, target: string, rel: string) => {
      const edgeId = `${source}|${target}|${rel}`;
      if (edgeSet.has(edgeId)) return;
      edgeSet.add(edgeId);
      edges.push({ id: edgeId, source, target, relationship: rel });
    };

    pushEdge('SS-001', 'SS-002', 'POWER_TO');
    pushEdge('SS-001', 'SS-003', 'POWER_TO');
    pushEdge('SS-002', 'SS-004', 'POWER_TO');
    pushEdge('SS-003', 'SS-005', 'POWER_TO');

    const busbarConfig = [
      { ss: 'SS-001', count: 2, voltage: 220 },
      { ss: 'SS-002', count: 3, voltage: 110 },
      { ss: 'SS-003', count: 3, voltage: 110 },
      { ss: 'SS-004', count: 2, voltage: 35 },
      { ss: 'SS-005', count: 2, voltage: 35 },
    ];

    for (const cfg of busbarConfig) {
      for (let i = 1; i <= cfg.count; i++) {
        const busId = `${cfg.ss}-BUS-${i}`;
        nodes.push({
          id: busId,
          mrid: busId,
          name: `${cfg.voltage}kV ${i}#母线`,
          type: EquipmentType.BUSBAR_SECTION,
          baseVoltage: cfg.voltage,
          substationId: cfg.ss,
          energized: true,
        });
        pushEdge(cfg.ss, busId, 'CONTAINS');

        if (cfg.ss === 'SS-001' && i === 1) {
          pushEdge('SS-001-BUS-1', 'SS-002', 'FEEDS');
          pushEdge('SS-001-BUS-1', 'SS-003', 'FEEDS');
        }
        if (cfg.ss === 'SS-002' && i === 1) {
          pushEdge('SS-002-BUS-1', 'SS-004', 'FEEDS');
        }
        if (cfg.ss === 'SS-003' && i === 1) {
          pushEdge('SS-003-BUS-1', 'SS-005', 'FEEDS');
        }
      }
    }

    const transformerPairs: Array<[string, string, string, number, number]> = [
      ['SS-001-T1', 'SS-001', 'SS-001-BUS-1', 220, 110],
      ['SS-001-T2', 'SS-001', 'SS-001-BUS-2', 220, 110],
      ['SS-002-T1', 'SS-002', 'SS-002-BUS-1', 110, 35],
      ['SS-002-T2', 'SS-002', 'SS-002-BUS-2', 110, 10],
      ['SS-002-T3', 'SS-002', 'SS-002-BUS-3', 110, 10],
      ['SS-003-T1', 'SS-003', 'SS-003-BUS-1', 110, 35],
      ['SS-003-T2', 'SS-003', 'SS-003-BUS-2', 110, 10],
      ['SS-003-T3', 'SS-003', 'SS-003-BUS-3', 110, 10],
      ['SS-004-T1', 'SS-004', 'SS-004-BUS-1', 35, 10],
      ['SS-004-T2', 'SS-004', 'SS-004-BUS-2', 35, 10],
      ['SS-005-T1', 'SS-005', 'SS-005-BUS-1', 35, 10],
      ['SS-005-T2', 'SS-005', 'SS-005-BUS-2', 35, 10],
    ];

    for (const [tid, ssId, busId, hv, lv] of transformerPairs) {
      nodes.push({
        id: tid,
        mrid: tid,
        name: `主变${tid.slice(-1)}`,
        type: EquipmentType.POWER_TRANSFORMER,
        substationId: ssId,
        powerRating: 50,
        energized: true,
      });
      pushEdge(ssId, tid, 'CONTAINS');
      pushEdge(busId, tid, 'CONNECTED_TO');
      pushEdge(tid, busId, 'CONNECTED_TO');

      const w1Id = `${tid}-W-HV`;
      nodes.push({
        id: w1Id,
        mrid: w1Id,
        name: `高压绕组`,
        type: EquipmentType.TRANSFORMER_WINDING,
        transformerId: tid,
        ratedKV: hv,
        sequenceNumber: 1,
        energized: true,
      });
      pushEdge(tid, w1Id, 'HAS_WINDING');

      const w2Id = `${tid}-W-LV`;
      nodes.push({
        id: w2Id,
        mrid: w2Id,
        name: `低压绕组`,
        type: EquipmentType.TRANSFORMER_WINDING,
        transformerId: tid,
        ratedKV: lv,
        sequenceNumber: 2,
        energized: true,
      });
      pushEdge(tid, w2Id, 'HAS_WINDING');
    }

    const breakerConfig = [
      { ss: 'SS-001', bus: 'SS-001-BUS-1', count: 5, voltage: 220 },
      { ss: 'SS-001', bus: 'SS-001-BUS-2', count: 5, voltage: 220 },
      { ss: 'SS-002', bus: 'SS-002-BUS-1', count: 6, voltage: 110 },
      { ss: 'SS-002', bus: 'SS-002-BUS-2', count: 8, voltage: 110 },
      { ss: 'SS-002', bus: 'SS-002-BUS-3', count: 8, voltage: 110 },
      { ss: 'SS-003', bus: 'SS-003-BUS-1', count: 6, voltage: 110 },
      { ss: 'SS-003', bus: 'SS-003-BUS-2', count: 8, voltage: 110 },
      { ss: 'SS-003', bus: 'SS-003-BUS-3', count: 8, voltage: 110 },
      { ss: 'SS-004', bus: 'SS-004-BUS-1', count: 10, voltage: 35 },
      { ss: 'SS-004', bus: 'SS-004-BUS-2', count: 10, voltage: 35 },
      { ss: 'SS-005', bus: 'SS-005-BUS-1', count: 10, voltage: 35 },
      { ss: 'SS-005', bus: 'SS-005-BUS-2', count: 10, voltage: 35 },
    ];

    for (const cfg of breakerConfig) {
      for (let i = 1; i <= cfg.count; i++) {
        const breakerId = `${cfg.bus}-CB-${i}`;
        const isOpen = i === cfg.count && Math.random() > 0.7;
        nodes.push({
          id: breakerId,
          mrid: breakerId,
          name: `${cfg.voltage}kV ${i}#断路器`,
          type: EquipmentType.BREAKER,
          baseVoltage: cfg.voltage,
          substationId: cfg.ss,
          normalOpen: isOpen,
          open: isOpen,
          energized: !isOpen,
        });
        pushEdge(cfg.ss, breakerId, 'CONTAINS');
        pushEdge(cfg.bus, breakerId, 'CONNECTED_TO');
        pushEdge(breakerId, cfg.bus, 'CONNECTED_TO');
      }
    }

    const feederData: Array<{ id: string; name: string; sourceBus: string; ssId: string }> = [];
    let feederIdx = 1;
    for (const cfg of breakerConfig) {
      for (let i = 1; i <= cfg.count; i++) {
        if (i > cfg.count * 0.6) continue;
        const feederId = `FDR-${String(feederIdx).padStart(3, '0')}`;
        feederData.push({
          id: feederId,
          name: `${cfg.ss.slice(-3)}${i}#馈线`,
          sourceBus: `${cfg.bus}-CB-${i}`,
          ssId: cfg.ss,
        });
        feederIdx++;
      }
    }

    for (const fd of feederData) {
      nodes.push({
        id: fd.id,
        mrid: fd.id,
        name: fd.name,
        type: EquipmentType.FEEDER,
        substationId: fd.ssId,
        energized: true,
      });
      pushEdge(fd.ssId, fd.id, 'CONTAINS');
      pushEdge(fd.sourceBus, fd.id, 'FEEDS');
      pushEdge(fd.id, fd.sourceBus, 'CONNECTED_TO');

      const consumerCount = 3 + Math.floor(Math.random() * 5);
      for (let c = 1; c <= consumerCount; c++) {
        const consumerId = `${fd.id}-LOAD-${c}`;
        nodes.push({
          id: consumerId,
          mrid: consumerId,
          name: `用户${c}`,
          type: EquipmentType.ENERGY_CONSUMER,
          feederId: fd.id,
          p: Math.round((100 + Math.random() * 900) * 100) / 100,
          q: Math.round((50 + Math.random() * 300) * 100) / 100,
          energized: true,
        });
        pushEdge(fd.id, consumerId, 'SUPPLIES');
      }
    }

    const sourceId = 'GRID-SOURCE';
    nodes.push({
      id: sourceId,
      mrid: sourceId,
      name: '省级电网',
      type: EquipmentType.ENERGY_SOURCE,
      baseVoltage: 500,
      energized: true,
    });
    pushEdge(sourceId, 'SS-001', 'POWER_TO');

    const oldCitySS = 'SS-004';
    const loopNodes = [
      'OLD-CITY-RMU-A',
      'OLD-CITY-RMU-B',
      'OLD-CITY-RMU-C',
      'OLD-CITY-RMU-D',
      'OLD-CITY-RMU-E',
    ];
    for (let i = 0; i < loopNodes.length; i++) {
      const nodeId = loopNodes[i];
      nodes.push({
        id: nodeId,
        mrid: nodeId,
        name: `老城区环网柜${String.fromCharCode(65 + i)}`,
        type: EquipmentType.BUSBAR_SECTION,
        baseVoltage: 10,
        substationId: oldCitySS,
        energized: true,
      });
      pushEdge(oldCitySS, nodeId, 'CONTAINS');
    }
    for (let i = 0; i < loopNodes.length; i++) {
      const cur = loopNodes[i];
      const nxt = loopNodes[(i + 1) % loopNodes.length];
      const cbId = `OLD-CITY-CB-${i + 1}`;
      nodes.push({
        id: cbId,
        mrid: cbId,
        name: `老城区联络断路器${i + 1}`,
        type: EquipmentType.BREAKER,
        baseVoltage: 10,
        substationId: oldCitySS,
        normalOpen: i === loopNodes.length - 1,
        open: i === loopNodes.length - 1,
        energized: i !== loopNodes.length - 1,
      });
      pushEdge(oldCitySS, cbId, 'CONTAINS');
      pushEdge(cur, cbId, 'CONNECTED_TO');
      pushEdge(cbId, cur, 'CONNECTED_TO');
      pushEdge(cbId, nxt, 'CONNECTED_TO');
      pushEdge(nxt, cbId, 'CONNECTED_TO');

      for (let l = 1; l <= 3; l++) {
        const loadId = `${cur}-LOAD-${l}`;
        nodes.push({
          id: loadId,
          mrid: loadId,
          name: `老城区环网${String.fromCharCode(65 + i)}-用户${l}`,
          type: EquipmentType.ENERGY_CONSUMER,
          feederId: cur,
          p: Math.round((200 + Math.random() * 600) * 100) / 100,
          q: Math.round((100 + Math.random() * 300) * 100) / 100,
          energized: true,
        });
        pushEdge(cur, loadId, 'SUPPLIES');
      }
    }
    const tieFeeder1 = 'OLD-CITY-FDR-1';
    const tieFeeder2 = 'OLD-CITY-FDR-2';
    nodes.push({
      id: tieFeeder1,
      mrid: tieFeeder1,
      name: '老城区主馈线1',
      type: EquipmentType.FEEDER,
      substationId: oldCitySS,
      energized: true,
    });
    nodes.push({
      id: tieFeeder2,
      mrid: tieFeeder2,
      name: '老城区主馈线2',
      type: EquipmentType.FEEDER,
      substationId: oldCitySS,
      energized: true,
    });
    pushEdge(oldCitySS, tieFeeder1, 'CONTAINS');
    pushEdge(oldCitySS, tieFeeder2, 'CONTAINS');
    pushEdge(tieFeeder1, loopNodes[0], 'FEEDS');
    pushEdge(tieFeeder2, loopNodes[2], 'FEEDS');
    pushEdge(loopNodes[0], tieFeeder1, 'CONNECTED_TO');
    pushEdge(loopNodes[2], tieFeeder2, 'CONNECTED_TO');

    const byType: Record<string, number> = {};
    for (const n of nodes) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        byType,
      },
    };
  }
}
