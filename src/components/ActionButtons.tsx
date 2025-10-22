import { Download, Upload } from 'lucide-react';

interface ActionButtonsProps {
  hasExtractedData: boolean;
  extractedCount: number;
  hasContent: boolean;
  onExportTerms: () => void;
  onImportTranslations: (file: File) => void;
  onDownloadFinal: () => void;
}

export const ActionButtons = ({
  hasExtractedData,
  extractedCount,
  hasContent,
  onExportTerms,
  onImportTranslations,
  onDownloadFinal,
}: ActionButtonsProps) => {
  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportTranslations(file);
    }
  };

  return (
    <div className="space-y-4">
      {hasExtractedData && (
        <button
          onClick={onExportTerms}
          className="bg-gradient-blue-cyan hover:opacity-90 text-foreground px-6 py-4 rounded-xl w-full flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]"
        >
          <Download className="w-6 h-6" />
          📤 دانلود لیست متن‌ها برای ترجمه ({extractedCount} متن)
        </button>
      )}

      {hasContent && (
        <label className="block cursor-pointer">
          <div className="bg-gradient-green-emerald hover:opacity-90 text-foreground px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]">
            <Upload className="w-6 h-6" />
            📥 ایمپورت ترجمه‌ها (txt)
          </div>
          <input
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleImportChange}
          />
        </label>
      )}

      {hasContent && (
        <button
          onClick={onDownloadFinal}
          className="bg-gradient-purple-pink hover:opacity-90 text-foreground px-6 py-4 rounded-xl w-full flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]"
        >
          <Download className="w-6 h-6" />
          💾 دانلود فایل نهایی Unity با ترجمه‌ها
        </button>
      )}
    </div>
  );
};
