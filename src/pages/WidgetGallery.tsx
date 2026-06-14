import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authFetch } from '../App';
import WidgetModal from '../components/WidgetModal';
import type { Widget } from '../types';
import { useI18n } from '../i18n';

export default function WidgetGallery() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);

  useEffect(() => {
    authFetch('/api/widgets')
      .then(r => r.json())
      .then(data => { setWidgets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-stone-500">{t.loading}</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-xl transition-colors font-bold"
        >
          <ArrowLeft size={20} /> {t.backToCampus}
        </button>
      </div>

      <h1 className="text-4xl font-extrabold text-orange-600 text-center mb-4 drop-shadow-sm">
        🔧 {t.widgetLibrary}
      </h1>
      <p className="text-center text-stone-500 mb-12 max-w-xl mx-auto">{t.widgetLibraryDesc}</p>

      {widgets.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-6xl mb-4">🔧</p>
          <p className="text-lg font-medium">{t.noWidgets}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {widgets.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWidget(w)}
              className="group text-left bg-white rounded-2xl shadow-md border-2 border-stone-100 hover:border-orange-300 hover:shadow-xl transition-all duration-200 overflow-hidden"
            >
              {/* Placeholder thumbnail */}
              <div className="h-36 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center border-b border-stone-100 group-hover:from-orange-200 transition-colors">
                <span className="text-5xl">🔧</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-stone-800 text-lg leading-tight">{w.name}</h3>
                {w.description && (
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{w.description}</p>
                )}
                <div className="mt-3 text-xs font-bold text-orange-500 group-hover:text-orange-600 uppercase tracking-wide">
                  {t.openWidget} →
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeWidget && (
        <WidgetModal
          widgetId={activeWidget.id}
          widgetName={activeWidget.name}
          entryFile={activeWidget.entryFile}
          onClose={() => setActiveWidget(null)}
        />
      )}
    </div>
  );
}
