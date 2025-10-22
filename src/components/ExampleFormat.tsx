export const ExampleFormat = () => {
  return (
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
  );
};
