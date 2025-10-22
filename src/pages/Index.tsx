import React, { useState } from "react";
import { FileText } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/FileUploader";
import { InstructionCard } from "@/components/InstructionCard";
import { ExampleFormat } from "@/components/ExampleFormat";
import { ActionButtons } from "@/components/ActionButtons";
import { TranslationPreview } from "@/components/TranslationPreview";
import {
  extractTermsFromContent,
  parseTranslationFile,
  applyTranslationsToContent,
  downloadFile,
  generateOutputFileName,
} from "@/utils/translationHelpers";

interface ExtractedItem {
  term: string;
  originalText: string;
  lineIndex: number;
  dataLineIndex?: number;
}

const Index = () => {
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);

  // 📂 آپلود فایل اصلی Unity
  const handleFileUpload = (file: File) => {
    try {
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          
          if (!text || text.trim().length === 0) {
            toast({
              title: "خطا",
              description: "فایل خالی است!",
              variant: "destructive",
            });
            return;
          }

          setFileContent(text);
          const extracted = extractTermsFromContent(text);
          
          if (extracted.length === 0) {
            toast({
              title: "هشدار",
              description: "هیچ متن قابل ترجمه‌ای پیدا نشد. لطفاً فایل Unity صحیح را انتخاب کنید.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "موفقیت",
              description: `${extracted.length} متن با موفقیت استخراج شد!`,
            });
          }
          
          setExtractedData(extracted);
        } catch (error) {
          console.error("Error parsing file:", error);
          toast({
            title: "خطا در پردازش فایل",
            description: "فایل قابل خواندن نیست. لطفاً فرمت UTF-8 باشد.",
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "خطا در خواندن فایل",
          description: "لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      };
      
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "خطا",
        description: "مشکلی در آپلود فایل پیش آمد.",
        variant: "destructive",
      });
    }
  };

  // 📤 خروجی لیست Termها برای ترجمه
  const handleExportTerms = () => {
    try {
      if (extractedData.length === 0) {
        toast({
          title: "خطا",
          description: "هیچ متنی برای خروجی وجود ندارد!",
          variant: "destructive",
        });
        return;
      }

      const content = extractedData
        .map((item) => `${item.term}\n${item.originalText}`)
        .join('\n\n');

      const outputName = generateOutputFileName(fileName, '_ExtractedTerms');
      downloadFile(content, outputName);

      toast({
        title: "دانلود موفق",
        description: `${extractedData.length} متن دانلود شد.`,
      });
    } catch (error) {
      console.error("Error exporting terms:", error);
      toast({
        title: "خطا",
        description: "مشکلی در دانلود فایل پیش آمد.",
        variant: "destructive",
      });
    }
  };

  // 📥 ایمپورت ترجمه‌ها
  const handleImportTranslations = (file: File) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string;
          
          if (!content || content.trim().length === 0) {
            toast({
              title: "خطا",
              description: "فایل ترجمه خالی است!",
              variant: "destructive",
            });
            return;
          }

          const translationMap = parseTranslationFile(content);

          if (translationMap.size === 0) {
            toast({
              title: "خطا",
              description: "هیچ ترجمه معتبری در فایل پیدا نشد!",
              variant: "destructive",
            });
            return;
          }

          const { updatedContent, appliedCount } = applyTranslationsToContent(
            fileContent,
            extractedData,
            translationMap
          );

          setFileContent(updatedContent);

          toast({
            title: "موفقیت",
            description: `${appliedCount} ترجمه با موفقیت اعمال شد!`,
          });
        } catch (error) {
          console.error("Error parsing translations:", error);
          toast({
            title: "خطا در پردازش ترجمه‌ها",
            description: "فرمت فایل ترجمه نامعتبر است.",
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "خطا در خواندن فایل",
          description: "لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      };
      
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      console.error("Error importing translations:", error);
      toast({
        title: "خطا",
        description: "مشکلی در ایمپورت ترجمه‌ها پیش آمد.",
        variant: "destructive",
      });
    }
  };

  // 💾 دانلود فایل نهایی با ترجمه‌ها
  const handleDownloadFinal = () => {
    try {
      if (!fileContent) {
        toast({
          title: "خطا",
          description: "هیچ فایلی برای دانلود وجود ندارد!",
          variant: "destructive",
        });
        return;
      }

      const outputName = generateOutputFileName(fileName, '_Translated');
      downloadFile(fileContent, outputName);

      toast({
        title: "موفقیت",
        description: "فایل با موفقیت دانلود شد!",
      });
    } catch (error) {
      console.error("Error downloading final file:", error);
      toast({
        title: "خطا",
        description: "مشکلی در دانلود فایل پیش آمد.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-4">
            <FileText className="w-12 h-12 text-accent" />
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                🎮 Unity I2 Text Translator
              </h1>
              <p className="text-secondary-foreground">
                ابزار ساده و حرفه‌ای برای ترجمه فایل‌های I2Languages
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!fileContent && <InstructionCard />}

        {/* Example Format */}
        {fileContent && extractedData.length > 0 && <ExampleFormat />}

        {/* File Uploader */}
        <FileUploader
          onFileUpload={handleFileUpload}
          fileName={fileName}
          hasContent={!!fileContent}
        />

        {/* Action Buttons */}
        <div className="mt-4">
          <ActionButtons
            hasExtractedData={extractedData.length > 0}
            extractedCount={extractedData.length}
            hasContent={!!fileContent}
            onExportTerms={handleExportTerms}
            onImportTranslations={handleImportTranslations}
            onDownloadFinal={handleDownloadFinal}
          />
        </div>

        {/* Preview */}
        <TranslationPreview data={extractedData} />

        {/* Empty State */}
        {!fileContent && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center shadow-2xl">
            <FileText className="w-24 h-24 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              آماده برای شروع
            </h2>
            <p className="text-secondary-foreground">
              فایل I2Languages.txt خود را آپلود کنید تا شروع کنیم
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
