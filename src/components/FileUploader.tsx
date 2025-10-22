import { Upload, FileText } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  fileName: string | null;
  hasContent: boolean;
}

export const FileUploader = ({ onFileUpload, fileName, hasContent }: FileUploaderProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div>
      <label className="block cursor-pointer">
        <div className="bg-gradient-purple-blue hover:opacity-90 text-foreground px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]">
          <Upload className="w-6 h-6" />
          <span className="font-semibold text-lg">
            {hasContent ? "✅ فایل بارگذاری شد - کلیک برای تغییر" : "📂 انتخاب فایل Unity (I2Languages.txt)"}
          </span>
        </div>
        <input
          type="file"
          accept=".txt"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {fileName && (
        <div className="mt-4 bg-secondary/20 border border-secondary/30 rounded-lg p-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-secondary-foreground" />
          <span className="text-foreground">فایل بارگذاری شده: {fileName}</span>
        </div>
      )}
    </div>
  );
};
