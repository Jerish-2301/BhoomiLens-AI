import { Injectable, Logger } from '@nestjs/common';
import { ExtractedData } from './extraction.service';

export interface DocumentConfidence {
  overallScore: number;
  lowConfidenceFields: string[];
}

@Injectable()
export class ConfidenceEngine {
  private readonly logger = new Logger(ConfidenceEngine.name);

  calculateConfidence(extractedData: ExtractedData): DocumentConfidence {
    let totalScore = 0;
    let fieldCount = 0;
    const lowConfidenceFields: string[] = [];

    const LOW_CONFIDENCE_THRESHOLD = 0.70;

    for (const [key, field] of Object.entries(extractedData)) {
      if (field) {
        totalScore += field.confidence;
        fieldCount++;
        
        // Example of rule based confidence adjustment:
        // if area is suspiciously high, lower confidence
        if (key === 'area' && field.value > 1000) {
           field.confidence -= 0.2;
        }

        if (field.confidence < LOW_CONFIDENCE_THRESHOLD) {
          lowConfidenceFields.push(key);
        }
      }
    }

    const overallScore = fieldCount > 0 ? totalScore / fieldCount : 0;

    this.logger.log(`Calculated overall confidence: ${overallScore}. Low confidence fields: ${lowConfidenceFields.length}`);

    return {
      overallScore,
      lowConfidenceFields
    };
  }
}
