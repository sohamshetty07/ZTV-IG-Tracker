"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ActorCard from './ActorCard';
import { Search, Moon, Sun, Filter, LayoutGrid, List, Download, PanelLeftClose, PanelLeftOpen, Share2, Check, Clock, ChevronDown, ChevronUp, Users, Tv, ExternalLink, Globe, BarChart2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function DashboardClient({ initialActors, lastSync }: { initialActors: any[], lastSync: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseUrlArray = (param: string | null) => param ? param.split(',') : [];

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(parseUrlArray(searchParams.get('channels')));
  const [selectedShows, setSelectedShows] = useState<string[]>(parseUrlArray(searchParams.get('shows')));
  const [selectedGenders, setSelectedGenders] = useState<string[]>(parseUrlArray(searchParams.get('genders')));
  
  // ADVANCED SORTING STATE
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'viewRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');
  
  const [showOfficialAccounts, setShowOfficialAccounts] = useState(searchParams.get('official') === 'true');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [isNetworkOpen, setIsNetworkOpen] = useState(true);
  const [isShowOpen, setIsShowOpen] = useState(true);
  const [isGenderOpen, setIsGenderOpen] = useState(true);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
    else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) setIsDarkMode(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Find or create the browser's theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    // 2. Apply theme and sync browser top-bar colour
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      metaThemeColor.setAttribute('content', '#000000'); // Matches your dark:bg-black
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      metaThemeColor.setAttribute('content', '#fafafa'); // Matches your bg-neutral-50
    }
  }, [isDarkMode]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedChannels.length > 0) params.set('channels', selectedChannels.join(','));
    if (selectedShows.length > 0) params.set('shows', selectedShows.join(','));
    if (selectedGenders.length > 0) params.set('genders', selectedGenders.join(','));
    if (sortBy !== 'viewRate') params.set('sort', sortBy);
    if (sortOrder !== 'desc') params.set('order', sortOrder);
    if (showOfficialAccounts) params.set('official', 'true');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedChannels, selectedShows, selectedGenders, sortBy, sortOrder, showOfficialAccounts, pathname, router]);

  const baseActors = useMemo(() => {
    return initialActors.filter(actor => {
      const isOfficial = actor.gender?.toLowerCase() === 'channel' || actor.gender === '-';
      return showOfficialAccounts ? true : !isOfficial;
    });
  }, [initialActors, showOfficialAccounts]);

  const uniqueChannels = useMemo(() => Array.from(new Set(baseActors.map(a => a.channel).filter(c => c && c !== '-'))).sort(), [baseActors]);
  const uniqueShows = useMemo(() => {
    const filteredForShows = selectedChannels.length > 0 
      ? baseActors.filter(a => selectedChannels.includes(a.channel)) 
      : baseActors;
    return Array.from(new Set(filteredForShows.map(a => a.showName).filter(s => s && s !== '-'))).sort();
  }, [baseActors, selectedChannels]);
  const uniqueGenders = ['Male', 'Female']; 

  const toggleFilter = (item: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // MULTI-DIRECTIONAL SORT HANDLER
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // INTELLIGENT NUMBER PARSER
  const parseKMMetric = (val: string | number) => {
    if (!val || val === '-') return 0;
    const str = String(val).toUpperCase().replace(/,/g, '');
    let num = parseFloat(str);
    if (str.includes('M')) num *= 1000000;
    else if (str.includes('K')) num *= 1000;
    return isNaN(num) ? 0 : num;
  };

  const processedActors = useMemo(() => {
    let filtered = baseActors.filter(actor => {
      const matchesSearch = actor.realName.toLowerCase().includes(searchQuery.toLowerCase()) || actor.handle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = selectedChannels.length === 0 || selectedChannels.includes(actor.channel);
      const matchesShow = selectedShows.length === 0 || selectedShows.includes(actor.showName);
      const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(actor.gender);
      return matchesSearch && matchesChannel && matchesShow && matchesGender;
    });

    return filtered.sort((a, b) => {
      let aVal = 0, bVal = 0;
      
      if (sortBy === 'followers') {
         aVal = parseInt(String(a.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
         bVal = parseInt(String(b.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0;
      } else if (sortBy === 'viewRate') {
         aVal = parseFloat(a.metrics?.viewRate?.replace('%', '') || '0');
         bVal = parseFloat(b.metrics?.viewRate?.replace('%', '') || '0');
      } else if (sortBy === 'avgLikes') {
         aVal = parseKMMetric(a.metrics?.avgPhotoLikes);
         bVal = parseKMMetric(b.metrics?.avgPhotoLikes);
      } else if (sortBy === 'avgViews') {
         aVal = parseKMMetric(a.metrics?.avgReelViews);
         bVal = parseKMMetric(b.metrics?.avgReelViews);
      } else if (sortBy === 'avgComments') {
         aVal = parseKMMetric(a.metrics?.avgComments);
         bVal = parseKMMetric(b.metrics?.avgComments);
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [baseActors, searchQuery, selectedChannels, selectedShows, selectedGenders, sortBy, sortOrder]);

  const totalFollowersFormatted = useMemo(() => {
    const sum = processedActors.reduce((acc, actor) => {
      const rawValue = String(actor.metrics?.exactFollowers || '0').replace(/,/g, '');
      const parsedInt = parseInt(rawValue, 10);
      return acc + (isNaN(parsedInt) ? 0 : parsedInt);
    }, 0);
    return (sum / 1000000).toFixed(2) + ' M';
  }, [processedActors]);

  // SMART EXPORT ENGINE
  const exportToExcel = () => {
    const dataRows = processedActors.map(a => {
      const baseRow: any = {
        "Real Name": a.realName,
        "Reel Name": a.reelName,
        "Instagram Handle": `@${a.handle}`,
        "Channel": a.channel,
        "Show Name": a.showName,
        "Time Slot": a.timeSlot,
        "Gender": a.gender,
        "Followers": parseInt(String(a.metrics?.exactFollowers || '0').replace(/,/g, ''), 10) || 0,
      };

      if (showAnalytics) {
        baseRow["Avg Photo Likes"] = a.metrics?.avgPhotoLikes || '-';
        baseRow["Avg Reel Views"] = a.metrics?.avgReelViews || '-';
        baseRow["Avg Comments"] = a.metrics?.avgComments || '-';
        baseRow["View Rate %"] = a.metrics?.viewRate || '-';
      }
      return baseRow;
    });
    
    const dataSheet = XLSX.utils.json_to_sheet(dataRows);
    const metadataRows = [
      { "Configuration": "Export Date", "Value": new Date().toLocaleString('en-GB') },
      { "Configuration": "Data Last Synchronised", "Value": lastSync },
      { "Configuration": "Analyst Mode Active", "Value": showAnalytics ? "Yes" : "No" },
      { "Configuration": "Account Type", "Value": showOfficialAccounts ? "Official Network Accounts" : "Actors Only" },
      { "Configuration": "Search Query Applied", "Value": searchQuery || "None" },
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metadataRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataSheet, "Talent Data");
    XLSX.utils.book_append_sheet(wb, metaSheet, "Report Metadata");

    // DYNAMIC NAMING ENGINE
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('en-GB', { month: 'short' });
    const dateStr = `${day}${month}`; // e.g., "15Apr"

    const accountTypeStr = showOfficialAccounts ? "Official" : "Actors";

    let scopeStr = "All";
    if (selectedShows.length === 1) {
      scopeStr = selectedShows[0].replace(/[^a-zA-Z0-9]/g, ''); // e.g., "KundaliBhagya"
    } else if (selectedShows.length > 1) {
      scopeStr = "MultiShow";
    } else if (selectedChannels.length === 1) {
      scopeStr = selectedChannels[0].replace(/[^a-zA-Z0-9]/g, ''); // e.g., "ZeeTV"
    } else if (selectedChannels.length > 1) {
      scopeStr = "MultiChannel";
    }

    const fileName = `Zee_Talent_${scopeStr}_${accountTypeStr}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      <aside className={`${isSidebarOpen ? 'w-[300px] px-6' : 'w-0 px-0 opacity-0'} transition-all duration-300 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 flex flex-col z-20 shadow-sm overflow-hidden whitespace-nowrap shrink-0`}>
        
        <div className="relative h-20 flex items-center border-b border-neutral-100 dark:border-neutral-900 mb-6 shrink-0 px-2 z-50">
          <button onClick={() => setIsSwitcherOpen(!isSwitcherOpen)} className="flex items-center w-full hover:bg-neutral-100 dark:hover:bg-neutral-900 p-2 rounded-xl transition-colors">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mr-3 shrink-0">
              <span className="text-white dark:text-black font-black text-xl leading-none">Z</span>
            </div>
            <div className="text-left flex-1">
              <h1 className="text-lg font-black tracking-tight leading-none flex items-center text-black dark:text-white mt-0.5">
                Talent <ChevronDown className="w-3 h-3 ml-1.5 text-neutral-400" />
              </h1>
            </div>
          </button>

          {isSwitcherOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)}></div>
              <div className="absolute top-16 left-4 w-56 bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-4 py-2">Workspaces</p>
                <button onClick={() => { setIsSwitcherOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium bg-neutral-50 dark:bg-[#222] text-black dark:text-white transition-colors">
                  <Users className="w-4 h-4 mr-3 text-neutral-500" /> Talent
                  <Check className="w-3 h-3 ml-auto text-black dark:text-white"/>
                </button>
                <button onClick={() => { router.push('/network'); setIsSwitcherOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors">
                  <Globe className="w-4 h-4 mr-3 text-neutral-500" /> Network
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-6 px-1 flex flex-col custom-scrollbar">
          
          <div className="mb-6 bg-neutral-100 dark:bg-[#111] rounded-xl p-1.5 flex items-center">
            <button onClick={() => setShowOfficialAccounts(false)} className={`flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg transition-all ${!showOfficialAccounts ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              <Users className="w-3.5 h-3.5 mr-1.5"/> Actors
            </button>
            <button onClick={() => setShowOfficialAccounts(true)} className={`flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg transition-all ${showOfficialAccounts ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              <Tv className="w-3.5 h-3.5 mr-1.5"/> Official
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest"><Filter className="w-3 h-3 mr-2" /> Filters</span>
            {(selectedChannels.length > 0 || selectedShows.length > 0 || selectedGenders.length > 0) && (
              <button onClick={() => { setSelectedChannels([]); setSelectedShows([]); setSelectedGenders([]); }} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">Reset All</button>
            )}
          </div>
            
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
              </div>
            )}
          </div>

          <div className="mb-8 border-b border-neutral-100 dark:border-neutral-900/50 pb-4">
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

          <div className="mb-6">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">Viewing Mode</label>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${showAnalytics ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-[#111] border-transparent text-neutral-500'}`}
            >
              <span className="text-sm font-bold flex items-center">
                <BarChart2 className="w-4 h-4 mr-2" />
                Analytics Mode
              </span>
              <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${showAnalytics ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showAnalytics ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
            <p className="text-[9px] text-neutral-400 mt-2 px-1 leading-tight">Internal engagement metrics and View Rates.</p>
          </div>

          {/* DYNAMIC SIDEBAR SORTING */}
          {showAnalytics && (
             <div>
               <label className="block text-xs uppercase tracking-wider font-bold text-neutral-500 mb-3">Sort Primary Metric</label>
               <div className="grid grid-cols-1 gap-2 bg-neutral-100 dark:bg-[#111] p-1.5 rounded-xl border border-transparent dark:border-neutral-800">
                 <button onClick={() => handleSort('viewRate')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${sortBy === 'viewRate' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
                    View Rate % {sortBy === 'viewRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                 </button>
                 <button onClick={() => handleSort('followers')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${sortBy === 'followers' ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
                    Total Followers {sortBy === 'followers' && (sortOrder === 'desc' ? '↓' : '↑')}
                 </button>
               </div>
             </div>
          )}
          
          <div className="mt-4 pt-6 border-t border-neutral-100 dark:border-neutral-900 mt-auto">
            <div className="mb-4 bg-neutral-50 dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                <Clock className="w-3.5 h-3.5 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Last Sync</span>
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{lastSync}</span>
            </div>

            <button onClick={copyShareLink} className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-[#111] dark:hover:bg-[#222] text-neutral-700 dark:text-neutral-300 rounded-xl transition-all border border-transparent focus:border-black dark:focus:border-neutral-700">
              {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? 'Link Copied!' : 'Share Setup'}
            </button>
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

            <button onClick={exportToExcel} className="hidden sm:flex items-center px-4 py-2 text-sm font-bold bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform shadow-sm">
              <Download className="w-4 h-4 mr-2"/> Export
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#111] transition-all">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden p-6 lg:p-8">
          <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col min-h-0">
            {processedActors.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="overflow-y-auto custom-scrollbar flex-1 pb-10 pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {processedActors.map((actor, i) => <ActorCard key={i} actor={actor} showAnalytics={showAnalytics} />)}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
                  <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-sm text-left text-neutral-600 dark:text-neutral-400 tabular-nums border-separate border-spacing-0">
                      <thead className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest bg-neutral-100 dark:bg-[#111] border-b border-neutral-200 dark:border-neutral-900 whitespace-nowrap sticky top-0 z-20 shadow-sm">
                        <tr className="overflow-visible">
                          <th className="px-6 py-5 min-w-[220px] border-b border-neutral-200 dark:border-neutral-900">Name</th>
                          {/* NEW HEADER: Channel */}
                          <th className="px-6 py-5 min-w-[140px] border-b border-neutral-200 dark:border-neutral-900">Channel</th>
                          <th className="px-6 py-5 min-w-[160px] border-b border-neutral-200 dark:border-neutral-900">Show & Time</th>
                          
                          <th className={`px-6 py-5 text-center border-b border-neutral-200 dark:border-neutral-900 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[110px] ${sortBy === 'followers' ? 'text-blue-600 dark:text-blue-400' : ''}`} onClick={() => handleSort('followers')}>
                            Followers {sortBy === 'followers' && (sortOrder === 'desc' ? '↓' : '↑')}
                          </th>
                          
                          {showAnalytics && (
                            <>
                              <th className={`px-6 py-5 text-center border-b border-neutral-200 dark:border-neutral-900 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[130px] ${sortBy === 'viewRate' ? 'text-emerald-600 dark:text-emerald-500' : ''}`} onClick={() => handleSort('viewRate')}>
                                View Rate {sortBy === 'viewRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                              </th>
                              <th className={`px-6 py-5 text-center border-b border-neutral-200 dark:border-neutral-900 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[120px] ${sortBy === 'avgLikes' ? 'text-blue-600 dark:text-blue-400' : ''}`} onClick={() => handleSort('avgLikes')}>
                                Avg Likes {sortBy === 'avgLikes' && (sortOrder === 'desc' ? '↓' : '↑')}
                              </th>
                              <th className={`px-6 py-5 text-center border-b border-neutral-200 dark:border-neutral-900 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[120px] ${sortBy === 'avgViews' ? 'text-blue-600 dark:text-blue-400' : ''}`} onClick={() => handleSort('avgViews')}>
                                Avg Views {sortBy === 'avgViews' && (sortOrder === 'desc' ? '↓' : '↑')}
                              </th>
                              <th className={`px-6 py-5 text-center border-b border-neutral-200 dark:border-neutral-900 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[140px] ${sortBy === 'avgComments' ? 'text-blue-600 dark:text-blue-400' : ''}`} onClick={() => handleSort('avgComments')}>
                                Avg Comments {sortBy === 'avgComments' && (sortOrder === 'desc' ? '↓' : '↑')}
                              </th>
                            </>
                          )}
                          
                          <th className="px-6 py-5 text-right border-b border-neutral-200 dark:border-neutral-900 min-w-[150px]">Handle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedActors.map((actor, i) => {
                          const isReelNameValid = actor.reelName && actor.reelName !== '-';
                          const primaryName = isReelNameValid ? actor.reelName : actor.realName;
                          const secondaryName = isReelNameValid ? actor.realName : null;

                          return (
                            <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors whitespace-nowrap group">
                              <td className="px-6 py-3 font-bold text-black dark:text-white flex items-center min-w-[220px]">
                                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 mr-4 overflow-hidden shrink-0">
                                  {actor.headshotUrl ? (
                                    <img src={actor.headshotUrl} className="w-full h-full object-cover"/>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-base">{actor.realName.charAt(0)}</div>
                                  )}
                                </div>
                                <div className="flex flex-col justify-center">
                                  <span className="leading-tight">{primaryName}</span>
                                  {secondaryName && (
                                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{secondaryName}</span>
                                  )}
                                </div>
                              </td>
                              
                              {/* NEW ROW DATA: Channel Badge */}
                              <td className="px-6 py-3 align-middle">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                  {actor.channel}
                                </span>
                              </td>

                              <td className="px-6 py-3 align-middle">
                                  <div className="font-bold text-black dark:text-white line-clamp-1">{actor.showName}</div>
                                  <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center"><Clock className="w-3 h-3 mr-1" />{actor.timeSlot}</div>
                              </td>
                              
                              <td className="px-6 py-3 text-center align-middle font-bold text-black dark:text-white">{actor.metrics?.formattedFollowers || '-'}</td>
                              
                              {showAnalytics && (
                                <>
                                  <td className="px-6 py-3 text-center align-middle font-black text-emerald-600 dark:text-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">
                                    {actor.metrics?.viewRate || '-'}
                                  </td>
                                  <td className="px-6 py-3 text-center align-middle font-medium">{actor.metrics?.avgPhotoLikes || '-'}</td>
                                  <td className="px-6 py-3 text-center align-middle font-medium">{actor.metrics?.avgReelViews || '-'}</td>
                                  <td className="px-6 py-3 text-center align-middle font-medium">{actor.metrics?.avgComments || '-'}</td>
                                </>
                              )}
                              
                              <td className="px-6 py-3 text-right align-middle">
                                <a href={`https://instagram.com/${actor.handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-end px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-[11px] font-bold w-fit ml-auto tracking-wide">
                                  @{actor.handle} <ExternalLink className="w-3 h-3 ml-1.5 opacity-50 group-hover:opacity-100"/>
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div> 
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
                <p className="text-lg font-bold text-neutral-600 dark:text-neutral-500">No {showOfficialAccounts ? 'accounts' : 'actors'} match these filters.</p>
                <button onClick={() => { setSelectedChannels([]); setSelectedShows([]); setSelectedGenders([]); }} className="mt-4 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-transform">Reset Filters</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}