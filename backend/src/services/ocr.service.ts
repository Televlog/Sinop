import Tesseract from 'tesseract.js';
import { logger } from '../config/logger';

interface ReceiptData {
  text: string;
  amount?: number;
  merchant?: string;
  date?: string;
}

export const ocrService = {
  async extractReceiptData(imageBuffer: Buffer): Promise<ReceiptData> {
    try {
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            // Progress update
          }
        },
      });

      return {
        text,
        amount: extractAmount(text),
        merchant: extractMerchant(text),
        date: extractDate(text),
      };
    } catch (error) {
      logger.error('OCR processing failed:', error);
      return { text: '' };
    }
  },
};

function extractAmount(text: string): number | undefined {
  // Match common receipt total patterns
  const patterns = [
    /(?:total|amount|grand total|balance due)[:\s]*\$?([\d,]+\.?\d{0,2})/i,
    /\$\s*([\d,]+\.\d{2})\s*$/m,
    /(?:charged|payment)[:\s]*\$?([\d,]+\.?\d{0,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', ''));
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        return amount;
      }
    }
  }
  return undefined;
}

function extractMerchant(text: string): string | undefined {
  // First line is often the merchant name
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Filter out lines that are clearly not merchant names
    if (firstLine.length < 50 && !/\d{4}/.test(firstLine)) {
      return firstLine;
    }
  }
  return undefined;
}

function extractDate(text: string): string | undefined {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\w+ \d{1,2},?\s*\d{4})/i,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}
