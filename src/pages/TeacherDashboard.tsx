import { useState, useEffect } from 'react';
import { BookOpen, Building2, Users, MessageCircle, Trophy } from 'lucide-react';
import ProjectsTab from './ProjectsTab';
import BuildingsTab from './BuildingsTab';
import StudentsTab from './StudentsTab';
import MessagesTab from './MessagesTab';
import RewardsTab from './RewardsTab';
import { authFetch } from '../App';
import { useI18n } from '../i18n';

type TabKey = 'projects' | 'buildings' | 'students' | 'messages' | 'rewards';

export default function TeacherDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('projects');
  const [unreadCount, setUnreadCount] = useState(0);

  const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key: 'projects', label: t.tabProjects, icon: BookOpen },
    { key: 'buildings', label: t.tabBuildings, icon: Building2 },
    { key: 'students', label: t.tabStudents, icon: Users },
    { key: 'messages', label: t.tabMessages, icon: MessageCircle },
    { key: 'rewards', label: t.tabRewards, icon: Trophy as any },
  ];

  useEffect(() => {
    const fetchUnread = () => {
      authFetch('/api/messages')
        .then(res => res.json())
        .then((msgs: any[]) => setUnreadCount(msgs.filter(m => !m.isRead).length))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-orange-800">{t.teacherDashboard}</h1>

        <div className="flex bg-orange-100 p-1 rounded-xl">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key === 'messages') setUnreadCount(0); }}
              className={`relative flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${activeTab === key
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-orange-800 hover:bg-orange-200/50'
                }`}
            >
              <Icon size={18} /> {label}
              {key === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'buildings' && <BuildingsTab />}
      {activeTab === 'students' && <StudentsTab />}
      {activeTab === 'messages' && <MessagesTab />}
      {activeTab === 'rewards' && <RewardsTab />}
    </div>
  );
}
