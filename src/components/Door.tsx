import { Lock, Unlock, Play, CheckCircle, GraduationCap } from 'lucide-react';

export default function Door({ project, index, onClick }: { project: any, index: number, onClick: () => void | Promise<void>, key?: any }) {
  const { title, coverImage, state } = project;
  
  // Define styles based on state
  let doorColor = 'bg-stone-300';
  let icon = null;
  let label = '';
  
  if (state === 'locked') {
    doorColor = 'bg-red-400';
    icon = <Lock size={48} className="text-stone-800" />;
    label = 'Locked';
  } else if (state === 'unlocked') {
    doorColor = 'bg-blue-400';
    icon = <Unlock size={48} className="text-white" />;
    label = 'Ready to Start';
  } else if (state === 'in-progress') {
    doorColor = 'bg-yellow-400';
    icon = <Play size={48} className="text-orange-800" />;
    label = 'In Progress';
  } else if (state === 'completed') {
    doorColor = 'bg-green-400';
    icon = <CheckCircle size={48} className="text-white" />;
    label = 'Completed';
  }

  return (
    <div 
      className={`relative w-48 h-72 rounded-t-full shadow-xl cursor-pointer transition-transform hover:scale-105 ${
        state === 'locked' ? 'opacity-80' : ''
      }`}
      onClick={onClick}
    >
      {/* Door Frame */}
      <div className="absolute inset-0 border-8 border-stone-800 rounded-t-full overflow-hidden">
        {/* Door Background */}
        <div className={`w-full h-full ${doorColor} flex flex-col items-center justify-center relative`}>
          
          {/* Cover Image (if unlocked or completed) */}
          {state !== 'locked' && coverImage && (
            <div className="absolute inset-0 opacity-30 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }} />
          )}

          {/* Chains for locked state */}
          {state === 'locked' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-4 bg-stone-700 transform rotate-45 absolute shadow-md border-y border-stone-900"></div>
              <div className="w-full h-4 bg-stone-700 transform -rotate-45 absolute shadow-md border-y border-stone-900"></div>
            </div>
          )}
          
          {/* Icon */}
          <div className="z-10 bg-white/30 p-4 rounded-full backdrop-blur-sm shadow-inner">
            {icon}
          </div>
          
          {/* Door Knob */}
          <div className="absolute right-4 top-1/2 w-4 h-4 bg-yellow-600 rounded-full shadow-md border border-yellow-800"></div>
          
          {/* Label */}
          <div className="absolute bottom-4 z-10 bg-stone-900/80 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
            {label}
          </div>
        </div>
      </div>
      
      {/* Graduation Cap */}
      {state === 'completed' && (
        <div className="absolute -top-8 -right-4 z-20 animate-bounce">
          <GraduationCap size={64} className="text-yellow-500 drop-shadow-lg" />
        </div>
      )}
      
      {/* Title Plate */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-stone-800 text-white px-4 py-1 rounded-md shadow-md border-2 border-stone-600 whitespace-nowrap z-10">
        <span className="font-bold text-sm">Room {index + 1}: {title}</span>
      </div>
    </div>
  );
}
