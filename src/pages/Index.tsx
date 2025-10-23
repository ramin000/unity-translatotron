import React, { useState, useEffect } from "react";
import { FileText, Upload, Download, Check, AlertCircle, Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtractedItem {
  term: string;
  originalText: string;
  dataLineIndex?: number;
}

function extractTermsChunked(content: string, targetIndex: number, onProgress?: (p: number) => void): Promise<ExtractedItem[]> {
  return new Promise((resolve) => {
    const lines = content.split('\n');
    const total = lines.length;
    const CHUNK = 1000;
    let idx = 0;
    const list: ExtractedItem[] = [];
    let term: ExtractedItem | null = null;
    let found = false;
    let bracket = -1;

    function process() {
      const end = Math.min(idx + CHUNK, total);
      for (let i = idx; i < end; i++) {
        const line = lines[i];
        const tm = line.match(/string Term = "(.+?)"/);
        if (tm) {
          if (term) list.push(term);
          term = { term: tm[1], originalText: '' };
          found = false;
          bracket = -1;
        }
        const bm = line.match(/^\s*\[(\d+)\]/);
        if (bm && term) bracket = parseInt(bm[1]);
        if (term && !found && bracket === targetIndex) {
          const next = lines[i + 1];
          if (next) {
            const dm = next.match(/string data = "(.*)"/);
            if (dm) {
              term.originalText = dm[1];
              term.dataLineIndex = i + 1;
              found = true;
            }
          }
        }
      }
      idx = end;
      if (onProgress) onProgress(Math.round((idx / total) * 100));
      if (idx < total) setTimeout(process, 0);
      else {
        if (term) list.push(term);
        resolve(list);
      }
    }
    process();
  });
}

function reverseText(text: string): string {
  const map: Record<string, string> = { 'ك': 'ک', 'ي': 'ی', 'ة': 'ه', 'أ': 'ا', 'إ': 'ا' };
  return text.replace(/./g, c => map[c] || c).split('').reverse().join('');
}

function parseTranslations(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const blocks = content.split(/\n{2,}/).filter(Boolean);
  blocks.forEach(b => {
    const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) map.set(lines[0], lines[1]);
  });
  return map;
}

function applyTranslations(content: string, data: ExtractedItem[], map: Map<string, string>): { updated: string; count: number } {
  const lines = content.split('\n');
  let count = 0;
  data.forEach(item => {
    const trans = map.get(item.term);
    if (trans && item.dataLineIndex !== undefined) {
      const orig = lines[item.dataLineIndex];
      const indent = orig.match(/^(\s*)/)?.[0] || '';
      lines[item.dataLineIndex] = `${indent}string data = "${trans}"`;
      count++;
    }
  });
  return { updated: lines.join('\n').replace(/\r\n/g, '\n'), count };
}

function generateReversed(content: string, data: ExtractedItem[], map: Map<string, string>): string {
  const lines = content.split('\n');
  data.forEach(item => {
    const trans = map.get(item.term);
    if (trans && item.dataLineIndex !== undefined) {
      const reversed = reverseText(trans);
      const orig = lines[item.dataLineIndex];
      const indent = orig.match(/^(\s*)/)?.[0] || '';
      lines[item.dataLineIndex] = `${indent}string data = "${reversed}"`;
    }
  });
  return lines.join('\n').replace(/\r\n/g, '\n');
}

