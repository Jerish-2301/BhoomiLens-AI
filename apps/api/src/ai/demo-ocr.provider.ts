import { Injectable } from '@nestjs/common';
import { IOcrProvider, OcrResult } from './ocr-provider.interface';

@Injectable()
export class DemoOcrProvider implements IOcrProvider {
  async processDocument(filePath: string): Promise<OcrResult> {
    // Simulate API delay for Demo
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Return realistic synthetic sample data as requested in the prompt
    return {
      text: "Survey No. 124/7B\nOwner: Ramesh Kumar\nArea: 2.4 acres\nVillage: Example Village\nDistrict: Example District",
      confidence: 0.92,
      language: "en, hi",
      boundingBoxes: [
        { text: "Ramesh Kumar", box: { x: 120, y: 340, w: 420, h: 60 }, confidence: 0.94 },
        { text: "124/7B", box: { x: 120, y: 400, w: 100, h: 30 }, confidence: 0.68 }, // intentional low confidence
      ]
    };
  }
}
