import { Module } from '@nestjs/common';
import { DemoOcrProvider } from './demo-ocr.provider';
import { GoogleDocumentAIProvider } from './google-ocr.provider';
import { ImagePreprocessingService } from './preprocessing.service';

@Module({
  providers: [
    {
      provide: 'IOcrProvider',
      useClass:
        process.env.OCR_PROVIDER === 'google_document_ai' ||
        process.env.OCR_PROVIDER === 'gemini' ||
        Boolean(process.env.GEMINI_API_KEY)
          ? GoogleDocumentAIProvider
          : DemoOcrProvider,
    },
    ImagePreprocessingService,
  ],
  exports: ['IOcrProvider', ImagePreprocessingService],
})
export class AiModule {}
