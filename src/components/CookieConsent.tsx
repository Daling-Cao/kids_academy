import { useState, useEffect } from 'react';
import { Shield, X, Cookie, ChevronDown, ChevronUp } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
}

const texts = {
  zh: {
    title: '我们使用 Cookie 和其他技术',
    description:
      '本网站使用 Cookie 及类似技术来处理终端设备信息和个人数据。处理目的包括嵌入第三方内容和服务、统计分析以及记住您的偏好设置。您的同意是自愿的，不影响网站的基本使用。您可以随时通过页面底部的"Cookie 设置"链接更改或撤销您的选择。',
    acceptAll: '全部接受',
    rejectAll: '拒绝',
    settings: '设置',
    saveSettings: '保存设置',
    necessary: '必要 Cookie',
    necessaryDesc: '网站正常运行所必需的 Cookie，无法关闭。',
    analytics: '分析 Cookie',
    analyticsDesc: '帮助我们了解访客如何使用网站，以便改进服务。',
    preferences: '偏好 Cookie',
    preferencesDesc: '记住您的语言、主题等个性化设置。',
    alwaysOn: '始终开启',
  },
  de: {
    title: 'Wir nutzen Cookies und andere Technologien',
    description:
      'Diese Website nutzt Cookies und vergleichbare Funktionen zur Verarbeitung von Endgeräteinformationen und personenbezogenen Daten. Die Verarbeitung dient der Einbindung von Inhalten, externen Diensten und Elementen Dritter, der statistischen Analyse/Messung sowie der Speicherung Ihrer Einstellungen. Ihre Einwilligung ist stets freiwillig, für die Nutzung unserer Website nicht erforderlich und kann jederzeit über den im Footer aufgeführten Link "Cookie Einstellungen" abgelehnt oder widerrufen werden.',
    acceptAll: 'Alles akzeptieren',
    rejectAll: 'Ablehnen',
    settings: 'Einstellungen',
    saveSettings: 'Einstellungen speichern',
    necessary: 'Notwendige Cookies',
    necessaryDesc: 'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.',
    analytics: 'Analyse-Cookies',
    analyticsDesc: 'Helfen uns zu verstehen, wie Besucher die Website nutzen, um unseren Service zu verbessern.',
    preferences: 'Präferenz-Cookies',
    preferencesDesc: 'Speichern Ihre Sprach-, Design- und andere persönliche Einstellungen.',
    alwaysOn: 'Immer aktiv',
  },
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    preferences: false,
  });

  const lang = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'zh';
  const t = texts[lang];

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay for a smoother entrance
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const all: ConsentState = { necessary: true, analytics: true, preferences: true };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(all));
    setVisible(false);
  };

  const handleReject = () => {
    const minimal: ConsentState = { necessary: true, analytics: false, preferences: false };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(minimal));
    setVisible(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />

      {/* Consent dialog */}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
        style={{ animation: 'slideUp 0.4s ease-out' }}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-700 to-stone-800 px-6 py-5 flex items-center gap-3">
            <Cookie className="text-orange-300 shrink-0" size={28} />
            <h2 className="text-xl font-bold text-white leading-tight">{t.title}</h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-stone-600 text-sm leading-relaxed mb-6">
              {t.description}
            </p>

            {/* Settings panel */}
            {showSettings && (
              <div className="space-y-3 mb-6 rounded-xl bg-stone-50 p-4 border border-stone-200">
                {/* Necessary cookies — always on */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-100">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-600" />
                      <span className="font-semibold text-stone-800 text-sm">{t.necessary}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{t.necessaryDesc}</p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {t.alwaysOn}
                  </span>
                </div>

                {/* Analytics cookies */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-100">
                  <div className="flex-1 mr-4">
                    <span className="font-semibold text-stone-800 text-sm">{t.analytics}</span>
                    <p className="text-xs text-stone-500 mt-1">{t.analyticsDesc}</p>
                  </div>
                  <button
                    onClick={() => setConsent(c => ({ ...c, analytics: !c.analytics }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${consent.analytics ? 'bg-orange-500' : 'bg-stone-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${consent.analytics ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Preferences cookies */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-100">
                  <div className="flex-1 mr-4">
                    <span className="font-semibold text-stone-800 text-sm">{t.preferences}</span>
                    <p className="text-xs text-stone-500 mt-1">{t.preferencesDesc}</p>
                  </div>
                  <button
                    onClick={() => setConsent(c => ({ ...c, preferences: !c.preferences }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${consent.preferences ? 'bg-orange-500' : 'bg-stone-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${consent.preferences ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReject}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100 hover:border-stone-400 transition-all active:scale-[0.98]"
              >
                {t.rejectAll}
              </button>
              <button
                onClick={() => {
                  if (showSettings) {
                    handleSaveSettings();
                  } else {
                    setShowSettings(true);
                  }
                }}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-orange-300 text-orange-700 font-bold text-sm hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {showSettings ? t.saveSettings : t.settings}
                {!showSettings && <ChevronDown size={16} />}
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
              >
                {t.acceptAll}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-center gap-4 text-xs text-stone-400">
            <a href="#" className="hover:text-stone-600 transition-colors">Impressum</a>
            <span>|</span>
            <a href="#" className="hover:text-stone-600 transition-colors">Datenschutzhinweis</a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
