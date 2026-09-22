import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [ProcessingModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
