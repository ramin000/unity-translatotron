import { AlertCircle } from 'lucide-react';

export const InstructionCard = () => {
  return (
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
  );
};
