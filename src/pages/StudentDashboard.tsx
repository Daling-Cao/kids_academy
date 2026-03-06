import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard({ user }: { user: any }) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/student/buildings/${user.id}`)
      .then(res => res.json())
      .then(data => setBuildings(data));
  }, [user.id]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-extrabold text-orange-600 text-center mb-12 drop-shadow-sm">
        Welcome to the Campus!
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 justify-items-center mt-8">
        {buildings.map((building) => (
          <div 
            key={building.id}
            onClick={() => navigate(`/building/${building.id}`)}
            className="group relative flex flex-col items-center justify-end w-full max-w-sm cursor-pointer transition-all duration-300 hover:-translate-y-4"
          >
            {/* The Building Image */}
            <div className="relative z-10 w-full h-64 flex items-center justify-center">
              {building.coverImage ? (
                <img 
                  src={building.coverImage} 
                  alt={building.name} 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-48 h-48 bg-orange-200 rounded-3xl flex items-center justify-center transform rotate-3 drop-shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-orange-500 font-bold text-2xl">Building</span>
                </div>
              )}
            </div>
            
            {/* Floating Title & Action */}
            <div className="relative z-20 mt-4 flex flex-col items-center text-center">
              <h2 className="text-2xl font-black text-orange-900 bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-lg border-2 border-orange-100 group-hover:border-orange-400 group-hover:text-orange-600 transition-colors">
                {building.name}
              </h2>
              {building.description && (
                <p className="text-stone-700 mt-3 text-sm font-medium max-w-[250px] bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl">
                  {building.description}
                </p>
              )}
              <span className="absolute -bottom-12 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-orange-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md group-hover:translate-y-2">
                Enter Building &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
