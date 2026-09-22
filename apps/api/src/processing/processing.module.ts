import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { AiModule } from '../ai/ai.module';
import { ExtractionService } from './extraction.service';
import { ConfidenceEngine } from './confidence.service';
import { ValidationService } from './validation.service';

@Module({
  imports: [AiModule],
  providers: [ProcessingService, ExtractionService, ConfidenceEngine, ValidationService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
