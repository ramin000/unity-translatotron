import React, { useState } from "react";
import { Upload, Download, FileText, Check, AlertCircle } from 'lucide-react';

const Index = () => {
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [extractedData, setExtractedData] = useState<Array<{
    term: string;
    originalText: string;
    lineIndex: number;
    dataLineIndex?: number;
  }>>([]);

  // 📂 آپلود فایل اصلی Unity
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setFileContent(text);

      // استخراج Term ها و اولین string data
      const extracted: Array<{
        term: string;
        originalText: string;
        lineIndex: number;
        dataLineIndex?: number;
      }> = [];
      const lines = text.split('\n');
      let currentTerm: {
        term: string;
        originalText: string;
        lineIndex: number;
        dataLineIndex?: number;
      } | null = null;
      let foundFirstData = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // پیدا کردن Term
        const termMatch = line.match(/string Term = "(.+?)"/);
        if (termMatch) {
          if (currentTerm) {
            extracted.push(currentTerm);
          }
          currentTerm = {
            term: termMatch[1],
            originalText: '',
            lineIndex: i
          };
          foundFirstData = false;
        }
        
        // پیدا کردن اولین string data بعد از هر Term
        if (currentTerm && !foundFirstData && line.includes('string data =')) {
          const dataMatch = line.match(/string data = "(.*)"/);
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
      
      setExtractedData(extracted);
    };
    reader.readAsText(file);
  };

  // 📤 خروجی لیست Termها برای ترجمه
  const handleExportTerms = () => {
    if (extractedData.length === 0) {
      alert("هیچ متنی پیدا نشد!");
      return;
    }
    
    const content = extractedData.map(item => 
      `${item.term}\n${item.originalText}`
    ).join('\n\n');
    
    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ExtractedTerms.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 📥 ایمپورت ترجمه‌ها
  const handleImportTranslations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const blocks = content.split('\n\n').filter(b => b.trim());
      
      // ساخت map از ترجمه‌ها
      const translationMap = new Map();
      
      blocks.forEach(block => {
        const lines = block.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          const term = lines[0].trim();
          const translation = lines[1].trim();
          translationMap.set(term, translation);
        }
      });

      // جایگزینی در فایل اصلی
      let updatedText = fileContent;
      const lines = updatedText.split('\n');
      
      extractedData.forEach(item => {
        const translation = translationMap.get(item.term);
        if (translation && item.dataLineIndex !== undefined) {
          // جایگزینی اولین string data
          const originalLine = lines[item.dataLineIndex];
          const indentation = originalLine.match(/^(\s*)/)?.[0] || '';
          lines[item.dataLineIndex] = `${indentation}1 string data = "${translation}"`;
        }
      });
      
      updatedText = lines.join('\n');
      setFileContent(updatedText);
      
      const translatedCount = Array.from(translationMap.keys()).length;
      alert(`✅ ${translatedCount} ترجمه با موفقیت جایگزین شد!`);
    };
    reader.readAsText(file);
  };

  // 💾 دانلود فایل نهایی با ترجمه‌ها
  const handleDownloadFinal = () => {
    if (!fileContent) {
      alert("هیچ فایلی برای خروجی وجود ندارد!");
      return;
    }
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Translated_I2Languages.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="w-12 h-12 text-accent" />
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                🎮 Unity I2 Text Translator
              </h1>
              <p className="text-secondary-foreground">ابزار ساده و حرفه‌ای برای ترجمه فایل‌های I2Languages</p>
            </div>
          </div>

          {fileName && (
            <div className="mt-4 bg-secondary/20 border border-secondary/30 rounded-lg p-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary-foreground" />
              <span className="text-foreground">فایل بارگذاری شده: {fileName}</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!fileContent && (
          <div className="bg-accent/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-accent/30 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
              <div className="text-accent-foreground">
                <h3 className="font-bold mb-2">راهنمای استفاده:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>ابتدا فایل I2Languages.txt خود را آپلود کنید</li>
                  <li>لیست متن‌ها را دانلود کنید (فرمت: Term و متن انگلیسی)</li>
                  <li>ترجمه‌ها را زیر متن انگلیسی بنویسید (بین هر بلوک یک خط خالی بگذارید)</li>
                  <li>فایل ترجمه را ایمپورت کنید</li>
                  <li>فایل نهایی Unity را دانلود کنید</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Example Format */}
        {fileContent && extractedData.length > 0 && (
          <div className="bg-secondary/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-secondary/30 shadow-xl">
            <div className="text-secondary-foreground">
              <h3 className="font-bold mb-2">📝 فرمت فایل ترجمه:</h3>
              <pre className="bg-black/30 p-4 rounded-lg text-sm overflow-x-auto text-foreground" dir="ltr">
{`AIReactions/*yaaawn*
*خمیازه*

AIReactions/An empty pool? Seriously?
یک استخر خالی؟ جدی؟!

AIReactions/Awesome water shot!
عکس آبی فوق‌العاده!`}
              </pre>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="space-y-4">
          {/* دکمه آپلود فایل */}
          <label className="block cursor-pointer">
            <div className="bg-gradient-purple-blue hover:opacity-90 text-foreground px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]">
              <Upload className="w-6 h-6" />
              <span className="font-semibold text-lg">
                {fileContent ? "✅ فایل بارگذاری شد - کلیک برای تغییر" : "📂 انتخاب فایل Unity (I2Languages.txt)"}
              </span>
            </div>
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {extractedData.length > 0 && (
            <button
              onClick={handleExportTerms}
              className="bg-gradient-blue-cyan hover:opacity-90 text-foreground px-6 py-4 rounded-xl w-full flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]"
            >
              <Download className="w-6 h-6" />
              📤 دانلود لیست متن‌ها برای ترجمه ({extractedData.length} متن)
            </button>
          )}

          {fileContent && (
            <label className="block cursor-pointer">
              <div className="bg-gradient-green-emerald hover:opacity-90 text-foreground px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]">
                <Upload className="w-6 h-6" />
                📥 ایمپورت ترجمه‌ها (txt)
              </div>
              <input
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleImportTranslations}
              />
            </label>
          )}

          {fileContent && (
            <button
              onClick={handleDownloadFinal}
              className="bg-gradient-purple-pink hover:opacity-90 text-foreground px-6 py-4 rounded-xl w-full flex items-center justify-center gap-3 transition-all font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02]"
            >
              <Download className="w-6 h-6" />
              💾 دانلود فایل نهایی Unity با ترجمه‌ها
            </button>
          )}
        </div>

        {/* Preview Terms */}
        {extractedData.length > 0 && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
            <div className="bg-white/20 px-6 py-3 border-b border-white/10">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-success" />
                متن‌های استخراج شده ({extractedData.length})
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="space-y-3">
                {extractedData.slice(0, 50).map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors border border-white/10"
                  >
                    <div className="text-primary font-mono text-sm mb-1">
                      [{i + 1}] {item.term}
                    </div>
                    <div className="text-foreground text-sm">
                      {item.originalText}
                    </div>
                  </div>
                ))}
                {extractedData.length > 50 && (
                  <div className="text-center text-secondary-foreground text-sm py-2">
                    و {extractedData.length - 50} مورد دیگر...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!fileContent && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center shadow-2xl">
            <FileText className="w-24 h-24 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">آماده برای شروع</h2>
            <p className="text-secondary-foreground">فایل I2Languages.txt خود را آپلود کنید تا شروع کنیم</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
