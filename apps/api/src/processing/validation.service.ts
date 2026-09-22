import { Injectable, Logger } from '@nestjs/common';
import { LandRecord } from '../types/models';
import { DatabaseService } from '../database/database.service';

export interface ValidationResult {
  status: 'PASSED' | 'REVIEW_REQUIRED' | 'FAILED';
  errors: string[];
  warnings: string[];
  passedRules: string[];
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(private readonly db: DatabaseService) {}

  async validateRecord(record: LandRecord): Promise<ValidationResult> {
    const result: ValidationResult = {
      status: 'PASSED',
      errors: [],
      warnings: [],
      passedRules: [],
    };

    // 1. SURVEY_NUMBER_FORMAT
    if (!record.surveyNumber || record.surveyNumber.trim() === '') {
      result.errors.push('Survey number is missing.');
    } else if (!/^[0-9]+(\/[a-zA-Z0-9]+)?$/.test(record.surveyNumber)) {
      result.warnings.push('Survey number format looks unusual. Expected something like 124/7B.');
    } else {
      result.passedRules.push('SURVEY_NUMBER_FORMAT');
    }

    // 2. AREA_POSITIVE
    if (record.area === undefined || record.area <= 0) {
      result.errors.push('Area must be a positive number.');
    } else {
      result.passedRules.push('AREA_POSITIVE');
    }

    // 3. MANDATORY_LOCATION
    if (!record.village || !record.district) {
      result.errors.push('Village and District are mandatory.');
    } else {
      result.passedRules.push('MANDATORY_LOCATION');
    }

    // 4. DUPLICATE_DOCUMENT / DUPLICATE_SURVEY
    // Check if another verified record has the exact same survey number and village
    if (record.surveyNumber && record.village) {
      const duplicates = await this.db.query<LandRecord>(
        'landRecords',
        'surveyNumber',
        '==',
        record.surveyNumber
      );
      
      const exactMatches = duplicates.filter(d => 
        d.village?.toLowerCase() === record.village?.toLowerCase() && 
        d.id !== record.id &&
        d.status === 'VERIFIED'
      );

      if (exactMatches.length > 0) {
        result.errors.push(`Possible duplicate detected with verified record(s): ${exactMatches.map(d => d.id).join(', ')}`);
      } else {
        result.passedRules.push('DUPLICATE_SURVEY');
      }
    }

    if (result.errors.length > 0) {
      result.status = 'REVIEW_REQUIRED';
    } else if (result.warnings.length > 0) {
      result.status = 'REVIEW_REQUIRED'; // or PASSED depending on strictness
    }

    this.logger.log(`Validation finished. Status: ${result.status}. Errors: ${result.errors.length}`);
    return result;
  }
}
