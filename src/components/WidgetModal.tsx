import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface WidgetModalProps {
  widgetId: number;
  widgetName: string;
  entryFile?: string;
  onClose: () => void;
}

export default function WidgetModal({ widgetId, widgetName, entryFile = 'index.html', onClose }: WidgetModalProps) {
  const src = `/widget-files/${widgetId}/${entryFile}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border-4 border-orange-200 flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: 1100, height: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-orange-400 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-white font-bold text-lg truncate">🔧 {widgetName}</span>
          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors"
              title="Im neuen Tab öffnen"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors ml-1"
              title="Schließen"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Iframe */}
        <iframe
          src={src}
          title={widgetName}
          className="flex-1 w-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
