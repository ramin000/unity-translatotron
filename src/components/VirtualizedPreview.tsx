import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check } from 'lucide-react';
import { ExtractedItem } from '@/store/translatorStore';

interface VirtualizedPreviewProps {
  data: ExtractedItem[];
  translationMap: Map<string, string>;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function VirtualizedPreview({ data, translationMap, containerRef }: VirtualizedPreviewProps) {
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="mt-6 bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
      <div className="bg-white/20 px-6 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-green-300" />
          پیش‌نمایش ({data.length.toLocaleString('fa-IR')})
        </h3>
      </div>
      
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualItem) => {
            const item = data[virtualItem.index];
            const hasTranslation = translationMap.has(item.term);
            const translation = translationMap.get(item.term);

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="px-4 py-2"
              >
                <div
                  className={`rounded-lg p-3 border transition-colors ${
                    hasTranslation
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-purple-300 text-xs font-mono truncate flex-1">
                      [{virtualItem.index + 1}] {item.term}
                    </div>
                    {hasTranslation && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">اصلی:</div>
                      <div className="text-white text-sm break-words">
                        {item.originalText || '(خالی)'}
                      </div>
                    </div>
                    
                    {hasTranslation && translation && (
                      <div>
                        <div className="text-xs text-green-400 mb-1">ترجمه:</div>
                        <div className="text-green-300 text-sm break-words">{translation}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
