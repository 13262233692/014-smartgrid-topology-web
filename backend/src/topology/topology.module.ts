import { Module } from '@nestjs/common';
import { TopologyController } from './topology.controller';
import { TopologyService } from './topology.service';
import { TopologyRepository } from './topology.repository';
import { CimParserModule } from '../cim-parser/cim-parser.module';

@Module({
  imports: [CimParserModule],
  controllers: [TopologyController],
  providers: [TopologyService, TopologyRepository],
  exports: [TopologyService],
})
export class TopologyModule {}
