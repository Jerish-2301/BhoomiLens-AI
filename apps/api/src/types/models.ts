export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VERIFIER = 'VERIFIER',
  GIS_OFFICER = 'GIS_OFFICER',
  AUDITOR = 'AUDITOR',
  PUBLIC = 'PUBLIC',
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PREPROCESSING = 'PREPROCESSING',
  OCR_PROCESSING = 'OCR_PROCESSING',
  EXTRACTION = 'EXTRACTION',
  VALIDATION = 'VALIDATION',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandRecord {
  id: string;
  documentId: string;
  surveyNumber?: string;
  subSurveyNumber?: string;
  khataNumber?: string;
  ownerName?: string;
  validationResult?: string;
  area?: number;
  areaUnit?: string;
  village?: string;
  district?: string;
  state?: string;
  status: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedField {
  id: string;
  recordId: string;
  fieldName: string;
  value: string;
  confidence: number;
  sourcePage?: number;
  boundingBox?: string;
  status: string;
}

export interface VerificationTask {
  id: string;
  documentId: string;
  assignedToId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordConflict {
  id: string;
  recordId: string;
  description: string;
  resolved: boolean;
  createdAt: Date;
}
