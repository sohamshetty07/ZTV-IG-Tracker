"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ActorCard from './ActorCard';
import { Search, Moon, Sun, Filter, LayoutGrid, List, Download, PanelLeftClose, PanelLeftOpen, Share2, Check, Clock, ChevronDown, ChevronUp, Users, Tv } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function DashboardClient({ initialActors, lastSync }: { initialActors: any[], lastSync: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseUrlArray = (param: string | null) => param ? param.split(',') : [];

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(parseUrlArray(searchParams.get('channels')));
  const [selectedShows, setSelectedShows] = useState<string[]>(parseUrlArray(searchParams.get('shows')));
  const [selectedGenders, setSelectedGenders] = useState<string[]>(parseUrlArray(searchParams.get('genders')));
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'viewRate');
  
  // New State: Isolate official network accounts from actors
  const [showOfficialAccounts, setShowOfficialAccounts] = useState(searchParams.get('official') === 'true');

  // Accordion UI State
  const [isNetworkOpen, setIsNetworkOpen] = useState(true);
  const [isShowOpen, setIsShowOpen] = useState(true);
  const [isGenderOpen, setIsGenderOpen] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedChannels.length > 0) params.set('channels', selectedChannels.join(','));
    if (selectedShows.length > 0) params.set('shows', selectedShows.join(','));
    if (selectedGenders.length > 0) params.set('genders', selectedGenders.join(','));
    if (sortBy !== 'viewRate') params.set('sort', sortBy);
    if (showOfficialAccounts) params.set('official', 'true');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedChannels, selectedShows, selectedGenders, sortBy, showOfficialAccounts, pathname, router]);

  // STEP 1: Filter out the Official Channels based on the toggle
  const baseActors = useMemo(() => {
    return initialActors.filter(actor => {
      // We assume if gender is 'Channel', 'channel', or '-', it is an official account, not a human actor.
      const isOfficial = actor.gender?.toLowerCase() === 'channel' || actor.gender === '-';
      return showOfficialAccounts ? true : !isOfficial;
    });
  }, [initialActors, showOfficialAccounts]);

  // STEP 2: Generate dynamic filter lists (Cascading logic)
  const uniqueChannels = useMemo(() => Array.from(new Set(baseActors.map(a => a.channel).filter(c => c && c !== '-'))).sort(), [baseActors]);
  
  const uniqueShows = useMemo(() => {
    // If a channel is selected, ONLY show programs from that channel. Otherwise, show all.
    const filteredForShows = selectedChannels.length > 0 
      ? baseActors.filter(a => selectedChannels.includes(a.channel)) 
      : baseActors;
    return Array.from(new Set(filteredForShows.map(a => a.showName).filter(s => s && s !== '-'))).sort();
  }, [baseActors, selectedChannels]);

  // Hardcoded for clean UI, avoiding spreadsheet artifacts
  const uniqueGenders = ['Male', 'Female']; 

  const toggleFilter = (item: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // STEP 3: Final Data Processing
  const processedActors = useMemo(() => {
    let filtered = baseActors.filter(actor => {
      const matchesSearch = actor.realName.toLowerCase().includes(searchQuery.toLowerCase()) || actor.handle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = selectedChannels.length === 0 || selectedChannels.includes(actor.channel);
      const matchesShow = selectedShows.length === 0 || selectedShows.includes(actor.showName);
      const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(actor.gender);
      
      return matchesSearch && matchesChannel && matchesShow && matchesGender;
    });

    return filtered.sort((a, b) => {
      const aFoll = parseInt(String(a.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
      const bFoll = parseInt(String(b.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
      const aRate = parseFloat(a.metrics?.viewRate?.replace('%', '') || '0');
      const bRate = parseFloat(b.metrics?.viewRate?.replace('%', '') || '0');
      return sortBy === 'followers' ? bFoll - aFoll : bRate - aRate;
    });
  }, [baseActors, searchQuery, selectedChannels, selectedShows, selectedGenders, sortBy]);

  const totalFollowersFormatted = useMemo(() => {
    const sum = processedActors.reduce((acc, actor) => {
      const rawValue = String(actor.metrics?.exactFollowers || '0').replace(/,/g, '');
      const parsedInt = parseInt(rawValue, 10);
      return acc + (isNaN(parsedInt) ? 0 : parsedInt);
    }, 0);
    return (sum / 1000000).toFixed(2) + ' M';
  }, [processedActors]);

  const exportToCSV = () => {
    const headers = ["Real Name", "Instagram Handle", "Channel", "Show Name", "Time Slot", "Gender", "Followers", "Avg Reel Views", "View Rate %"];
    const rows = processedActors.map(a => [
      `"${a.realName}"`, `"@${a.handle}"`, `"${a.channel}"`, `"${a.showName}"`, `"${a.timeSlot}"`, `"${a.gender}"`, 
      parseInt(String(a.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0, `"${a.metrics?.avgReelViews || '-'}"`, `"${a.metrics?.viewRate || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Z_Talent_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      <aside className={`${isSidebarOpen ? 'w-[300px] px-6' : 'w-0 px-0 opacity-0'} transition-all duration-300 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 flex flex-col z-20 shadow-sm overflow-hidden whitespace-nowrap shrink-0`}>
        <div className="h-20 flex items-center border-b border-neutral-100 dark:border-neutral-900 mb-6 shrink-0">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mr-3">
            <span className="text-white dark:text-black font-black text-xl leading-none">Z</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Talent Data</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-6 px-1 flex flex-col custom-scrollbar">
          
          {/* ACCOUNT TYPE TOGGLE (Fixes the Data Pollution Issue) */}
          <div className="mb-6 bg-neutral-100 dark:bg-[#111] rounded-xl p-1.5 flex items-center">
            <button 
              onClick={() => setShowOfficialAccounts(false)} 
              className={`flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg transition-all ${!showOfficialAccounts ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Users className="w-3.5 h-3.5 mr-1.5"/> Actors
            </button>
            <button 
              onClick={() => setShowOfficialAccounts(true)} 
              className={`flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg transition-all ${showOfficialAccounts ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Tv className="w-3.5 h-3.5 mr-1.5"/> Official
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest"><Filter className="w-3 h-3 mr-2" /> Filters</span>
            {(selectedChannels.length > 0 || selectedShows.length > 0 || selectedGenders.length > 0) && (
              <button onClick={() => { setSelectedChannels([]); setSelectedShows([]); setSelectedGenders([]); }} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">Reset All</button>
            )}
          </div>
            
          {/* ACCORDION 1: NETWORK CHANNEL */}
          <div className="mb-4 border-b border-neutral-100 dark:border-neutral-900/50 pb-4">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsNetworkOpen(!isNetworkOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Network Channel</label>
              <div className="flex items-center space-x-3">
                {selectedChannels.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedChannels([]);}}>Clear</span>}
                {isNetworkOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isNetworkOpen && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2.5 pr-2">
                {uniqueChannels.map(channel => (
                  <label key={channel} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedChannels.includes(channel)} onChange={() => toggleFilter(channel, selectedChannels, setSelectedChannels)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">{channel}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ACCORDION 2: SHOW NAME */}
          <div className="mb-4 border-b border-neutral-100 dark:border-neutral-900/50 pb-4">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsShowOpen(!isShowOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Show Name</label>
              <div className="flex items-center space-x-3">
                {selectedShows.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedShows([]);}}>Clear</span>}
                {isShowOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isShowOpen && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2.5 pr-2">
                {uniqueShows.map(show => (
                  <label key={show} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedShows.includes(show)} onChange={() => toggleFilter(show, selectedShows, setSelectedShows)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1" title={show}>{show}</span>
                  </label>
                ))}
                {uniqueShows.length === 0 && <div className="text-xs text-neutral-400 italic">No shows available.</div>}
              </div>
            )}
          </div>

          {/* ACCORDION 3: GENDER */}
          <div className="mb-8">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsGenderOpen(!isGenderOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Gender</label>
              <div className="flex items-center space-x-3">
                {selectedGenders.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedGenders([]);}}>Clear</span>}
                {isGenderOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isGenderOpen && (
              <div className="mt-3 space-y-2.5 pr-2">
                {uniqueGenders.map(gender => (
                  <label key={gender} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedGenders.includes(gender)} onChange={() => toggleFilter(gender, selectedGenders, setSelectedGenders)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">{gender}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-3">Sort Methodology</label>
            <div className="grid grid-cols-1 gap-2 bg-neutral-100 dark:bg-[#111] p-1.5 rounded-xl border border-transparent dark:border-neutral-800">
              <button onClick={() => setSortBy('viewRate')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${sortBy === 'viewRate' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Value (View Rate %)</button>
              <button onClick={() => setSortBy('followers')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${sortBy === 'followers' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Volume (Followers)</button>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-900 mt-auto">
            
            <div className="mb-4 bg-neutral-50 dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                <Clock className="w-3.5 h-3.5 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Last Sync</span>
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {/* Changed to use the real database timestamp */}
                {lastSync}
              </span>
            </div>

            <button 
              onClick={copyShareLink}
              className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-[#111] dark:hover:bg-[#222] text-neutral-700 dark:text-neutral-300 rounded-xl transition-all border border-transparent focus:border-black dark:focus:border-neutral-700"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? 'Link Copied!' : 'Share Setup'}
            </button>
            <p className="text-[10px] text-center text-neutral-400 mt-3 px-2">Copies the current filters to your clipboard.</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="h-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-900 flex items-center justify-between px-8 z-10 shrink-0 transition-colors duration-200">
          
          <div className="flex items-center w-full max-w-xl">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-4 text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5"/> : <PanelLeftOpen className="w-5 h-5"/>}
            </button>
            
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input type="text" placeholder="Search talent..." className="w-full pl-11 pr-4 py-3 text-sm font-medium bg-neutral-100 dark:bg-[#111] placeholder-neutral-500 border border-transparent focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-neutral-300 dark:focus:border-neutral-700 rounded-full outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            
            <div className="hidden lg:flex items-center bg-neutral-50 dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-full px-4 py-1.5">
              <div className="text-right mr-3 pr-3 border-r border-neutral-200 dark:border-neutral-800">
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">{showOfficialAccounts ? 'Accounts' : 'Actors'}</p>
                <p className="text-sm font-bold leading-none mt-0.5">{processedActors.length}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Total Audience</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none mt-0.5 tracking-tight">{totalFollowersFormatted}</p>
              </div>
            </div>

            <div className="flex items-center bg-neutral-100 dark:bg-[#111] rounded-full p-1 border border-transparent dark:border-neutral-900">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#222] shadow-sm text-black dark:text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}><LayoutGrid className="w-4 h-4"/></button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-white dark:bg-[#222] shadow-sm text-black dark:text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}><List className="w-4 h-4"/></button>
            </div>

            <button onClick={exportToCSV} className="hidden sm:flex items-center px-4 py-2 text-sm font-bold bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform">
              <Download className="w-4 h-4 mr-2"/> Export
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#111] transition-all">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto pb-20">
            {processedActors.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {processedActors.map((actor, i) => <ActorCard key={i} actor={actor} />)}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-600 dark:text-neutral-400">
                      <thead className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50 dark:bg-[#111] border-b border-neutral-200 dark:border-neutral-900 whitespace-nowrap">
                        <tr>
                          <th className="px-6 py-5">Name</th>
                          <th className="px-6 py-5">Handle</th>
                          <th className="px-6 py-5">Show & Time</th>
                          <th className="px-6 py-5">Gender</th>
                          <th className="px-6 py-5 text-right">Followers</th>
                          <th className="px-6 py-5 text-right">Avg Views</th>
                          <th className="px-6 py-5 text-right">View Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedActors.map((actor, i) => (
                          <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors">
                            <td className="px-6 py-4 font-bold text-black dark:text-white flex items-center min-w-[200px]">
                              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 mr-4 overflow-hidden shrink-0">
                                {actor.headshotUrl ? (
                                  <img src={actor.headshotUrl} className="w-full h-full object-cover"/>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">{actor.realName.charAt(0)}</div>
                                )}
                              </div>
                              {actor.realName}
                            </td>
                            <td className="px-6 py-4 font-medium"><a href={`https://instagram.com/${actor.handle}`} target="_blank" className="text-neutral-500 hover:text-blue-500 transition-colors">@{actor.handle}</a></td>
                            <td className="px-6 py-4 min-w-[150px]">
                                <div className="font-bold text-black dark:text-white line-clamp-1">{actor.showName}</div>
                                <div className="text-xs text-neutral-500 mt-0.5">{actor.timeSlot}</div>
                            </td>
                            <td className="px-6 py-4 font-medium">{actor.gender}</td>
                            <td className="px-6 py-4 text-right font-bold text-black dark:text-white">{actor.metrics?.formattedFollowers || '-'}</td>
                            <td className="px-6 py-4 text-right font-medium">{actor.metrics?.avgReelViews || '-'}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-500">
                              {actor.metrics?.viewRate || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div> 
              )
            ) : (
              <div className="py-32 flex flex-col items-center justify-center text-neutral-400">
                <p className="text-lg font-bold text-neutral-600 dark:text-neutral-500">No {showOfficialAccounts ? 'accounts' : 'actors'} match these filters.</p>
                <button onClick={() => { setSelectedChannels([]); setSelectedShows([]); setSelectedGenders([]); }} className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold">Reset Filters</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}