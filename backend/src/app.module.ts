import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { Neo4jModule } from './neo4j/neo4j.module';
import { TopologyModule } from './topology/topology.module';
import { CimParserModule } from './cim-parser/cim-parser.module';
import { PowerFlowModule } from './power-flow/power-flow.module';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
    Neo4jModule,
    CimParserModule,
    TopologyModule,
    PowerFlowModule,
  ],
})
export class AppModule {}
