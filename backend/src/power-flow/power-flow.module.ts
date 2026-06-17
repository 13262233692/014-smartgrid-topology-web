import { Module } from '@nestjs/common';
import { PowerFlowService } from './power-flow.service';
import { ScadaGatewayService } from './scada-gateway.service';
import { PowerFlowController } from './power-flow.controller';
import { WebSocketGateway } from './websocket.gateway';
import { TopologyModule } from '../topology/topology.module';

@Module({
  imports: [TopologyModule],
  providers: [PowerFlowService, ScadaGatewayService, WebSocketGateway],
  controllers: [PowerFlowController],
  exports: [PowerFlowService, ScadaGatewayService, WebSocketGateway],
})
export class PowerFlowModule {}
