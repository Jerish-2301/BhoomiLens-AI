import { Injectable, Logger } from '@nestjs/common';
import { OcrResult } from '../ai/ocr-provider.interface';

export interface ExtractedData {
  surveyNumber?: { value: string; confidence: number };
  ownerName?: { value: string; confidence: number };
  area?: { value: number; unit: string; confidence: number };
  village?: { value: string; confidence: number };
  district?: { value: string; confidence: number };
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  async extract(ocrResult: OcrResult): Promise<ExtractedData> {
    this.logger.log('Extracting structured fields from OCR result');

    const data: ExtractedData = {};
    const text = ocrResult.text || '';
    const baseConfidence = ocrResult.confidence || 0.9;

    // 1. Try parsing JSON if Gemini returned structured JSON output
    try {
      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.surveyNumber) {
          data.surveyNumber = { value: String(parsed.surveyNumber).trim(), confidence: baseConfidence };
        }
        if (parsed.ownerName) {
          data.ownerName = { value: String(parsed.ownerName).trim(), confidence: baseConfidence };
        }
        if (parsed.area != null) {
          const num = typeof parsed.area === 'number' ? parsed.area : parseFloat(String(parsed.area).match(/[\d.]+/)?.[0] || '0');
          data.area = { value: num, unit: parsed.areaUnit || 'acres', confidence: baseConfidence };
        }
        if (parsed.village) {
          data.village = { value: String(parsed.village).trim(), confidence: baseConfidence };
        }
        if (parsed.district) {
          data.district = { value: String(parsed.district).trim(), confidence: baseConfidence };
        }

        if (Object.keys(data).length >= 2) {
          return data;
        }
      }
    } catch {
      // Continue to regex and line parsing
    }

    // 2. High-Accuracy Line and Pattern Parsing
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Survey / Sub-division / Gat / Khasra No
      if (
        !data.surveyNumber &&
        (lower.includes('survey no') ||
          lower.includes('survey number') ||
          lower.includes('gat no') ||
          lower.includes('khasra no') ||
          lower.includes('सर्वे क्र') ||
          lower.includes('गट क्र'))
      ) {
        const val = line.split(/[:\-]/)[1]?.trim() || line.replace(/.*(?:no|number|क्र|नं)[.:\s]*/i, '').trim();
        if (val) {
          data.surveyNumber = { value: val, confidence: baseConfidence };
        }
      }

      // Owner / Khatedar / Pattadar
      if (
        !data.ownerName &&
        (lower.includes('owner') ||
          lower.includes('khatedar') ||
          lower.includes('pattadar') ||
          lower.includes('खातेदार') ||
          lower.includes('पट्टेदार') ||
          lower.includes('मालक'))
      ) {
        let val = line.split(/[:\-]/)[1]?.trim() || '';
        val = val.replace(/^(shri|smt|mr|mrs|late)\.?\s+/i, '').trim();
        if (val) {
          data.ownerName = { value: val, confidence: baseConfidence };
        }
      }

      // Area / Extent
      if (!data.area && (lower.includes('area') || lower.includes('extent') || lower.includes('क्षेत्र'))) {
        const areaStr = line.split(/[:\-]/)[1]?.trim() || line;
        const numMatch = areaStr.match(/[\d.]+/);
        const areaVal = numMatch ? parseFloat(numMatch[0]) : 0;
        let unit = 'acres';
        if (lower.includes('hec') || lower.includes('हेक्टर')) unit = 'hectares';
        else if (lower.includes('guntha') || lower.includes('गुंठा')) unit = 'gunthas';
        else if (lower.includes('sq.ft') || lower.includes('square feet')) unit = 'sq.ft';
        else if (lower.includes('bigha')) unit = 'bigha';

        data.area = { value: areaVal, unit, confidence: baseConfidence };
      }

      // Village / Mouza / Gram
      if (!data.village && (lower.includes('village') || lower.includes('mouza') || lower.includes('गाव') || lower.includes('मौजे'))) {
        const val = line.split(/[:\-]/)[1]?.trim() || '';
        if (val) {
          data.village = { value: val, confidence: baseConfidence };
        }
      }

      // District / Zilla
      if (!data.district && (lower.includes('district') || lower.includes('zila') || lower.includes('जिल्हा'))) {
        const val = line.split(/[:\-]/)[1]?.trim() || '';
        if (val) {
          data.district = { value: val, confidence: baseConfidence };
        }
      }
    }

    return data;
  }
}
