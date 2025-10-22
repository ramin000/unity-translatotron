interface ExtractedItem {
  term: string;
  originalText: string;
  lineIndex: number;
  dataLineIndex?: number;
}

// Regex بهبود یافته برای پیدا کردن Term
const TERM_REGEX = /string\s+Term\s*=\s*"([^"]+)"/;
const DATA_REGEX = /string\s+data\s*=\s*"(.*)"/;

// Right-To-Left Embedding برای فارسی
const RTL_MARK = '\u202B';
const LTR_MARK = '\u202A';

/**
 * استخراج Term ها و اولین string data از فایل Unity
 */
export const extractTermsFromContent = (text: string): ExtractedItem[] => {
  const extracted: ExtractedItem[] = [];
  const lines = text.split('\n');
  let currentTerm: ExtractedItem | null = null;
  let foundFirstData = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // پیدا کردن Term
    const termMatch = line.match(TERM_REGEX);
    if (termMatch) {
      if (currentTerm) {
        extracted.push(currentTerm);
      }
      currentTerm = {
        term: termMatch[1],
        originalText: '',
        lineIndex: i,
      };
      foundFirstData = false;
    }

    // پیدا کردن اولین string data بعد از هر Term
    if (currentTerm && !foundFirstData && line.includes('string data =')) {
      const dataMatch = line.match(DATA_REGEX);
      if (dataMatch) {
        currentTerm.originalText = dataMatch[1];
        currentTerm.dataLineIndex = i;
        foundFirstData = true;
      }
    }
  }

  if (currentTerm) {
    extracted.push(currentTerm);
  }

  return extracted;
};

/**
 * Escape کردن کاراکترهای خاص در ترجمه
 */
export const escapeSpecialCharacters = (text: string): string => {
  return text.replace(/"/g, '\\"');
};

/**
 * اضافه کردن RTL mark برای نمایش صحیح فارسی در Unity
 */
export const applyRTLFormatting = (text: string): string => {
  // اگه متن فارسی باشه RTL mark اضافه می‌کنیم
  const hasPersian = /[\u0600-\u06FF]/.test(text);
  if (hasPersian) {
    return `${RTL_MARK}${text}`;
  }
  return text;
};

/**
 * Parse کردن فایل ترجمه و ساخت Map
 */
export const parseTranslationFile = (content: string): Map<string, string> => {
  const translationMap = new Map<string, string>();
  const blocks = content.split('\n\n').filter((b) => b.trim());

  blocks.forEach((block) => {
    const lines = block.split('\n').filter((l) => l.trim());
    if (lines.length >= 2) {
      const term = lines[0].trim();
      const translation = lines[1].trim();
      
      // Escape و اعمال RTL
      const safeTranslation = escapeSpecialCharacters(translation);
      const formattedTranslation = applyRTLFormatting(safeTranslation);
      
      translationMap.set(term, formattedTranslation);
    }
  });

  return translationMap;
};

/**
 * جایگزینی ترجمه‌ها در فایل اصلی
 */
export const applyTranslationsToContent = (
  fileContent: string,
  extractedData: ExtractedItem[],
  translationMap: Map<string, string>
): { updatedContent: string; appliedCount: number } => {
  const lines = fileContent.split('\n');
  let appliedCount = 0;

  extractedData.forEach((item) => {
    const translation = translationMap.get(item.term);
    if (translation && item.dataLineIndex !== undefined) {
      const originalLine = lines[item.dataLineIndex];
      const indentation = originalLine.match(/^(\s*)/)?.[0] || '';
      lines[item.dataLineIndex] = `${indentation}string data = "${translation}"`;
      appliedCount++;
    }
  });

  return {
    updatedContent: lines.join('\n'),
    appliedCount,
  };
};

/**
 * دانلود فایل به صورت ایمن
 */
export const downloadFile = (content: string, fileName: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // استفاده از window.open به جای DOM manipulation
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // پاکسازی
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * تولید نام فایل خروجی بر اساس نام ورودی
 */
export const generateOutputFileName = (inputFileName: string, suffix: string): string => {
  const baseName = inputFileName.replace(/\.txt$/i, '');
  return `${baseName}${suffix}.txt`;
};
