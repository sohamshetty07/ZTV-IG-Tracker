import React from 'react';
import { TrendingUp, Users, PlayCircle, ExternalLink, Clock } from 'lucide-react';

// The 8-Tier Intensity Engine
export const getViewRateIntensity = (rateStr: string) => {
  if (!rateStr || rateStr === '-') return 'text-neutral-400 dark:text-neutral-600';
  
  const rate = parseFloat(rateStr.replace('%', ''));
  if (isNaN(rate)) return 'text-neutral-400 dark:text-neutral-600';

  if (rate < 2) return 'text-neutral-400 dark:text-neutral-600'; 
  if (rate < 5) return 'text-emerald-300 dark:text-emerald-900/80'; 
  if (rate < 10) return 'text-emerald-400 dark:text-emerald-800'; 
  if (rate < 15) return 'text-emerald-500 dark:text-emerald-600'; 
  if (rate < 25) return 'text-emerald-600 dark:text-emerald-500'; 
  if (rate < 50) return 'text-emerald-700 dark:text-emerald-400'; 
  if (rate < 100) return 'text-emerald-800 dark:text-emerald-300'; 
  
  // Hyper-Viral: Adds a physical glowf effect in Dark Mode
  return 'text-emerald-950 dark:text-emerald-200 dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] font-black tracking-tighter'; 
};

export default function ActorCard({ actor }: { actor: any }) {
  const m = actor.metrics;
  const hasData = m && m.formattedFollowers !== '-';
  
  const getTierBadge = (followers: number) => {
    if (followers >= 1000000) return { label: 'Mega', color: 'bg-black text-white dark:bg-white dark:text-black' };
    if (followers >= 100000) return { label: 'Macro', color: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200' };
    if (followers >= 10000) return { label: 'Micro', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    return { label: 'Nano', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-500' };
  };

  const exactInt = parseInt(String(m?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
  const tier = hasData ? getTierBadge(exactInt) : { label: 'Pending', color: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-600' };

  // Calculate the intensity color once for this card
  const intensityClass = hasData ? getViewRateIntensity(m.viewRate) : 'text-neutral-400 dark:text-neutral-600';

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-none hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 flex flex-col group">
      
      <div className="p-5 flex items-start space-x-5">
        <div className="flex flex-col items-center flex-shrink-0 w-20">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden border border-neutral-200 dark:border-neutral-800 transition-colors">
            {actor.headshotUrl ? (
              <img src={actor.headshotUrl} alt={actor.realName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-2xl">{actor.realName.charAt(0)}</div>
            )}
          </div>
          <span className={`mt-3 text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${tier.color}`}>
            {tier.label}
          </span>
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-lg font-black text-neutral-900 dark:text-white leading-tight whitespace-normal break-words tracking-tight">{actor.realName}</h3>
          
          <a href={`https://instagram.com/${actor.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center mt-1 w-fit transition-colors">
            @{actor.handle} <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </a>
          
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
              {actor.showName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" /> {actor.timeSlot}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1 flex-1 flex flex-col justify-end">
        {hasData ? (
          <div className="bg-neutral-50 dark:bg-[#111111] rounded-xl p-4 grid grid-cols-2 gap-4 border border-neutral-100 dark:border-neutral-800/50">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-600 mb-1">Followers</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.formattedFollowers}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-600 mb-1">Avg Views</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.avgReelViews}</p>
            </div>
            <div className="col-span-2 pt-2 flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-1">View Rate (Attention)</p>
                {/* DYNAMIC INTENSITY APPLIED HERE */}
                <p className={`text-3xl font-black leading-none ${intensityClass}`}>
                  {m.viewRate}
                </p>
              </div>
              <TrendingUp className={`w-5 h-5 mb-1 ${intensityClass}`}/>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-neutral-400 italic bg-neutral-50 dark:bg-[#111] rounded-xl">Awaiting data...</div>
        )}
      </div>
    </div>
  );
}