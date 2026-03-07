import { useState } from 'react';
import { BookOpen, Building2, Users } from 'lucide-react';
import ProjectsTab from './ProjectsTab';
import BuildingsTab from './BuildingsTab';
import StudentsTab from './StudentsTab';

type TabKey = 'projects' | 'buildings' | 'students';

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: 'projects', label: 'Projects', icon: BookOpen },
  { key: 'buildings', label: 'Buildings', icon: Building2 },
  { key: 'students', label: 'Students', icon: Users },
];

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('projects');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-orange-800">Teacher Dashboard</h1>

        <div className="flex bg-orange-100 p-1 rounded-xl">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${activeTab === key
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-orange-800 hover:bg-orange-200/50'
                }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'buildings' && <BuildingsTab />}
      {activeTab === 'students' && <StudentsTab />}
    </div>
  );
}
