import { Injectable, Inject, Logger } from '@nestjs/common';
import { Storage } from 'firebase-admin/storage';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document, DocumentStatus } from '../types/models';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject('FIREBASE_STORAGE') private storage: Storage,
    private readonly db: DatabaseService,
    private eventEmitter: EventEmitter2
  ) {}

  async createDocument(file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const secureFilename = `${randomUUID()}${ext}`;
    
    // Upload to Firebase Storage or virtual demo storage
    let finalPath = `gs://uploading-digital-property.firebasestorage.app/documents/${secureFilename}`;
    try {
      const bucket = this.storage.bucket();
      const fileRef = bucket.file(`documents/${secureFilename}`);
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        }
      });
      finalPath = `gs://${bucket.name}/documents/${secureFilename}`;
    } catch (e: any) {
      this.logger.warn(`Storage upload failed (running in offline/prototype mode): ${e?.message}`);
    }

    const id = randomUUID();
    const document: Document = {
      id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: finalPath,
      status: DocumentStatus.UPLOADED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.set('documents', document);

    // Fire event for background processing
    this.logger.log(`Emitting process.document event for ${id}`);
    this.eventEmitter.emit('process.document', { documentId: id });

    return document;
  }

  async findAll() {
    return this.db.getAll<Document>('documents', 'createdAt', 'desc');
  }
}