function download(data: string, name: string): void {
  const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFileName(orig: string, suffix: string): string {
  if (!orig) return `output${suffix}.txt`;
  const dot = orig.lastIndexOf('.');
  return dot > 0 ? orig.slice(0, dot) + suffix + orig.slice(dot) : orig + suffix;
}

export default function UnityTextTranslator() {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<ExtractedItem[]>([]);
  const [map, setMap] = useState<Map<string, string>>(new Map());
  const [reverse, setReverse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<any>(null);
  const [drag, setDrag] = useState(false);
  const [visible, setVisible] = useState(50);
  const [search, setSearch] = useState("");
  const [langIndex, setLangIndex] = useState(0);

  const showToast = (title: string, desc: string, variant = "default") => {
    setToast({ title, desc, variant });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleDownloadFinal(); }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); document.getElementById('file')?.click(); }
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); if (data.length) handleExport(); }
      if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.getElementById('import')?.click(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [content, data]);

  const validate = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      showToast("خطا", "فقط فایل txt", "destructive");
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("خطا", "حجم زیاد", "destructive");
      return false;
    }
    return true;
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !validate(file)) return;
    setLoading(true);
    setProgress(0);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        if (!text?.trim()) {
          showToast("خطا", "فایل خالی", "destructive");
          setLoading(false);
          return;
        }
        if (!text.includes('string Term =')) {
          showToast("خطا", "فایل نامعتبر", "destructive");
          setLoading(false);
          return;
        }
        setContent(text);
        const extracted = await extractTermsChunked(text, langIndex, p => setProgress(p));
        if (extracted.length === 0) {
          showToast("هشدار", "متنی یافت نشد", "destructive");
        } else {
          showToast("موفق", `${extracted.length} متن استخراج شد`);
        }
        setData(extracted);
      } catch (err) {
        showToast("خطا", "خطای پردازش", "destructive");
      } finally {
        setLoading(false);
        setProgress(0);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExport = () => {
    if (!data.length) return;
    const txt = data.map(i => `${i.term}\n${i.originalText}`).join('\n\n');
    download(txt, getFileName(fileName, '_Terms'));
    showToast("دانلود", `${data.length} متن`);
  };

  const handleExportJSON = () => {
    if (!data.length) return;
    download(JSON.stringify(data, null, 2), getFileName(fileName, '.json'));
    showToast("دانلود", "JSON");
  };

  const handleExportCSV = () => {
    if (!data.length) return;
    const csv = "Term,Text,Translation\n" + data.map(i => `"${i.term}","${i.originalText}","${map.get(i.term) || ''}"`).join('\n');
    download(csv, getFileName(fileName, '.csv'));
    showToast("دانلود", "CSV");
  };

  const handleImport = async (file: File | null) => {
    if (!file || !validate(file)) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const txt = ev.target?.result as string;
        if (!txt?.trim()) {
          showToast("خطا", "فایل خالی", "destructive");
          setLoading(false);
          return;
        }
        const newMap = parseTranslations(txt);
        if (newMap.size === 0) {
          showToast("خطا", "ترجمه‌ای نیست", "destructive");
          setLoading(false);
          return;
        }
        const { updated, count } = applyTranslations(content, data, newMap);
        setContent(updated);
        setMap(newMap);
        showToast("موفق", `${count} ترجمه اعمال شد`);
      } catch (err) {
        showToast("خطا", "فرمت نامعتبر", "destructive");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadFinal = () => {
    if (!content) {
      showToast("خطا", "فایلی نیست", "destructive");
      return;
    }
    const final = reverse && map.size > 0 ? generateReversed(content, data, map) : content;
    download(final, getFileName(fileName, reverse ? '_Reversed' : '_Translated'));
    showToast("موفق", "دانلود شد");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  const filtered = search ? data.filter(i => i.term.toLowerCase().includes(search.toLowerCase()) || i.originalText.toLowerCase().includes(search.toLowerCase())) : data;
  const translated = Array.from(map.keys()).filter(k => map.get(k)?.trim()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {toast && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
            <Alert className={`${toast.variant === 'destructive' ? 'bg-red-500/90' : 'bg-green-500/90'} text-white border-0 shadow-2xl`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-bold">{toast.title}</div>
                <div className="text-sm">{toast.desc}</div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-4">
            <FileText className="w-12 h-12 text-yellow-300" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">Unity I2 Translator Pro</h1>
              <p className="text-blue-200 text-sm">انتخاب زبان • RTL-Fix • JSON/CSV</p>
            </div>
          </div>
          {fileName && (
            <div className="mt-4 bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-300" />
              <span className="text-white text-sm truncate">{fileName}</span>
            </div>
          )}
        </div>

        {!content && (
          <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
            <label className="block text-white text-sm font-semibold mb-2">انتخاب زبان:</label>
            <select value={langIndex} onChange={e => setLangIndex(+e.target.value)} className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2">
              {[...Array(13)].map((_, i) => (
                <option key={i} value={i} className="bg-gray-800">Index [{i}] {i === 0 ? '(پیش‌فرض)' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {loading && progress > 0 && (
          <div className="mb-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex justify-between text-sm text-blue-200 mb-2">
              <span>در حال پردازش...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className="mb-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex justify-between text-xs text-blue-200 mb-2">
              <span>پیشرفت ترجمه</span>
              <span>{translated}/{data.length}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: `${data.length ? (translated / data.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className="mb-4">
          <label className="block cursor-pointer">
            <div className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg border-2 transition-all ${drag ? 'border-yellow-400 scale-105' : 'border-transparent'}`}>
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-semibold">پردازش...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="font-semibold">{content ? "✅ آپلود شد" : "📂 آپلود فایل"}</span>
                </>
              )}
            </div>
            <input id="file" type="file" accept=".txt" className="hidden" onChange={e => handleUpload(e.target.files?.[0] || null)} disabled={loading} />
          </label>
        </div>

        <div className="space-y-3">
          {data.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <button onClick={handleExport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <Download className="w-5 h-5" />
                TXT
              </button>
              <button onClick={handleExportJSON} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <Download className="w-5 h-5" />
                JSON
              </button>
              <button onClick={handleExportCSV} disabled={loading} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <Download className="w-5 h-5" />
                CSV
              </button>
            </div>
          )}

          {content && (
            <label className="block cursor-pointer">
              <div className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 font-semibold">
                <Upload className="w-6 h-6" />
                ایمپورت ترجمه
              </div>
              <input id="import" type="file" accept=".txt" className="hidden" onChange={e => handleImport(e.target.files?.[0] || null)} disabled={loading} />
            </label>
          )}

          {content && (
            <div className="flex gap-3">
              <button onClick={() => setReverse(v => !v)} disabled={loading} className={`px-4 py-3 rounded-xl border-2 font-semibold ${reverse ? 'bg-rose-600 text-white border-rose-500' : 'bg-transparent text-rose-300 border-rose-300'}`}>
                {reverse ? '✅ RTL' : '🔄 RTL'}
              </button>
              <button onClick={handleDownloadFinal} disabled={loading} className="flex-1 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <Download className="w-5 h-5" />
                دانلود نهایی
              </button>
            </div>
          )}
        </div>

        {data.length > 0 && (
          <div className="mt-6 bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/20 text-white placeholder-gray-300 pr-10 pl-4 py-3 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            {search && <div className="mt-2 text-blue-200 text-sm">{filtered.length} نتیجه</div>}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-6 bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <div className="bg-white/20 px-6 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Check className="w-4 h-4 text-green-300" />
                پیش‌نمایش ({filtered.length})
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="space-y-2">
                {filtered.slice(0, visible).map((item, i) => {
                  const hasTrans = map.has(item.term);
                  return (
                    <div key={i} className={`rounded-lg p-3 border ${hasTrans ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-purple-300 text-xs font-mono truncate flex-1">[{i + 1}] {item.term}</div>
                        {hasTrans && <Check className="w-4 h-4 text-green-400" />}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">اصلی:</div>
                          <div className="text-white text-sm truncate">{item.originalText || '(خالی)'}</div>
                        </div>
                        {hasTrans && (
                          <div>
                            <div className="text-xs text-green-400 mb-1">ترجمه:</div>
                            <div className="text-green-300 text-sm truncate">{map.get(item.term)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {visible < filtered.length && (
                <button onClick={() => setVisible(v => Math.min(v + 50, filtered.length))} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">
                  نمایش بیشتر ({filtered.length - visible})
                </button>
              )}
            </div>
          </div>
        )}

        {!content && !loading && (
          <div className="mt-6 bg-white/10 rounded-2xl p-12 border border-white/20 text-center">
            <FileText className="w-20 h-20 text-purple-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">آماده برای شروع</h2>
            <p className="text-blue-200 text-sm">فایل Unity I2Languages را آپلود کنید</p>
          </div>
        )}

        {data.length > 0 && (
          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-blue-200 text-xs mb-1">کل</div>
                <div className="text-white text-xl font-bold">{data.length}</div>
              </div>
              <div>
                <div className="text-green-200 text-xs mb-1">ترجمه</div>
                <div className="text-white text-xl font-bold">{translated}</div>
              </div>
              <div>
                <div className="text-yellow-200 text-xs mb-1">باقی</div>
                <div className="text-white text-xl font-bold">{data.length - translated}</div>
              </div>
              <div>
                <div className="text-purple-200 text-xs mb-1">زبان</div>
                <div className="text-white text-xl font-bold">[{langIndex}]</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-blue-200 text-xs">
          <p>Unity I2 Translator Pro v2.0</p>
        </div>
      </div>
    </div>
  );
}
