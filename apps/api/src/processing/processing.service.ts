import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsGateway } from '../events/events.gateway';
import { IOcrProvider } from '../ai/ocr-provider.interface';
import { DatabaseService } from '../database/database.service';
import { ExtractionService } from './extraction.service';
import { ConfidenceEngine } from './confidence.service';
import { ValidationService } from './validation.service';
import { AuditService } from '../audit/audit.service';
import { DocumentStatus, LandRecord, ExtractedField, VerificationTask } from '../types/models';
import { randomUUID } from 'crypto';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly db: DatabaseService,
    private events: EventsGateway,
    @Inject('IOcrProvider') private ocrProvider: IOcrProvider,
    private extractionService: ExtractionService,
    private confidenceEngine: ConfidenceEngine,
    private validationService: ValidationService,
    private auditService: AuditService,
  ) {}

  @OnEvent('process.document', { async: true })
  async handleProcessDocumentEvent(payload: { documentId: string }) {
    this.logger.log(`Received process.document event for ${payload.documentId}`);
    try {
      await this.processDocument(payload.documentId);
    } catch (e: any) {
      this.logger.error(`Error processing document ${payload.documentId}`, e);
      await this.updateStatus(payload.documentId, DocumentStatus.FAILED, e?.message || String(e));
    }
  }

  async processDocument(documentId: string) {
    // 1. Preprocessing
    await this.updateStatus(documentId, DocumentStatus.PREPROCESSING);
    await this.delay(1000); // Simulate work

    // 2. OCR Processing
    await this.updateStatus(documentId, DocumentStatus.OCR_PROCESSING);
    const doc = await this.db.get<any>('documents', documentId);
    if (!doc) return;
    
    const ocrResult = await this.ocrProvider.processDocument(doc.path);

    // 3. Extraction
    await this.updateStatus(documentId, DocumentStatus.EXTRACTION);
    
    const extractedData = await this.extractionService.extract(ocrResult);
    const confidenceResult = this.confidenceEngine.calculateConfidence(extractedData);

    const recordId = randomUUID();
    const record: LandRecord = {
      id: recordId,
      documentId,
      status: 'PENDING',
      confidence: confidenceResult.overallScore,
      surveyNumber: extractedData.surveyNumber?.value || '',
      ownerName: extractedData.ownerName?.value || '',
      area: extractedData.area?.value || 0,
      areaUnit: extractedData.area?.unit || 'acres',
      village: extractedData.village?.value || '',
      district: extractedData.district?.value || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.set('landRecords', record);

    // Save Extracted Fields with Bounding Boxes
    if (ocrResult.boundingBoxes) {
      for (const box of ocrResult.boundingBoxes) {
        const fieldId = randomUUID();
        const field: ExtractedField = {
          id: fieldId,
          recordId: record.id,
          fieldName: 'RawText',
          value: box.text,
          confidence: box.confidence,
          boundingBox: JSON.stringify(box.box),
          status: 'AI_VERIFIED'
        };
        await this.db.set('extractedFields', field);
      }
    }

    // 4. Validation & Verification Required
    const validationResult = await this.validationService.validateRecord(record);
    
    // Save validation result to record
    await this.db.update('landRecords', record.id, { 
      validationResult: JSON.stringify(validationResult) 
    });

    if (
      confidenceResult.lowConfidenceFields.length > 0 || 
      confidenceResult.overallScore < 0.85 ||
      validationResult.status === 'REVIEW_REQUIRED'
    ) {
      const reason = validationResult.errors.length > 0 ? validationResult.errors.join(' ') : 'Low confidence fields detected.';
      await this.updateStatus(documentId, DocumentStatus.VERIFICATION_REQUIRED, reason);
      
      // Create a Verification Task
      const taskId = randomUUID();
      const task: VerificationTask = {
        id: taskId,
        documentId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.db.set('verificationTasks', task);
      
      await this.auditService.logEvent({
        action: 'DOCUMENT_VERIFICATION_QUEUED',
        resourceId: documentId,
        resourceType: 'Document',
        user: 'System'
      });
    } else {
      await this.updateStatus(documentId, DocumentStatus.VALIDATION);
      // Auto-verify if validation passed fully
      await this.db.update('landRecords', record.id, { status: 'VERIFIED' });
      await this.updateStatus(documentId, DocumentStatus.VERIFIED);
      
      await this.auditService.logEvent({
        action: 'DOCUMENT_AUTO_VERIFIED',
        resourceId: documentId,
        resourceType: 'Document',
        user: 'System',
        metadata: `Confidence: ${confidenceResult.overallScore}`
      });
    }
  }

  private async updateStatus(documentId: string, status: DocumentStatus, message?: string) {
    await this.db.update('documents', documentId, { status });
    this.events.emitDocumentStatusUpdate(documentId, status, message);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
