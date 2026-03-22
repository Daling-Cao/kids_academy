import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../App';
import MessageButton from '../components/MessageButton';
import StudentInbox from '../components/StudentInbox';
import type { User, Building, StudentCoinInfo } from '../types';

export default function StudentDashboard({ user }: { user: User }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coinInfo, setCoinInfo] = useState<StudentCoinInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/student/buildings/${user.id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load buildings');
        return res.json();
      }),
      authFetch(`/api/student/coins/${user.id}`).then(res => res.json()).catch(() => null),
    ])
      .then(([buildingsData, coinsData]) => {
        setBuildings(buildingsData);
        if (coinsData) setCoinInfo(coinsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="text-center p-8 text-stone-500">Loading campus...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ─── BlockCoin & Rank Card ─── */}
      {coinInfo && (
        <div className="mb-10 mx-auto max-w-lg">
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl shadow-xl border-2 border-amber-200/60 p-6 relative overflow-hidden">
            {/* Decorative sparkle */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-200/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-orange-200/20 rounded-full blur-xl" />

            <div className="relative z-10 flex items-center gap-5">
              {/* Rank Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-200/50 shrink-0 overflow-hidden">
                {coinInfo.rank?.icon?.startsWith('http') || coinInfo.rank?.icon?.startsWith('/') || coinInfo.rank?.icon?.startsWith('data:') ? (
                  <img src={coinInfo.rank.icon} alt={coinInfo.rank.name} className="w-full h-full object-cover" />
                ) : (
                  coinInfo.rank?.icon || '⭐'
                )}
              </div>

              <div className="flex-grow min-w-0">
                {/* Rank Name */}
                <div className="text-sm font-bold text-orange-500 uppercase tracking-wider">
                  {coinInfo.rank?.name || 'No Rank'}
                </div>

                {/* Coin Count */}
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-stone-800">{coinInfo.coins}</span>
                  <span className="text-sm font-bold text-amber-600">BlockCoin 🪙</span>
                </div>

                {/* Progress Bar */}
                {coinInfo.nextRank && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-medium text-stone-500 mb-1">
                      <span>{coinInfo.rank?.name}</span>
                      <span className="flex items-center gap-1">
                        {coinInfo.nextRank.icon?.startsWith('http') || coinInfo.nextRank.icon?.startsWith('/') || coinInfo.nextRank.icon?.startsWith('data:') ? (
                          <img src={coinInfo.nextRank.icon} alt={coinInfo.nextRank.name} className="w-4 h-4 object-cover rounded-sm inline-block" />
                        ) : (
                          coinInfo.nextRank.icon
                        )}
                        {coinInfo.nextRank.name} ({coinInfo.nextRank.threshold})
                      </span>
                    </div>
                    <div className="h-2.5 bg-stone-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(coinInfo.progress * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {!coinInfo.nextRank && coinInfo.rank && (
                  <div className="mt-2 text-xs font-bold text-amber-600">✨ Max Rank Achieved!</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
      <MessageButton user={user} />
      <StudentInbox user={user} />
    </div>
  );
}
