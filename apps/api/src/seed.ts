import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';
import { randomUUID } from 'crypto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DatabaseService);

  console.log('Starting seed...');

  const dataSources = [
    {
      id: randomUUID(),
      name: 'Department of Land Resources',
      authority: 'Central Govt',
      state: 'National',
      documentType: 'Policy/Reference',
      url: 'https://dolr.gov.in',
      sourceType: 'Official',
      status: 'VERIFIED'
    },
    {
      id: randomUUID(),
      name: 'Tamil Nadu Patta / Chitta',
      authority: 'Revenue Dept',
      state: 'Tamil Nadu',
      documentType: 'Patta, Chitta',
      url: 'https://eservices.tn.gov.in',
      sourceType: 'Official',
      status: 'VERIFIED'
    }
  ];

  for (const ds of dataSources) {
    await db.set('dataSources', ds);
  }
  console.log('Seeded data sources.');

  const demoDocId = randomUUID();
  await db.set('documents', {
    id: demoDocId,
    originalName: 'demo-patta-1.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    path: 'gs://uploading-digital-property.firebasestorage.app/documents/demo.pdf',
    status: 'VERIFICATION_REQUIRED',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const demoRecordId = randomUUID();
  await db.set('landRecords', {
    id: demoRecordId,
    documentId: demoDocId,
    status: 'PENDING',
    confidence: 0.82,
    surveyNumber: '10/2A',
    ownerName: 'Demo Owner',
    area: 5.5,
    areaUnit: 'acres',
    village: 'Demo Village',
    district: 'Demo District',
    validationResult: JSON.stringify({
      status: 'REVIEW_REQUIRED',
      errors: ['Possible duplicate detected with verified record(s): XYZ'],
      warnings: [],
      passedRules: ['SURVEY_NUMBER_FORMAT', 'AREA_POSITIVE', 'MANDATORY_LOCATION']
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.set('verificationTasks', {
    id: randomUUID(),
    documentId: demoDocId,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Seeded demo documents and records.');

  await app.close();
}

bootstrap();
