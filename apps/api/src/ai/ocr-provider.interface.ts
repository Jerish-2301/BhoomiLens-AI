export interface OcrResult {
  text: string;
  confidence: number;
  language: string;
  boundingBoxes?: Array<{ text: string; box: any; confidence: number }>;
}

export interface IOcrProvider {
  processDocument(filePath: string): Promise<OcrResult>;
}
