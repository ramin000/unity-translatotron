import { useRef, useMemo, useCallback } from 'react';
import { FileText, Upload, Download, Search, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslatorStore } from '@/store/translatorStore';
import { VirtualizedPreview } from '@/components/VirtualizedPreview';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useFileValidator } from '@/hooks/useFileValidator';
import {
  extractTermsChunked,
  normalizeFileContent,
  parseTranslations,
  applyTranslations,
  generateReversedContent,
  generateOutputFileName,
  downloadFile,
  exportToCSV,
  filterData,
  countTranslated,
} from '@/utils/translationHelpers';
import { CONFIG } from '@/config/constants';

export default function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { validateFile, validateContent } = useFileValidator();

  const {
    content,
    fileName,
    extractedData,
    translationMap,
    isLoading,
    progress,
    searchQuery,
    languageIndex,
    isReverseMode,
    setContent,
    setFileName,
    setExtractedData,
    setTranslationMap,
    setLoading,
    setProgress,
    setSearchQuery,
    setLanguageIndex,
    toggleReverseMode,
  } = useTranslatorStore();

  // Memoized filtered data
  const filteredData = useMemo(
    () => filterData(extractedData, searchQuery),
    [extractedData, searchQuery]
  );

  // Memoized translation count
  const translatedCount = useMemo(
    () => countTranslated(extractedData, translationMap),
    [extractedData, translationMap]
  );

  // Handle file upload
  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file || !validateFile(file)) return;

      setLoading(true);
      setProgress(0);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const rawContent = event.target?.result as string;
          if (!validateContent(rawContent)) {
            setLoading(false);
            return;
          }

          const normalizedContent = normalizeFileContent(rawContent);
          setContent(normalizedContent);

          const extracted = await extractTermsChunked(
            normalizedContent,
            languageIndex,
            setProgress
          );

          if (extracted.length === 0) {
            toast.error('هیچ متنی برای زبان انتخابی یافت نشد');
          } else {
            toast.success(`${extracted.length.toLocaleString('fa-IR')} متن استخراج شد`);
          }

          setExtractedData(extracted);
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('خطا در پردازش فایل');
        } finally {
          setLoading(false);
          setProgress(0);
        }
      };

      reader.onerror = () => {
        toast.error('خطا در خواندن فایل');
        setLoading(false);
      };

      reader.readAsText(file, 'UTF-8');
    },
    [validateFile, validateContent, languageIndex, setContent, setExtractedData, setFileName, setLoading, setProgress]
  );

  // Handle translation import
  const handleImport = useCallback(
    async (file: File | null) => {
      if (!file || !validateFile(file)) return;

      setLoading(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const importedContent = event.target?.result as string;
          if (!importedContent?.trim()) {
            toast.error('فایل خالی است');
            setLoading(false);
            return;
          }

          const newTranslationMap = parseTranslations(importedContent);
          if (newTranslationMap.size === 0) {
            toast.error('هیچ ترجمه‌ای در فایل یافت نشد');
            setLoading(false);
            return;
          }

          const { updated, count } = applyTranslations(content, extractedData, newTranslationMap);
          setContent(updated);
          setTranslationMap(newTranslationMap);
          toast.success(`${count.toLocaleString('fa-IR')} ترجمه اعمال شد`);
        } catch (error) {
          console.error('Error importing translations:', error);
          toast.error('خطا در ایمپورت ترجمه‌ها');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error('خطا در خواندن فایل');
        setLoading(false);
      };

      reader.readAsText(file, 'UTF-8');
    },
    [validateFile, content, extractedData, setContent, setTranslationMap, setLoading]
  );

  // Export functions
  const handleExportTerms = useCallback(() => {
    if (!extractedData.length) return;
    const exportContent = extractedData.map((item) => `${item.term}\n${item.originalText}`).join('\n\n');
    downloadFile(exportContent, generateOutputFileName(fileName, '_Terms'));
    toast.success(`${extractedData.length.toLocaleString('fa-IR')} متن صادر شد`);
  }, [extractedData, fileName]);

  const handleExportJSON = useCallback(() => {
    if (!extractedData.length) return;
    const jsonData = JSON.stringify(extractedData, null, 2);
    downloadFile(jsonData, generateOutputFileName(fileName, '.json'));
    toast.success('فایل JSON صادر شد');
  }, [extractedData, fileName]);

  const handleExportCSV = useCallback(() => {
    if (!extractedData.length) return;
    const csvContent = exportToCSV(extractedData, translationMap);
    downloadFile(csvContent, generateOutputFileName(fileName, '.csv'));
    toast.success('فایل CSV صادر شد');
  }, [extractedData, translationMap, fileName]);

  const handleDownloadFinal = useCallback(() => {
    if (!content) {
      toast.error('ابتدا فایلی را آپلود کنید');
      return;
    }

    const finalContent =
      isReverseMode && translationMap.size > 0
        ? generateReversedContent(content, extractedData, translationMap)
        : content;

    const suffix = isReverseMode ? '_Reversed' : '_Translated';
    downloadFile(finalContent, generateOutputFileName(fileName, suffix));
    toast.success('فایل نهایی دانلود شد');
  }, [content, isReverseMode, translationMap, extractedData, fileName]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  // Hotkeys
  useHotkeys([
    { key: 's', ctrl: true, handler: handleDownloadFinal },
    { key: 'o', ctrl: true, handler: () => fileInputRef.current?.click() },
    { key: 't', ctrl: true, handler: handleExportTerms },
    { key: 'i', ctrl: true, handler: () => importInputRef.current?.click() },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6" dir="rtl">
      <Toaster position="top-center" toastOptions={{ duration: CONFIG.TOAST_DURATION }} />
      
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-4">
            <FileText className="w-12 h-12 text-yellow-300" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">Unity I2 Translator Pro</h1>
              <p className="text-blue-200 text-sm">پردازش بهینه • RTL حرفه‌ای • JSON/CSV</p>
            </div>
          </div>
          {fileName && (
            <div className="mt-4 bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-300" />
              <span className="text-white text-sm truncate">{fileName}</span>
            </div>
          )}
        </div>

        {/* Language selector */}
        {!content && (
          <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
            <label className="block text-white text-sm font-semibold mb-2">انتخاب زبان:</label>
            <select
              value={languageIndex}
              onChange={(e) => setLanguageIndex(+e.target.value)}
              className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            >
              {[...Array(CONFIG.MAX_LANGUAGE_INDEX + 1)].map((_, i) => (
                <option key={i} value={i} className="bg-gray-800">
                  Index [{i}] {i === 0 ? '(پیش‌فرض)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Progress bar */}
        {isLoading && progress > 0 && (
          <div className="mb-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex justify-between text-sm text-blue-200 mb-2">
              <span>در حال پردازش...</span>
              <span>{progress}٪</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Translation progress */}
        {extractedData.length > 0 && (
          <div className="mb-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex justify-between text-xs text-blue-200 mb-2">
              <span>پیشرفت ترجمه</span>
              <span>
                {translatedCount.toLocaleString('fa-IR')}/{extractedData.length.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                style={{
                  width: `${extractedData.length ? (translatedCount / extractedData.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* File upload */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="mb-4"
        >
          <label className="block cursor-pointer">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all">
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-semibold">در حال پردازش...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="font-semibold">{content ? '✅ آپلود شد' : '📂 آپلود فایل'}</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0] || null)}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {extractedData.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleExportTerms}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                TXT
              </button>
              <button
                onClick={handleExportJSON}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                JSON
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                CSV
              </button>
            </div>
          )}

          {content && (
            <>
              <label className="block cursor-pointer">
                <div className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors">
                  <Upload className="w-6 h-6" />
                  ایمپورت ترجمه
                </div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => handleImport(e.target.files?.[0] || null)}
                  disabled={isLoading}
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={toggleReverseMode}
                  disabled={isLoading}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    isReverseMode
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-transparent text-rose-300 border-rose-300 hover:bg-rose-600/20'
                  }`}
                >
                  {isReverseMode ? '✅ RTL فعال' : '🔄 RTL'}
                </button>
                <button
                  onClick={handleDownloadFinal}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
                >
                  <Download className="w-5 h-5" />
                  دانلود نهایی
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        {extractedData.length > 0 && (
          <div className="mt-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="جستجو در متن‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/20 text-white placeholder-gray-300 pr-10 pl-4 py-3 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-blue-200 text-sm">
                {filteredData.length.toLocaleString('fa-IR')} نتیجه
              </div>
            )}
          </div>
        )}

        {/* Virtualized preview */}
        {filteredData.length > 0 && (
          <VirtualizedPreview
            data={filteredData}
            translationMap={translationMap}
            containerRef={containerRef}
          />
        )}

        {/* Empty state */}
        {!content && !isLoading && (
          <div className="mt-6 bg-white/10 rounded-2xl p-12 border border-white/20 text-center">
            <FileText className="w-20 h-20 text-purple-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">آماده برای شروع</h2>
            <p className="text-blue-200 text-sm">فایل Unity I2Languages را آپلود کنید</p>
          </div>
        )}

        {/* Statistics */}
        {extractedData.length > 0 && (
          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-blue-200 text-xs mb-1">کل</div>
                <div className="text-white text-xl font-bold">
                  {extractedData.length.toLocaleString('fa-IR')}
                </div>
              </div>
              <div>
                <div className="text-green-200 text-xs mb-1">ترجمه شده</div>
                <div className="text-white text-xl font-bold">
                  {translatedCount.toLocaleString('fa-IR')}
                </div>
              </div>
              <div>
                <div className="text-yellow-200 text-xs mb-1">باقیمانده</div>
                <div className="text-white text-xl font-bold">
                  {(extractedData.length - translatedCount).toLocaleString('fa-IR')}
                </div>
              </div>
              <div>
                <div className="text-purple-200 text-xs mb-1">زبان</div>
                <div className="text-white text-xl font-bold">[{languageIndex}]</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-xs">
          <p>Unity I2 Translator Pro v3.0 • مقیاس‌پذیر و بهینه</p>
        </div>
      </div>
    </div>
  );
}
