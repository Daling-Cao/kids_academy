import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Door from '../components/Door';

export default function BuildingView({ user }: { user: any }) {
  const { buildingId } = useParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [building, setBuilding] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch building details
    fetch('/api/buildings')
      .then(res => res.json())
      .then(data => {
        const b = data.find((b: any) => b.id === Number(buildingId));
        setBuilding(b);
      });

    // Fetch projects for this building
    fetch(`/api/student/buildings/${buildingId}/projects/${user.id}`)
      .then(res => res.json())
      .then(data => setProjects(data));
  }, [buildingId, user.id]);

  const handleDoorClick = async (project: any) => {
    if (project.state === 'locked') {
      alert('This classroom is locked! Complete the previous one first.');
      return;
    }
    
    if (project.state === 'unlocked') {
      await fetch(`/api/student/projects/${project.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
    }
    
    navigate(`/classroom/${project.id}`);
  };

  if (!building) return <div className="text-center p-8">Loading building...</div>;

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
