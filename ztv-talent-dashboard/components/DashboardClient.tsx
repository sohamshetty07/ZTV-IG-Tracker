"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ActorCard, { getViewRateIntensity } from './ActorCard';
import { Search, Moon, Sun, Filter, LayoutGrid, List, Download, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function DashboardClient({ initialActors }: { initialActors: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('All Channels');
  const [selectedShow, setSelectedShow] = useState('All Shows');
  const [selectedGender, setSelectedGender] = useState('All Genders');
  const [sortBy, setSortBy] = useState('viewRate');
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Bulletproof Dark Mode implementation
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const uniqueChannels = useMemo(() => ['All Channels', ...Array.from(new Set(initialActors.map(a => a.channel).filter(c => c && c !== '-')))].sort(), [initialActors]);
  const uniqueShows = useMemo(() => ['All Shows', ...Array.from(new Set(initialActors.map(a => a.showName).filter(s => s && s !== '-')))].sort(), [initialActors]);
  const uniqueGenders = useMemo(() => ['All Genders', ...Array.from(new Set(initialActors.map(a => a.gender).filter(g => g && g !== '-')))].sort(), [initialActors]);

  const processedActors = useMemo(() => {
    let filtered = initialActors.filter(actor => {
      const matchesSearch = actor.realName.toLowerCase().includes(searchQuery.toLowerCase()) || actor.handle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = selectedChannel === 'All Channels' || actor.channel === selectedChannel;
      const matchesShow = selectedShow === 'All Shows' || actor.showName === selectedShow;
      const matchesGender = selectedGender === 'All Genders' || actor.gender === selectedGender;
      
      return matchesSearch && matchesChannel && matchesShow && matchesGender;
    });

    return filtered.sort((a, b) => {
      const aFoll = parseInt(String(a.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
      const bFoll = parseInt(String(b.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
      const aRate = parseFloat(a.metrics?.viewRate?.replace('%', '') || '0');
      const bRate = parseFloat(b.metrics?.viewRate?.replace('%', '') || '0');
      return sortBy === 'followers' ? bFoll - aFoll : bRate - aRate;
    });
  }, [initialActors, searchQuery, selectedChannel, selectedShow, selectedGender, sortBy]);

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

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      <aside className={`${isSidebarOpen ? 'w-[300px] px-6' : 'w-0 px-0 opacity-0'} transition-all duration-300 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 flex flex-col z-20 shadow-sm overflow-hidden whitespace-nowrap shrink-0`}>
        <div className="h-20 flex items-center border-b border-neutral-100 dark:border-neutral-900 mb-6 shrink-0">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mr-3">
            <span className="text-white dark:text-black font-black text-xl leading-none">Z</span>
          </div>
          <h1 className="text-xl font-black tracking-tighter">Talent Data</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-6 px-1">
          <div className="flex items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6"><Filter className="w-3 h-3 mr-2" /> Global Filters</div>
          
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-2">Network Channel</label>
            <select className="w-full px-4 py-3 text-sm font-medium bg-neutral-100 dark:bg-[#111] border border-transparent focus:border-black dark:focus:border-neutral-700 rounded-xl outline-none cursor-pointer transition-colors appearance-none" value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
              {uniqueChannels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-2">Show Name</label>
            <select className="w-full px-4 py-3 text-sm font-medium bg-neutral-100 dark:bg-[#111] border border-transparent focus:border-black dark:focus:border-neutral-700 rounded-xl outline-none cursor-pointer transition-colors appearance-none" value={selectedShow} onChange={(e) => setSelectedShow(e.target.value)}>
              {uniqueShows.map(show => <option key={show} value={show}>{show}</option>)}
            </select>
          </div>

          <div className="mb-8">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-2">Gender</label>
            <select className="w-full px-4 py-3 text-sm font-medium bg-neutral-100 dark:bg-[#111] border border-transparent focus:border-black dark:focus:border-neutral-700 rounded-xl outline-none cursor-pointer transition-colors appearance-none" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
              {uniqueGenders.map(gender => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-2">Sort Methodology</label>
            <div className="grid grid-cols-1 gap-2 bg-neutral-100 dark:bg-[#111] p-1.5 rounded-xl">
              <button onClick={() => setSortBy('viewRate')} className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${sortBy === 'viewRate' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Value (View Rate %)</button>
              <button onClick={() => setSortBy('followers')} className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${sortBy === 'followers' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Volume (Followers)</button>
            </div>
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
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Actors</p>
                <p className="text-sm font-black leading-none mt-0.5">{processedActors.length}</p>
              </div>
              <div>
                {/* REMOVED GREEN OVERLOAD FROM KPI HEADER */}
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Total Audience</p>
                <p className="text-sm font-black text-neutral-900 dark:text-white leading-none mt-0.5 tracking-tight">{totalFollowersFormatted}</p>
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
                          <th className="px-6 py-5">Actor</th>
                          <th className="px-6 py-5">Handle</th>
                          <th className="px-6 py-5">Show & Time</th>
                          <th className="px-6 py-5">Gender</th>
                          <th className="px-6 py-5 text-right">Followers</th>
                          <th className="px-6 py-5 text-right">Avg Views</th>
                          {/* NEUTRALIZED TABLE HEADER */}
                          <th className="px-6 py-5 text-right">View Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedActors.map((actor, i) => (
                          <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors">
                            <td className="px-6 py-4 font-bold text-black dark:text-white flex items-center min-w-[200px]">
                              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 mr-4 overflow-hidden shrink-0">
                                {actor.headshotUrl && <img src={actor.headshotUrl} className="w-full h-full object-cover"/>}
                              </div>
                              {actor.realName}
                            </td>
                            <td className="px-6 py-4 font-medium"><a href={`https://instagram.com/${actor.handle}`} target="_blank" className="text-neutral-500 hover:text-blue-500 transition-colors">@{actor.handle}</a></td>
                            <td className="px-6 py-4 min-w-[150px]">
                                <div className="font-bold text-black dark:text-white">{actor.showName}</div>
                                <div className="text-xs text-neutral-500 mt-0.5">{actor.timeSlot}</div>
                            </td>
                            <td className="px-6 py-4 font-medium">{actor.gender}</td>
                            <td className="px-6 py-4 text-right font-bold text-black dark:text-white">{actor.metrics?.formattedFollowers || '-'}</td>
                            <td className="px-6 py-4 text-right font-medium">{actor.metrics?.avgReelViews || '-'}</td>
                            {/* KEPT GREEN FOR THE METRIC VALUE ONLY */}
                            <td className={`px-6 py-4 text-right font-black ${getViewRateIntensity(actor.metrics?.viewRate)}`}>
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
                <p className="text-lg font-bold text-neutral-600 dark:text-neutral-500">No actors match these filters.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}