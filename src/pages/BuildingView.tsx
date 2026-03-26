import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Door from '../components/Door';
import { authFetch } from '../App';
import type { User, Building, ProjectWithState } from '../types';
import { useI18n } from '../i18n';

export default function BuildingView({ user }: { user: User }) {
  const { t } = useI18n();
  const { buildingId } = useParams();
  const [projects, setProjects] = useState<ProjectWithState[]>([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      authFetch(`/api/buildings/${buildingId}`).then(res => {
        if (!res.ok) throw new Error('Failed to load building');
        return res.json();
      }),
      authFetch(`/api/student/buildings/${buildingId}/projects/${user.id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      }),
    ])
      .then(([buildingData, projectsData]) => {
        setBuilding(buildingData);
        
        const lang = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'zh';
        const localizedProjects = projectsData.map((p: any) => ({
          ...p,
          title: lang === 'de' ? (p.titleDe || p.title) : p.title
        }));
        
        setProjects(localizedProjects);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [buildingId, user.id]);

  const handleDoorClick = async (project: ProjectWithState) => {
    if (project.state === 'locked') {
      alert(t.lockedClassroom);
      return;
    }

    if (project.state === 'unlocked') {
      await authFetch(`/api/student/projects/${project.id}/start`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      });
    }

    navigate(`/classroom/${project.id}`);
  };

  if (loading) return <div className="text-center p-8 text-stone-500">{t.loading}</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!building) return <div className="text-center p-8 text-stone-500">{t.notFoundBuilding}</div>;

  const allTags = Array.from(new Set(projects.flatMap(p => p.tags || []))).sort();
  const displayedProjects = selectedTag 
    ? projects.filter(p => (p.tags || []).includes(selectedTag))
    : projects;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-xl transition-colors font-bold"
        >
          <ArrowLeft size={20} /> {t.backToCampus}
        </button>
      </div>

      <h1 className="text-4xl font-extrabold text-orange-600 text-center mb-4 drop-shadow-sm">
        {building.name}
      </h1>
      <p className="text-center text-stone-600 mb-12 max-w-2xl mx-auto">{building.description}</p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Main Content: Projects Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
            {displayedProjects.map((project, index) => (
              <Door
                key={project.id}
                project={project}
                index={index}
                onClick={() => handleDoorClick(project)}
              />
            ))}
            {displayedProjects.length === 0 && (
              <div className="col-span-full text-center text-stone-500 py-12">
                {selectedTag ? `No projects found for tag "${selectedTag}"` : t.noClassrooms}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Tags */}
        {allTags.length > 0 && (
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 sticky top-8">
              <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                🏷️ Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                      selectedTag === tag
                        ? 'bg-orange-500 text-white shadow-md transform scale-105'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="mt-4 w-full px-4 py-2 text-sm font-bold text-stone-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
