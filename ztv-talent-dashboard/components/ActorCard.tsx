import React from 'react';
import { TrendingUp, ExternalLink, Clock, MessageCircle, Heart, Users, PlayCircle, Tv, Monitor } from 'lucide-react';

export default function ActorCard({ actor, showAnalytics = false }: { actor: any, showAnalytics?: boolean }) {
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

  // NAME HIERARCHY LOGIC: Prioritize Reel Name
  const isReelNameValid = actor.reelName && actor.reelName !== '-';
  const primaryName = isReelNameValid ? actor.reelName : actor.realName;
  const secondaryName = isReelNameValid ? actor.realName : null;

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-none hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 flex flex-col group h-full">
      
      <div className="p-5 flex items-start space-x-4">
        <div className="flex flex-col items-center flex-shrink-0 w-16 sm:w-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden border border-neutral-200 dark:border-neutral-800 transition-colors">
            {actor.headshotUrl ? (
              <img src={actor.headshotUrl} alt={actor.realName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xl sm:text-2xl">{actor.realName.charAt(0)}</div>
            )}
          </div>
          <span className={`mt-3 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${tier.color}`}>
            {tier.label}
          </span>
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          {/* PRIMARY IDENTIFIER (Reel Name) */}
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-tight whitespace-normal break-words tracking-tight">{primaryName}</h3>
          
          {/* SECONDARY IDENTIFIER (Real Name) */}
          {secondaryName && (
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {secondaryName}
            </p>
          )}

          {/* CONTEXT: Channel, Show & Time Slot */}
          <div className="mt-2 flex flex-col gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center line-clamp-1"><Monitor className="w-3 h-3 mr-1.5 shrink-0"/> {actor.channel}</div>
            <div className="flex items-center line-clamp-1"><Tv className="w-3 h-3 mr-1.5 shrink-0"/> {actor.showName}</div>
            <div className="flex items-center"><Clock className="w-3 h-3 mr-1.5 shrink-0"/> {actor.timeSlot}</div>
          </div>
          
          <a href={`https://instagram.com/${actor.handle}`} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center mt-2 w-fit transition-colors">
            @{actor.handle} <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </a>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1 flex-1 flex flex-col justify-end">
        {hasData ? (
          showAnalytics ? (
            <div className="bg-neutral-50 dark:bg-[#111111] rounded-xl p-4 flex flex-col justify-between h-full border border-neutral-100 dark:border-neutral-800/50">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4 border-b border-neutral-200 dark:border-neutral-800/50 pb-4">
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5"><Users className="w-3 h-3 mr-1"/> Followers</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.formattedFollowers}</p>
                </div>
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5"><PlayCircle className="w-3 h-3 mr-1"/> Avg Views</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.avgReelViews}</p>
                </div>
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5"><Heart className="w-3 h-3 mr-1"/> Likes</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.avgPhotoLikes || '-'}</p>
                </div>
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5"><MessageCircle className="w-3 h-3 mr-1"/> Comments</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-200 leading-none">{m.avgComments || '-'}</p>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-1">View Rate (Attention)</p>
                  <p className="text-2xl font-bold leading-none text-emerald-600 dark:text-emerald-500">
                    {m.viewRate}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 mb-1 text-emerald-600 dark:text-emerald-500"/>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 dark:bg-[#111111] rounded-xl p-3 flex items-center justify-between border border-neutral-100 dark:border-neutral-800/50">
              <p className="flex items-center text-[10px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400"><Users className="w-4 h-4 mr-2"/> Audience Volume</p>
              <p className="text-base font-black text-black dark:text-white leading-none tracking-tight">{m.formattedFollowers}</p>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-neutral-400 italic bg-neutral-50 dark:bg-[#111] rounded-xl border border-neutral-100 dark:border-neutral-800/50">Awaiting data...</div>
        )}
      </div>
    </div>
  );
}