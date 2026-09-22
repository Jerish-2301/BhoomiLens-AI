import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private memoryStore: Map<string, Map<string, any>> = new Map();
  private useMemoryStore: boolean;

  constructor(@Inject('FIREBASE_FIRESTORE') private readonly db: Firestore) {
    this.useMemoryStore = !process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (this.useMemoryStore) {
      this.logger.warn('GOOGLE_APPLICATION_CREDENTIALS not provided. Using in-memory store for local prototype development.');
    }
  }

  async onModuleInit() {
    if (this.useMemoryStore) {
      await this.seedDemoData();
    }
  }

  private async seedDemoData() {
    const existing = await this.getAll('landRecords');
    if (existing.length > 0) return;

    this.logger.log('Seeding initial prototype demo records...');

    // 1. Data Sources
    const sources = [
      {
        id: 'ds-1',
        name: 'Department of Land Resources (DoLR)',
        authority: 'Ministry of Rural Development, GoI',
        state: 'National',
        documentType: 'Policy Guidelines & DILRMP Standards',
        url: 'https://dolr.gov.in',
        sourceType: 'Official API Specification',
        status: 'VERIFIED',
      },
      {
        id: 'ds-2',
        name: 'Tamil Nadu Patta / Chitta Portal',
        authority: 'Survey and Settlement Department',
        state: 'Tamil Nadu',
        documentType: 'Patta, Chitta, FMB Sketch',
        url: 'https://eservices.tn.gov.in',
        sourceType: 'Public Registry',
        status: 'VERIFIED',
      },
      {
        id: 'ds-3',
        name: 'Mahabhulekh 7/12 Portal',
        authority: 'Revenue Department Maharashtra',
        state: 'Maharashtra',
        documentType: '7/12 Extract, Form 8A',
        url: 'https://bhulekh.mahabhumi.gov.in',
        sourceType: 'State Land Registry',
        status: 'VERIFIED',
      },
    ];
    for (const ds of sources) {
      await this.set('dataSources', ds, ds.id);
    }

    // 2. Demo Documents
    const doc1Id = 'doc-demo-101';
    const doc2Id = 'doc-demo-102';

    await this.set('documents', {
      id: doc1Id,
      originalName: 'TN_Patta_Chitta_Survey142.pdf',
      mimeType: 'application/pdf',
      size: 245000,
      path: 'gs://uploading-digital-property.firebasestorage.app/documents/demo-patta.pdf',
      status: 'VERIFIED',
      createdAt: new Date(Date.now() - 3600000 * 24),
      updatedAt: new Date(),
    }, doc1Id);

    await this.set('documents', {
      id: doc2Id,
      originalName: 'MH_7-12_Extract_Survey88.pdf',
      mimeType: 'application/pdf',
      size: 189000,
      path: 'gs://uploading-digital-property.firebasestorage.app/documents/demo-7-12.pdf',
      status: 'VERIFICATION_REQUIRED',
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(),
    }, doc2Id);

    // 3. Land Records
    const rec1Id = 'rec-demo-101';
    await this.set('landRecords', {
      id: rec1Id,
      documentId: doc1Id,
      surveyNumber: '142/3A',
      ownerName: 'Ramasamy Subramanian',
      area: 4.25,
      areaUnit: 'acres',
      village: 'Perungalathur',
      district: 'Chengalpattu',
      state: 'Tamil Nadu',
      status: 'VERIFIED',
      confidence: 0.96,
      validationResult: JSON.stringify({
        status: 'PASSED',
        errors: [],
        warnings: [],
        passedRules: ['SURVEY_NUMBER_FORMAT', 'AREA_POSITIVE', 'MANDATORY_LOCATION', 'CONFIDENCE_THRESHOLD_MET'],
      }),
      createdAt: new Date(Date.now() - 3600000 * 24),
      updatedAt: new Date(),
    }, rec1Id);

    const rec2Id = 'rec-demo-102';
    await this.set('landRecords', {
      id: rec2Id,
      documentId: doc2Id,
      surveyNumber: '88/1B',
      ownerName: 'Anantrao Yashwant Kadam',
      area: 2.8,
      areaUnit: 'acres',
      village: 'Haveli',
      district: 'Pune',
      state: 'Maharashtra',
      status: 'PENDING',
      confidence: 0.81,
      validationResult: JSON.stringify({
        status: 'REVIEW_REQUIRED',
        errors: ['Boundary description overlaps with adjacent parcel (Survey 88/1A).'],
        warnings: ['Slight handwriting blur on Sub-division index.'],
        passedRules: ['SURVEY_NUMBER_FORMAT', 'AREA_POSITIVE', 'MANDATORY_LOCATION'],
      }),
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(),
    }, rec2Id);

    // 4. Verification Task
    await this.set('verificationTasks', {
      id: 'task-demo-1',
      documentId: doc2Id,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(),
    }, 'task-demo-1');

    // 5. Audit Log
    await this.set('auditLogs', {
      id: 'audit-demo-1',
      action: 'SYSTEM_BOOTSTRAP',
      resourceId: 'bhoomilens-core',
      resourceType: 'System',
      userId: 'System',
      metadata: 'Initial SIH Prototype Environment Initialized',
      timestamp: new Date(),
    }, 'audit-demo-1');

    this.logger.log('Initial prototype demo records seeded successfully.');
  }

  private getCollectionStore(collection: string): Map<string, any> {
    if (!this.memoryStore.has(collection)) {
      this.memoryStore.set(collection, new Map());
    }
    return this.memoryStore.get(collection)!;
  }

  /**
   * Retrieves a document by ID
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    if (this.useMemoryStore) {
      const store = this.getCollectionStore(collection);
      return (store.get(id) as T) || null;
    }
    try {
      const docRef = this.db.collection(collection).doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as T;
    } catch (e: any) {
      this.logger.warn(`Firestore get failed, falling back to memory store: ${e?.message}`);
      this.useMemoryStore = true;
      return this.get<T>(collection, id);
    }
  }

  /**
   * Saves a document (create or overwrite)
   */
  async set<T extends { id?: string }>(collection: string, data: T, id?: string): Promise<T> {
    const docId = id || data.id || randomUUID();
    const docData = { ...data, id: docId, updatedAt: new Date() };
    if (!data.id) {
      (docData as any).createdAt = new Date();
    }
    if (this.useMemoryStore) {
      const store = this.getCollectionStore(collection);
      store.set(docId, docData);
      return docData as T;
    }
    try {
      await this.db.collection(collection).doc(docId).set(docData, { merge: true });
      return docData as T;
    } catch (e: any) {
      this.logger.warn(`Firestore set failed, falling back to memory store: ${e?.message}`);
      this.useMemoryStore = true;
      const store = this.getCollectionStore(collection);
      store.set(docId, docData);
      return docData as T;
    }
  }

  /**
   * Updates specific fields of a document
   */
  async update(collection: string, id: string, data: any): Promise<void> {
    if (this.useMemoryStore) {
      const store = this.getCollectionStore(collection);
      const existing = store.get(id) || {};
      store.set(id, { ...existing, ...data, updatedAt: new Date() });
      return;
    }
    try {
      await this.db.collection(collection).doc(id).update({
        ...data,
        updatedAt: new Date(),
      });
    } catch (e: any) {
      this.logger.warn(`Firestore update failed, falling back to memory store: ${e?.message}`);
      this.useMemoryStore = true;
      const store = this.getCollectionStore(collection);
      const existing = store.get(id) || {};
      store.set(id, { ...existing, ...data, updatedAt: new Date() });
    }
  }

  /**
   * Queries a collection based on simple field equality
   */
  async query<T>(collection: string, field: string, operator: FirebaseFirestore.WhereFilterOp, value: any): Promise<T[]> {
    if (this.useMemoryStore) {
      const store = this.getCollectionStore(collection);
      const items = Array.from(store.values());
      return items.filter(item => {
        if (operator === '==') return item[field] === value;
        if (operator === '!=') return item[field] !== value;
        if (operator === '>') return item[field] > value;
        if (operator === '>=') return item[field] >= value;
        if (operator === '<') return item[field] < value;
        if (operator === '<=') return item[field] <= value;
        return true;
      }) as T[];
    }
    try {
      const snapshot = await this.db.collection(collection).where(field, operator, value).get();
      return snapshot.docs.map(doc => doc.data() as T);
    } catch (e: any) {
      this.logger.warn(`Firestore query failed, falling back to memory store: ${e?.message}`);
      this.useMemoryStore = true;
      return this.query<T>(collection, field, operator, value);
    }
  }

  /**
   * Retrieves all documents from a collection, optionally ordered
   */
  async getAll<T>(collection: string, orderByField?: string, orderDir: 'asc' | 'desc' = 'desc'): Promise<T[]> {
    if (this.useMemoryStore) {
      const store = this.getCollectionStore(collection);
      let items = Array.from(store.values()) as any[];
      if (orderByField) {
        items = items.sort((a, b) => {
          const valA = a[orderByField];
          const valB = b[orderByField];
          if (valA < valB) return orderDir === 'asc' ? -1 : 1;
          if (valA > valB) return orderDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return items as T[];
    }
    try {
      let query: FirebaseFirestore.Query = this.db.collection(collection);
      if (orderByField) {
        query = query.orderBy(orderByField, orderDir);
      }
      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as T);
    } catch (e: any) {
      this.logger.warn(`Firestore getAll failed, falling back to memory store: ${e?.message}`);
      this.useMemoryStore = true;
      return this.getAll<T>(collection, orderByField, orderDir);
    }
  }
}
