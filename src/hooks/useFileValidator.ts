import { useCallback } from 'react';
import { CONFIG } from '@/config/constants';
import toast from 'react-hot-toast';

export function useFileValidator() {
  const validateFile = useCallback((file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(CONFIG.SUPPORTED_FILE_EXTENSION)) {
      toast.error('فقط فایل‌های .txt پشتیبانی می‌شوند');
      return false;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      toast.error('حجم فایل بیش از حد مجاز است (حداکثر 100MB)');
      return false;
    }

    return true;
  }, []);

  const validateContent = useCallback((content: string): boolean => {
    if (!content?.trim()) {
      toast.error('فایل خالی است');
      return false;
    }

    if (!content.includes('string Term =')) {
      toast.error('فرمت فایل نامعتبر است - فایل Unity I2Languages نیست');
      return false;
    }

    return true;
  }, []);

  return { validateFile, validateContent };
}
