import { Module } from '@nestjs/common';
import { CimParserService } from './cim-parser.service';

@Module({
  providers: [CimParserService],
  exports: [CimParserService],
})
export class CimParserModule {}
