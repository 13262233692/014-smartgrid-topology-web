import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { LowVoltageAlert, ScadaDataPoint, PowerFlowResult } from './power-flow.types';

@Injectable()
@NestWebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private lowVoltageCache: LowVoltageAlert[] = [];

  afterInit(server: Server) {
    console.log('[WebSocket] Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
    client.emit('lowVoltageAlerts', this.lowVoltageCache);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  broadcastLowVoltageAlerts(alerts: LowVoltageAlert[]) {
    this.lowVoltageCache = alerts;
    this.server.emit('lowVoltageAlerts', alerts);
    if (alerts.length > 0) {
      console.log(`[WebSocket] Broadcast ${alerts.length} low-voltage alerts`);
    }
  }

  broadcastVoltageUpdates(updates: Array<{ nodeId: string; voltage: number; angle: number }>) {
    this.server.emit('voltageUpdates', updates);
  }

  broadcastScadaData(data: ScadaDataPoint[]) {
    this.server.emit('scadaData', data);
  }

  broadcastPowerFlowResult(result: PowerFlowResult) {
    this.server.emit('powerFlowResult', {
      converged: result.converged,
      iterations: result.iterations,
      maxMismatch: result.maxMismatch,
      calculationTimeMs: result.calculationTimeMs,
      lowVoltageCount: result.lowVoltageNodes.length,
    });
  }

  @SubscribeMessage('requestAlerts')
  handleRequestAlerts(client: Socket) {
    client.emit('lowVoltageAlerts', this.lowVoltageCache);
  }
}
