import { Injectable, OnModuleInit } from '@nestjs/common';
import { PowerFlowService } from './power-flow.service';
import { WebSocketGateway } from './websocket.gateway';
import { ScadaDataPoint, ScadaBatch } from './power-flow.types';

@Injectable()
export class ScadaGatewayService implements OnModuleInit {
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationRunning = false;
  private loadMultiplier = 1.0;

  constructor(
    private readonly powerFlow: PowerFlowService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  async onModuleInit() {}

  async ingestScadaBatch(batch: ScadaBatch): Promise<void> {
    await this.powerFlow.applyScadaData(batch.dataPoints);
    this.wsGateway.broadcastScadaData(batch.dataPoints);
  }

  async ingestDataPoint(dp: ScadaDataPoint): Promise<void> {
    await this.powerFlow.applyScadaData([dp]);
    this.wsGateway.broadcastScadaData([dp]);
  }

  async runPowerFlowAndPush(): Promise<void> {
    const result = await this.powerFlow.solve();
    if (!result) return;

    this.wsGateway.broadcastPowerFlowResult(result);
    this.wsGateway.broadcastLowVoltageAlerts(result.lowVoltageNodes);

    const voltageUpdates = Array.from(result.buses.values()).map(b => ({
      nodeId: b.id,
      voltage: b.voltageMagnitude,
      angle: b.voltageAngle,
    }));
    this.wsGateway.broadcastVoltageUpdates(voltageUpdates);
  }

  startSimulation(intervalMs: number = 5000): void {
    if (this.simulationRunning) return;
    this.simulationRunning = true;
    console.log('[SCADA] Starting data simulation');

    this.runSimulationCycle();
    this.simulationInterval = setInterval(() => {
      this.runSimulationCycle();
    }, intervalMs);
  }

  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.simulationRunning = false;
    console.log('[SCADA] Stopped data simulation');
  }

  setLoadMultiplier(multiplier: number): void {
    this.loadMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
    console.log(`[SCADA] Load multiplier set to ${this.loadMultiplier.toFixed(2)}x`);
  }

  isSimulationRunning(): boolean {
    return this.simulationRunning;
  }

  private async runSimulationCycle(): Promise<void> {
    try {
      const repo = (this.powerFlow as any).topologyRepo;
      const idx = await (repo.ensureIndex ? repo.ensureIndex() : null);
      if (!idx) return;

      const loadNodes = Array.from(idx.nodes.values()).filter(
        (n: any) => n.type === 'EnergyConsumer' && n.energized !== false
      ) as any[];

      if (loadNodes.length === 0) return;

      const dataPoints: ScadaDataPoint[] = [];
      const timestamp = Date.now();

      const spikeTrigger = Math.random() < 0.15;
      const spikeNodes = spikeTrigger
        ? loadNodes.sort(() => Math.random() - 0.5).slice(0, Math.floor(loadNodes.length * 0.3))
        : [];
      const spikeSet = new Set(spikeNodes.map((n: any) => n.id));

      for (const node of loadNodes) {
        const baseP = node.p || (50 + Math.random() * 300);
        const baseQ = node.q || (20 + Math.random() * 150);
        const fluctuation = 0.85 + Math.random() * 0.3;
        const spikeFactor = spikeSet.has(node.id) ? 2.5 + Math.random() * 1.5 : 1.0;

        const p = baseP * fluctuation * this.loadMultiplier * spikeFactor;
        const q = baseQ * fluctuation * this.loadMultiplier * spikeFactor;

        dataPoints.push({
          nodeId: node.id,
          timestamp,
          realPower: Math.round(p * 100) / 100,
          reactivePower: Math.round(q * 100) / 100,
          powerFactor: Math.round((p / Math.sqrt(p * p + q * q)) * 1000) / 1000,
        });
      }

      if (dataPoints.length > 0) {
        await this.ingestScadaBatch({
          batchId: `SIM-${timestamp}`,
          timestamp,
          source: 'SIMULATION',
          dataPoints,
        });
      }

      await this.runPowerFlowAndPush();
    } catch (e) {
      console.warn('[SCADA] Simulation cycle error:', e.message);
    }
  }
}
