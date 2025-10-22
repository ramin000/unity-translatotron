import { Check } from 'lucide-react';

interface ExtractedItem {
  term: string;
  originalText: string;
  lineIndex: number;
  dataLineIndex?: number;
}

interface TranslationPreviewProps {
  data: ExtractedItem[];
}

export const TranslationPreview = ({ data }: TranslationPreviewProps) => {
  if (data.length === 0) return null;

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
      <div className="bg-white/20 px-6 py-3 border-b border-white/10">
        <h3 className="text-foreground font-semibold flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          متن‌های استخراج شده ({data.length})
        </h3>
      </div>
      <div className="max-h-96 overflow-y-auto p-4">
        <div className="space-y-3">
          {data.slice(0, 50).map((item) => (
            <div
              key={item.term}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors border border-white/10"
            >
              <div className="text-primary font-mono text-sm mb-1">
                {item.term}
              </div>
              <div className="text-foreground text-sm">
                {item.originalText}
              </div>
            </div>
          ))}
          {data.length > 50 && (
            <div className="text-center text-secondary-foreground text-sm py-2">
              و {data.length - 50} مورد دیگر...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
