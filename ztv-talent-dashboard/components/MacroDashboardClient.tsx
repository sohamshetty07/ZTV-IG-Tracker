"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Moon, Sun, Clock, Filter, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, Download, Globe, Users, Check, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function MacroDashboardClient({ initialData, lastSync }: { initialData: any[], lastSync: string }) {
  const router = useRouter();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlignments, setSelectedAlignments] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'fb' | 'ig' | 'yt'>('total');
  
  // NEW: Target Highlight State
  const [highlightedChannel, setHighlightedChannel] = useState<string | null>(null);
  
  // Competitive Landscape Toggle
  const [showCompetitors, setShowCompetitors] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Accordion State
  const [isAlignmentOpen, setIsAlignmentOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isChannelOpen, setIsChannelOpen] = useState(true);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      metaThemeColor.setAttribute('content', '#000000'); 
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      metaThemeColor.setAttribute('content', '#fafafa'); 
    }
  }, [isDarkMode]);

  // THE DATA LENS
  const baseChannels = useMemo(() => {
    return initialData.filter(ch => showCompetitors || ch.networkType === 'Zee');
  }, [initialData, showCompetitors]);

  const uniqueAlignments = useMemo(() => {
    return Array.from(new Set(baseChannels.map(ch => ch.alignment))).sort();
  }, [baseChannels]);

  const uniqueCategories = useMemo(() => {
    const filteredForCategories = selectedAlignments.length > 0 
      ? baseChannels.filter(ch => selectedAlignments.includes(ch.alignment))
      : baseChannels;
    return Array.from(new Set(filteredForCategories.map(ch => ch.category))).sort();
  }, [baseChannels, selectedAlignments]);

  const uniqueChannelsList = useMemo(() => {
    let filteredForChannels = baseChannels;
    if (selectedAlignments.length > 0) {
      filteredForChannels = filteredForChannels.filter(ch => selectedAlignments.includes(ch.alignment));
    }
    if (selectedCategories.length > 0) {
      filteredForChannels = filteredForChannels.filter(ch => selectedCategories.includes(ch.category));
    }
    return Array.from(new Set(filteredForChannels.map(ch => ch.channelName))).sort();
  }, [baseChannels, selectedAlignments, selectedCategories]);

  const toggleFilter = (item: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // DYNAMIC FILTERING & SORTING
  const processedData = useMemo(() => {
    let filtered = baseChannels.filter(channel => {
      const matchesSearch = channel.channelName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAlignment = selectedAlignments.length === 0 || selectedAlignments.includes(channel.alignment);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(channel.category);
      const matchesChannel = selectedChannels.length === 0 || selectedChannels.includes(channel.channelName);
      
      return matchesSearch && matchesAlignment && matchesCategory && matchesChannel;
    });

    return filtered.sort((a, b) => {
      if (showCompetitors) {
        if (a.networkType === 'Zee' && b.networkType !== 'Zee') return -1;
        if (a.networkType !== 'Zee' && b.networkType === 'Zee') return 1;
      }
      const aVal = a.metrics[sortBy] || 0;
      const bVal = b.metrics[sortBy] || 0;
      return bVal - aVal;
    });
  }, [baseChannels, searchQuery, selectedAlignments, selectedCategories, selectedChannels, sortBy, showCompetitors]);

  const summaryMetrics = useMemo(() => {
    const total = processedData.reduce((sum, ch) => sum + (ch.metrics.total || 0), 0);
    return {
      total: total.toFixed(2), 
      channelCount: processedData.length
    };
  }, [processedData]);

  const maxMetrics = useMemo(() => {
    return {
        fb: Math.max(...processedData.map(c => c.metrics.fb || 0), 0.0001),
        ig: Math.max(...processedData.map(c => c.metrics.ig || 0), 0.0001),
        yt: Math.max(...processedData.map(c => c.metrics.yt || 0), 0.0001),
        total: Math.max(...processedData.map(c => c.metrics.total || 0), 0.0001)
    }
  }, [processedData]);

  const topChannel = useMemo(() => {
    if (processedData.length === 0) return null;
    return processedData.reduce((max, channel) => 
      (channel.metrics.total || 0) > (max.metrics.total || 0) ? channel : max
    );
  }, [processedData]);

  // Retrieve data for the currently highlighted channel
  const highlightedData = useMemo(() => {
    if (!highlightedChannel) return null;
    return processedData.find(c => c.channelName === highlightedChannel) || null;
  }, [processedData, highlightedChannel]);

  const getAlignmentBadge = (alignment: string) => {
    const lower = alignment.toLowerCase();
    if (lower.includes('music')) return { label: 'MUSIC', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
    if (lower.includes('news')) return { label: 'NEWS', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' };
    if (lower.includes('studio')) return { label: 'STUDIO', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' };
    if (lower.includes('entertainment')) return { label: 'ENT', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' };
    return { label: 'COMP', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  };

  const exportToExcel = () => {
    const dataRows = processedData.map(channel => ({
      "Channel Identity": channel.channelName,
      "Network Alignment": channel.alignment, 
      "Segment": channel.category,
      "Facebook Reach": Math.round((channel.metrics.fb || 0) * 1000000),
      "Instagram Reach": Math.round((channel.metrics.ig || 0) * 1000000),
      "YouTube Reach": Math.round((channel.metrics.yt || 0) * 1000000),
      "Total Reach": Math.round((channel.metrics.total || 0) * 1000000),
      "Facebook Link": channel.urls?.facebook || '-',
      "Instagram Link": channel.urls?.instagram || '-',
      "YouTube Link": channel.urls?.youtube || '-'
    }));
    const dataSheet = XLSX.utils.json_to_sheet(dataRows);

    const metadataRows = [
      { "Configuration": "Export Date", "Value": new Date().toLocaleString('en-GB') },
      { "Configuration": "Data Last Synchronised", "Value": lastSync },
      { "Configuration": "Market Landscape Active", "Value": showCompetitors ? "Yes" : "No" },
      { "Configuration": "Search Query Applied", "Value": searchQuery || "None" },
      { "Configuration": "Alignments Filtered", "Value": selectedAlignments.length > 0 ? selectedAlignments.join(', ') : "All Alignments" },
      { "Configuration": "Segments Filtered", "Value": selectedCategories.length > 0 ? selectedCategories.join(', ') : "All Categories" },
      { "Configuration": "Channels Filtered", "Value": selectedChannels.length > 0 ? selectedChannels.join(', ') : "All Channels" },
      { "Configuration": "Data Note", "Value": "All metrics have been converted from millions into raw integers for calculation purposes." }
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metadataRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataSheet, "Network Data");
    XLSX.utils.book_append_sheet(wb, metaSheet, "Report Metadata");

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('en-GB', { month: 'short' });
    const dateStr = `${day}${month}`; 

    const prefix = showCompetitors ? "Zee_Competitive_Landscape" : "Zee_Network";
    let scopeStr = "Overview";
    if (selectedAlignments.length === 1) scopeStr = selectedAlignments[0].replace(/[^a-zA-Z0-9]/g, '');
    else if (selectedCategories.length === 1) scopeStr = selectedCategories[0].replace(/[^a-zA-Z0-9]/g, '');
    else if (selectedCategories.length > 1) scopeStr = "MultiSegment";
    else if (selectedChannels.length > 0) scopeStr = "Custom";

    XLSX.writeFile(wb, `${prefix}_${scopeStr}_${dateStr}.xlsx`);
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-[280px] px-6' : 'w-0 px-0 opacity-0'} transition-all duration-300 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 flex flex-col z-20 shadow-sm overflow-hidden whitespace-nowrap shrink-0`}>
        
        <div className="relative h-20 flex items-center border-b border-neutral-100 dark:border-neutral-900 mb-6 shrink-0 px-2 z-50">
          <button onClick={() => setIsSwitcherOpen(!isSwitcherOpen)} className="flex items-center w-full hover:bg-neutral-100 dark:hover:bg-neutral-900 p-2 rounded-xl transition-colors">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mr-3 shrink-0">
              <span className="text-white dark:text-black font-black text-xl leading-none">Z</span>
            </div>
            <div className="text-left flex-1">
              <h1 className="text-lg font-black tracking-tight leading-none flex items-center text-black dark:text-white mt-0.5">
                Network <ChevronDown className="w-3 h-3 ml-1.5 text-neutral-400" />
              </h1>
            </div>
          </button>

          {isSwitcherOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)}></div>
              <div className="absolute top-16 left-4 w-56 bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-4 py-2">Workspaces</p>
                <button onClick={() => { router.push('/'); setIsSwitcherOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors">
                  <Users className="w-4 h-4 mr-3 text-neutral-500" /> Talent
                </button>
                <button onClick={() => { setIsSwitcherOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium bg-neutral-50 dark:bg-[#222] text-black dark:text-white transition-colors">
                  <Globe className="w-4 h-4 mr-3 text-neutral-500" /> Network
                  <Check className="w-3 h-3 ml-auto text-black dark:text-white"/>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-6 flex flex-col custom-scrollbar pr-2">
          
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest"><Filter className="w-3 h-3 mr-2" /> Filters</span>
            {(selectedAlignments.length > 0 || selectedCategories.length > 0 || selectedChannels.length > 0) && (
              <button onClick={() => { setSelectedAlignments([]); setSelectedCategories([]); setSelectedChannels([]); }} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">Reset</button>
            )}
          </div>

          <div className="mb-4 border-b border-neutral-100 dark:border-neutral-900/50 pb-4">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsAlignmentOpen(!isAlignmentOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Network Alignment</label>
              <div className="flex items-center space-x-3">
                {selectedAlignments.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedAlignments([]);}}>Clear</span>}
                {isAlignmentOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isAlignmentOpen && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2.5 pr-2">
                {uniqueAlignments.map(alignment => (
                  <label key={alignment} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedAlignments.includes(alignment)} onChange={() => toggleFilter(alignment, selectedAlignments, setSelectedAlignments)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">{alignment}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
            
          <div className="mb-4 border-b border-neutral-100 dark:border-neutral-900/50 pb-4">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Segment</label>
              <div className="flex items-center space-x-3">
                {selectedCategories.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedCategories([]);}}>Clear</span>}
                {isCategoryOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isCategoryOpen && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2.5 pr-2">
                {uniqueCategories.map(cat => (
                  <label key={cat} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6 border-b border-neutral-100 dark:border-neutral-900/50 pb-6">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsChannelOpen(!isChannelOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Compare Channels</label>
              <div className="flex items-center space-x-3">
                {selectedChannels.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedChannels([]);}}>Clear</span>}
                {isChannelOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isChannelOpen && (
              <div className="mt-3 max-h-60 overflow-y-auto space-y-2.5 pr-2">
                {uniqueChannelsList.map(channel => (
                  <label key={channel} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedChannels.includes(channel)} onChange={() => toggleFilter(channel, selectedChannels, setSelectedChannels)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1" title={channel}>{channel}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6 mt-auto">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">Viewing Mode</label>
            <button
              onClick={() => setShowCompetitors(!showCompetitors)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${showCompetitors ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400' : 'bg-neutral-100 dark:bg-[#111] border-transparent text-neutral-500'}`}
            >
              <span className="text-sm font-bold flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Market Landscape
              </span>
              <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${showCompetitors ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showCompetitors ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
            <p className="text-[9px] text-neutral-400 mt-2 px-1 leading-tight">Include competitor channels and benchmark market performance.</p>
          </div>

        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-900 flex items-center justify-between px-6 lg:px-8 z-10 shrink-0">
          <div className="flex items-center w-full max-w-xl">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-4 text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5"/> : <PanelLeftOpen className="w-5 h-5"/>}
            </button>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input type="text" placeholder="Search channels..." className="w-full pl-11 pr-4 py-2.5 text-sm font-medium bg-neutral-100 dark:bg-[#111] placeholder-neutral-500 border border-transparent focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-neutral-300 dark:focus:border-neutral-700 rounded-full outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </div>
          </div>

          <div className="flex items-center space-x-4 lg:space-x-6">
            <div className="hidden lg:flex items-center bg-neutral-50 dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-full px-4 py-1.5">
              <div className="text-right mr-3 pr-3 border-r border-neutral-200 dark:border-neutral-800">
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Channels</p>
                <p className="text-sm font-bold leading-none mt-0.5">{summaryMetrics.channelCount}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Total Reach</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none mt-0.5 tracking-tight">{summaryMetrics.total} M</p>
              </div>
            </div>

            <button onClick={exportToExcel} className="hidden sm:flex items-center px-4 py-2 text-sm font-bold bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform shadow-sm">
              <Download className="w-4 h-4 mr-2"/> Export
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#111] transition-all">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 p-4 lg:p-6 bg-neutral-50 dark:bg-black">
          
          {/* EXECUTIVE INSIGHTS BAR WITH TARGET HIGHLIGHT */}
          {processedData.length > 0 && topChannel && (
            <div className="mb-3 bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-xl py-2.5 px-4 flex items-center justify-between shadow-sm shrink-0">
              
              {/* Leader Info */}
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3 shrink-0">
                   <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-tight"> 
                  <strong className="text-black dark:text-white font-black">{topChannel.channelName}</strong> leads this view with 
                  <strong className="text-black dark:text-white font-black mx-1">{topChannel.metrics.total.toFixed(2)} M</strong> reach 
                  ({parseFloat(summaryMetrics.total) > 0 ? ((topChannel.metrics.total / parseFloat(summaryMetrics.total)) * 100).toFixed(1) : 0}% share of current audience).
                </p>
              </div>

              {/* Dynamic Target Highlight Box */}
              {highlightedData && (
                <div className="ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-800 flex items-center shrink-0">
                  <div className="bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 flex items-center shadow-sm">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mr-2">{highlightedData.channelName}</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      ({parseFloat(summaryMetrics.total) > 0 ? ((highlightedData.metrics.total / parseFloat(summaryMetrics.total)) * 100).toFixed(2) : 0}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
            <div className="overflow-auto custom-scrollbar flex-1 relative">
              <table className="w-full text-sm text-left text-neutral-600 dark:text-neutral-400 border-collapse">
                <thead className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest whitespace-nowrap sticky top-0 z-30 shadow-sm">
                  <tr>
                    <th className="px-6 py-5 min-w-[240px] sticky left-0 z-30 bg-neutral-50 dark:bg-[#111] shadow-[1px_0_0_0_#e5e5e5] dark:shadow-[1px_0_0_0_#262626]">Channel Identity</th>
                    <th className="px-6 py-5 text-right cursor-pointer bg-neutral-50 dark:bg-[#111] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[120px]" onClick={() => setSortBy('fb')}>Facebook</th>
                    <th className="px-6 py-5 text-right cursor-pointer bg-neutral-50 dark:bg-[#111] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[120px]" onClick={() => setSortBy('ig')}>Instagram</th>
                    <th className="px-6 py-5 text-right cursor-pointer bg-neutral-50 dark:bg-[#111] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[120px]" onClick={() => setSortBy('yt')}>YouTube</th>
                    <th className="px-6 py-5 text-right cursor-pointer bg-blue-50 dark:bg-[#161e2e] hover:bg-blue-100 dark:hover:bg-[#1f2937] transition-colors min-w-[140px]" onClick={() => setSortBy('total')}>Total Reach</th>
                    <th className="px-6 py-4 text-center bg-neutral-50 dark:bg-[#111] min-w-[200px]">Share of Audience</th>
                    <th className="px-6 py-5 min-w-[120px] text-center bg-neutral-50 dark:bg-[#111]">Segment</th>
                  </tr>
                </thead>
                
                <tbody className="z-0 relative">
                  {processedData.length > 0 ? processedData.map((channel, i) => {
                    const total = channel.metrics.total || 0;
                    const fbPct = total > 0 ? ((channel.metrics.fb || 0) / total) * 100 : 0;
                    const igPct = total > 0 ? ((channel.metrics.ig || 0) / total) * 100 : 0;
                    const ytPct = total > 0 ? ((channel.metrics.yt || 0) / total) * 100 : 0;
                    
                    const isZee = channel.networkType === 'Zee';
                    const isHighlighted = highlightedChannel === channel.channelName;

                    // Row style logic based on highlight and network type
                    const rowClass = isHighlighted 
                      ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' 
                      : isZee 
                        ? 'border-neutral-100 dark:border-neutral-900/50 bg-white dark:bg-[#0a0a0a] hover:bg-neutral-50 dark:hover:bg-[#111]' 
                        : 'border-neutral-100 dark:border-neutral-900/50 bg-neutral-50/60 dark:bg-[#111]/30 hover:bg-neutral-100/50 dark:hover:bg-[#111]/40';

                    // Sticky column background logic
                    const stickyCellClass = isHighlighted 
                      ? 'bg-blue-50 dark:bg-[#161e2e]' 
                      : isZee 
                        ? 'bg-white dark:bg-[#0a0a0a] group-hover:bg-neutral-50 dark:group-hover:bg-[#151515]' 
                        : 'bg-neutral-50 dark:bg-[#111] group-hover:bg-neutral-100/50 dark:group-hover:bg-[#111]/40';

                    return (
                      <tr 
                        key={i} 
                        onClick={() => setHighlightedChannel(prev => prev === channel.channelName ? null : channel.channelName)}
                        className={`group whitespace-nowrap transition-colors border-b cursor-pointer ${rowClass}`}
                      >
                        
                        {/* STICKY FIRST COLUMN */}
                        <td className={`px-6 py-3 sticky left-0 z-20 shadow-[1px_0_0_0_#e5e5e5] dark:shadow-[1px_0_0_0_#262626] transition-colors ${stickyCellClass}`}>
                          <div className="flex items-center">
                            {isZee ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-black dark:bg-white text-white dark:text-black text-[10px] font-black mr-3 shrink-0 shadow-sm">Z</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 text-[9px] font-bold mr-3 shrink-0" title="Competitor">C</span>
                            )}
                            <span className={`font-bold ${isZee ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>{channel.channelName}</span>
                          </div>
                        </td>

                        <td className={`px-6 py-3 text-right font-medium transition-colors ${isZee ? '' : 'opacity-70'}`}>
                          {(channel.metrics.fb || 0).toFixed(2)} M
                        </td>
                        
                        <td className={`px-6 py-3 text-right font-medium transition-colors ${isZee ? '' : 'opacity-70'}`}>
                          {(channel.metrics.ig || 0).toFixed(2)} M
                        </td>
                        
                        <td className={`px-6 py-3 text-right font-medium transition-colors ${isZee ? '' : 'opacity-70'}`}>
                          {(channel.metrics.yt || 0).toFixed(2)} M
                        </td>
                        
                        <td className={`px-6 py-3 text-right font-black transition-colors ${isZee ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'} ${isHighlighted ? '' : isZee ? 'bg-blue-50/30 dark:bg-blue-900/10 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20' : 'bg-neutral-100/50 dark:bg-neutral-900/30 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/50'}`}>
                          {total.toFixed(2)} M
                        </td>

                        <td className={`px-6 py-3 transition-colors ${isZee ? '' : 'opacity-60'}`}>
                          <div className="w-full flex flex-col justify-center">
                            {total > 0 ? (
                              <>
                                <div className="flex text-[9px] font-bold mb-1 w-full relative h-3">
                                  {fbPct >= 5 && <span style={{ width: `${fbPct}%` }} className="text-blue-500 absolute left-0 text-left">{fbPct.toFixed(0)}%</span>}
                                  {igPct >= 5 && <span style={{ left: `${fbPct}%`, width: `${igPct}%` }} className="text-yellow-500 absolute text-center">{igPct.toFixed(0)}%</span>}
                                  {ytPct >= 5 && <span style={{ width: `${ytPct}%` }} className="text-red-500 absolute right-0 text-right">{ytPct.toFixed(0)}%</span>}
                                </div>
                                <div className="flex w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-inner">
                                  <div style={{ width: `${fbPct}%` }} className="bg-blue-500 h-full transition-all"></div>
                                  <div style={{ width: `${igPct}%` }} className="bg-yellow-500 h-full transition-all"></div>
                                  <div style={{ width: `${ytPct}%` }} className="bg-red-500 h-full transition-all"></div>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">No data</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-3 text-center transition-colors">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${isZee ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500' : 'border border-neutral-200 dark:border-neutral-800 text-neutral-400'}`}>
                            {channel.category}
                          </span>
                        </td>
                        
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-neutral-400 font-bold">No channels match these criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* FOOTER */}
            <div className="bg-neutral-50 dark:bg-[#111] border-t border-neutral-200 dark:border-neutral-900 px-6 py-3 grid grid-cols-3 items-center text-xs text-neutral-500 font-medium shrink-0 z-30">
              <div className="flex items-center justify-start">
                <Clock className="w-3.5 h-3.5 mr-2"/> Last Synchronised: {lastSync}
              </div>
              <div className="text-center hidden sm:block">
                Click any row to highlight & extract insights
              </div>
              <div className="flex items-center justify-end space-x-4 font-bold text-[10px] uppercase tracking-wider">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 shadow-sm"></span> Facebook</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1.5 shadow-sm"></span> Instagram</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 shadow-sm"></span> YouTube</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}