import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LowVoltageAlert, ScadaDataPoint, PowerFlowResult } from './power-flow.types';
export declare class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private lowVoltageCache;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    broadcastLowVoltageAlerts(alerts: LowVoltageAlert[]): void;
    broadcastVoltageUpdates(updates: Array<{
        nodeId: string;
        voltage: number;
        angle: number;
    }>): void;
    broadcastScadaData(data: ScadaDataPoint[]): void;
    broadcastPowerFlowResult(result: PowerFlowResult): void;
    handleRequestAlerts(client: Socket): void;
}
