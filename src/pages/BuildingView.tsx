import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Door from '../components/Door';
import { authFetch } from '../App';
import type { User, Building, ProjectWithState } from '../types';

export default function BuildingView({ user }: { user: User }) {
  const { buildingId } = useParams();
  const [projects, setProjects] = useState<ProjectWithState[]>([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        setProjects(projectsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [buildingId, user.id]);

  const handleDoorClick = async (project: ProjectWithState) => {
    if (project.state === 'locked') {
      alert('This classroom is locked! Complete the previous one first.');
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

  if (loading) return <div className="text-center p-8 text-stone-500">Loading building...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!building) return <div className="text-center p-8 text-stone-500">Building not found.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-xl transition-colors font-bold"
        >
          <ArrowLeft size={20} /> Back to Campus
        </button>
      </div>

      <h1 className="text-4xl font-extrabold text-orange-600 text-center mb-4 drop-shadow-sm">
        {building.name}
      </h1>
      <p className="text-center text-stone-600 mb-12 max-w-2xl mx-auto">{building.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 justify-items-center">
        {projects.map((project, index) => (
          <Door
            key={project.id}
            project={project}
            index={index}
            onClick={() => handleDoorClick(project)}
          />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center text-stone-500 py-12">
            No classrooms available in this building yet.
          </div>
        )}
      </div>
    </div>
  );
}
