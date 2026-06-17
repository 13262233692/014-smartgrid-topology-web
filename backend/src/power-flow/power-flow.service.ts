import { Injectable, OnModuleInit } from '@nestjs/common';
import { NewtonRaphsonPowerFlow, buildPowerFlowSystemFromTopology } from './newton-raphson';
import { TopologyRepository } from '../topology/topology.repository';
import {
  PowerFlowResult,
  PowerFlowBus,
  PowerFlowBranch,
  LowVoltageAlert,
  ScadaDataPoint,
  ScadaBatch,
} from './power-flow.types';

@Injectable()
export class PowerFlowService implements OnModuleInit {
  private solver: NewtonRaphsonPowerFlow;
  private lastResult: PowerFlowResult | null = null;
  private currentBuses: PowerFlowBus[] = [];
  private currentBranches: PowerFlowBranch[] = [];
  private scadaCache = new Map<string, ScadaDataPoint>();

  constructor(private readonly topologyRepo: TopologyRepository) {
    this.solver = new NewtonRaphsonPowerFlow({
      maxIterations: 50,
      tolerance: 1e-4,
      lowVoltageThreshold: 0.95,
      baseMVA: 10,
    });
  }

  async onModuleInit() {}

  async rebuildSystem(substationId?: string): Promise<boolean> {
    try {
      const repo = this.topologyRepo as any;
      const idx = await (repo.ensureIndex ? repo.ensureIndex() : null);
      if (!idx) return false;

      let nodes: any[];
      let edges: any[];

      if (substationId) {
        const result = await this.topologyRepo.findDownstreamTopology(substationId, 10);
        nodes = result.nodes;
        edges = result.edges;
      } else {
        nodes = Array.from(idx.nodes.values()) as any[];
        edges = Array.from(idx.edges.values()) as any[];
      }

      const { buses, branches } = buildPowerFlowSystemFromTopology(nodes, edges);
      this.currentBuses = buses;
      this.currentBranches = branches;
      return true;
    } catch (e) {
      console.warn('[PowerFlow] rebuildSystem failed:', e.message);
      return false;
    }
  }

  async applyScadaData(dataPoints: ScadaDataPoint[]): Promise<void> {
    for (const dp of dataPoints) {
      this.scadaCache.set(dp.nodeId, dp);
      const bus = this.currentBuses.find(b => b.id === dp.nodeId);
      if (bus) {
        if (dp.realPower !== undefined) bus.realPower = dp.realPower;
        if (dp.reactivePower !== undefined) bus.reactivePower = dp.reactivePower;
        if (dp.voltageMagnitude !== undefined) bus.voltageMagnitude = dp.voltageMagnitude;
      }
    }
  }

  async solve(): Promise<PowerFlowResult | null> {
    if (this.currentBuses.length === 0) {
      const ok = await this.rebuildSystem();
      if (!ok || this.currentBuses.length === 0) return null;
    }

    const result = this.solver.solve(this.currentBuses, this.currentBranches);
    this.lastResult = result;

    for (const bus of result.buses.values()) {
      const local = this.currentBuses.find(b => b.id === bus.id);
      if (local) {
        local.voltageMagnitude = bus.voltageMagnitude;
        local.voltageAngle = bus.voltageAngle;
      }
    }

    return result;
  }

  getLastResult(): PowerFlowResult | null {
    return this.lastResult;
  }

  getLowVoltageAlerts(): LowVoltageAlert[] {
    return this.lastResult?.lowVoltageNodes || [];
  }

  getNodeVoltage(nodeId: string): number | null {
    return this.lastResult?.buses.get(nodeId)?.voltageMagnitude || null;
  }

  handleScadaBatch(batch: ScadaBatch): Promise<void> {
    return this.applyScadaData(batch.dataPoints);
  }

  getScadaSnapshot(): ScadaDataPoint[] {
    return Array.from(this.scadaCache.values());
  }

  clearCache(): void {
    this.scadaCache.clear();
    this.lastResult = null;
    this.currentBuses = [];
    this.currentBranches = [];
  }
}
