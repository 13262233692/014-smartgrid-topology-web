import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PowerFlowService } from './power-flow.service';
import { ScadaGatewayService } from './scada-gateway.service';
import { ScadaDataPoint, ScadaBatch, LowVoltageAlert } from './power-flow.types';

@Controller('api/power-flow')
export class PowerFlowController {
  constructor(
    private readonly powerFlow: PowerFlowService,
    private readonly scadaGateway: ScadaGatewayService,
  ) {}

  @Post('scada/batch')
  async ingestBatch(@Body() batch: ScadaBatch): Promise<{ ok: boolean; count: number }> {
    await this.scadaGateway.ingestScadaBatch(batch);
    return { ok: true, count: batch.dataPoints.length };
  }

  @Post('scada/point')
  async ingestPoint(@Body() dp: ScadaDataPoint): Promise<{ ok: boolean }> {
    await this.scadaGateway.ingestDataPoint(dp);
    return { ok: true };
  }

  @Post('solve')
  async solve(): Promise<{
    converged: boolean;
    iterations: number;
    maxMismatch: number;
    calculationTimeMs: number;
    lowVoltageNodes: LowVoltageAlert[];
  } | null> {
    const result = await this.powerFlow.solve();
    if (!result) return null;
    return {
      converged: result.converged,
      iterations: result.iterations,
      maxMismatch: result.maxMismatch,
      calculationTimeMs: result.calculationTimeMs,
      lowVoltageNodes: result.lowVoltageNodes,
    };
  }

  @Post('solve-and-push')
  async solveAndPush(): Promise<{ ok: boolean; lowVoltageCount: number }> {
    await this.scadaGateway.runPowerFlowAndPush();
    const alerts = this.powerFlow.getLowVoltageAlerts();
    return { ok: true, lowVoltageCount: alerts.length };
  }

  @Get('alerts')
  getAlerts(): LowVoltageAlert[] {
    return this.powerFlow.getLowVoltageAlerts();
  }

  @Get('voltage/:nodeId')
  getNodeVoltage(@Param('nodeId') nodeId: string): { voltage: number | null; pu: number | null } {
    const pu = this.powerFlow.getNodeVoltage(nodeId);
    return { voltage: pu ? pu * 10 : null, pu };
  }

  @Get('result')
  getLastResult(): any {
    const r = this.powerFlow.getLastResult();
    if (!r) return null;
    return {
      converged: r.converged,
      iterations: r.iterations,
      maxMismatch: r.maxMismatch,
      calculationTimeMs: r.calculationTimeMs,
      lowVoltageCount: r.lowVoltageNodes.length,
    };
  }

  @Post('simulation/start')
  startSimulation(@Query('interval') interval: string = '5000'): { ok: boolean; intervalMs: number } {
    const ms = parseInt(interval) || 5000;
    this.scadaGateway.startSimulation(ms);
    return { ok: true, intervalMs: ms };
  }

  @Post('simulation/stop')
  stopSimulation(): { ok: boolean } {
    this.scadaGateway.stopSimulation();
    return { ok: true };
  }

  @Get('simulation/status')
  getSimulationStatus(): { running: boolean; loadMultiplier: number } {
    return {
      running: this.scadaGateway.isSimulationRunning(),
      loadMultiplier: 1.0,
    };
  }

  @Post('simulation/load')
  setLoadMultiplier(@Body() body: { multiplier: number }): { ok: boolean; multiplier: number } {
    const m = body.multiplier;
    this.scadaGateway.setLoadMultiplier(m);
    return { ok: true, multiplier: m };
  }

  @Post('rebuild')
  async rebuild(@Body() body: { substationId?: string } = {}): Promise<{ ok: boolean; busCount: number; branchCount: number; slackBusId?: string }> {
    const ok = await this.powerFlow.rebuildSystem(body.substationId);
    const r = this.powerFlow.getLastResult();
    const buses = (this.powerFlow as any).currentBuses as any[];
    const branches = (this.powerFlow as any).currentBranches as any[];
    const slackBus = buses?.find(b => b.type === 'SLACK');
    return {
      ok,
      busCount: buses?.length || 0,
      branchCount: branches?.length || 0,
      slackBusId: slackBus?.id,
    };
  }

  @Post('clear')
  clear(): { ok: boolean } {
    this.powerFlow.clearCache();
    return { ok: true };
  }
}
