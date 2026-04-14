"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Moon, Sun, ArrowLeft, Clock, Filter, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function MacroDashboardClient({ initialData, lastSync }: { initialData: any[], lastSync: string }) {
  const router = useRouter();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'fb' | 'ig' | 'yt'>('total');
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Accordion State
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isChannelOpen, setIsChannelOpen] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  // Dynamic Lists for Sidebar
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(initialData.map(ch => ch.category))).sort();
  }, [initialData]);

  const uniqueChannels = useMemo(() => {
    const filteredForChannels = selectedCategories.length > 0 
      ? initialData.filter(ch => selectedCategories.includes(ch.category))
      : initialData;
    return Array.from(new Set(filteredForChannels.map(ch => ch.channelName))).sort();
  }, [initialData, selectedCategories]);

  const toggleFilter = (item: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // Dynamic Filtering & Sorting
  const processedData = useMemo(() => {
    let filtered = initialData.filter(channel => {
      const matchesSearch = channel.channelName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(channel.category);
      const matchesChannel = selectedChannels.length === 0 || selectedChannels.includes(channel.channelName);
      
      return matchesSearch && matchesCategory && matchesChannel;
    });

    return filtered.sort((a, b) => {
      const aVal = a.metrics[sortBy] || 0;
      const bVal = b.metrics[sortBy] || 0;
      return bVal - aVal;
    });
  }, [initialData, searchQuery, selectedCategories, selectedChannels, sortBy]);

  // Aggregate Maths
  const summaryMetrics = useMemo(() => {
    const total = processedData.reduce((sum, ch) => sum + (ch.metrics.total || 0), 0);
    return {
      total: total.toFixed(2), 
      channelCount: processedData.length
    };
  }, [processedData]);

  // ENTERPRISE EXPORT ENGINE
  const exportToExcel = () => {
    // 1. Data Sheet (Math applied to convert back to raw numbers)
    const dataRows = processedData.map(channel => ({
      "Channel Identity": channel.channelName,
      "Segment": channel.category,
      "Facebook": Math.round((channel.metrics.fb || 0) * 1000000),
      "Instagram": Math.round((channel.metrics.ig || 0) * 1000000),
      "YouTube": Math.round((channel.metrics.yt || 0) * 1000000),
      "Total Reach": Math.round((channel.metrics.total || 0) * 1000000)
    }));
    const dataSheet = XLSX.utils.json_to_sheet(dataRows);

    // 2. Metadata & Filters Sheet
    const metadataRows = [
      { "Configuration": "Export Date", "Value": new Date().toLocaleString('en-GB') },
      { "Configuration": "Data Last Synchronised", "Value": lastSync },
      { "Configuration": "Search Query Applied", "Value": searchQuery || "None" },
      { "Configuration": "Segments Filtered", "Value": selectedCategories.length > 0 ? selectedCategories.join(', ') : "All Categories" },
      { "Configuration": "Channels Filtered", "Value": selectedChannels.length > 0 ? selectedChannels.join(', ') : "All Channels" },
      { "Configuration": "Data Note", "Value": "All metrics have been converted from millions into raw integers for calculation purposes." }
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metadataRows);

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataSheet, "Network Data");
    XLSX.utils.book_append_sheet(wb, metaSheet, "Report Metadata");

    // 4. Download
    XLSX.writeFile(wb, `Zee_Network_Intelligence_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      {/* SIDEBAR (Matches Talent Dashboard) */}
      <aside className={`${isSidebarOpen ? 'w-[280px] px-6' : 'w-0 px-0 opacity-0'} transition-all duration-300 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 flex flex-col z-20 shadow-sm overflow-hidden whitespace-nowrap shrink-0`}>
        <div className="h-20 flex items-center border-b border-neutral-100 dark:border-neutral-900 mb-6 shrink-0">
          <button onClick={() => router.push('/')} className="mr-3 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mr-3">
            <span className="text-white dark:text-black font-black text-xl leading-none">Z</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Network Intel</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-6 flex flex-col custom-scrollbar pr-2">
          
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest"><Filter className="w-3 h-3 mr-2" /> Filters</span>
            {(selectedCategories.length > 0 || selectedChannels.length > 0) && (
              <button onClick={() => { setSelectedCategories([]); setSelectedChannels([]); }} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">Reset</button>
            )}
          </div>
            
          {/* ACCORDION 1: CATEGORY / SEGMENT */}
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

          {/* ACCORDION 2: CHANNEL COMPARISON */}
          <div className="mb-4">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsChannelOpen(!isChannelOpen)}>
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer">Compare Channels</label>
              <div className="flex items-center space-x-3">
                {selectedChannels.length > 0 && <span className="text-[9px] text-blue-500 font-bold uppercase" onClick={(e)=>{e.stopPropagation(); setSelectedChannels([]);}}>Clear</span>}
                {isChannelOpen ? <ChevronUp className="w-4 h-4 text-neutral-400"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
              </div>
            </div>
            
            {isChannelOpen && (
              <div className="mt-3 max-h-60 overflow-y-auto space-y-2.5 pr-2">
                {uniqueChannels.map(channel => (
                  <label key={channel} className="flex items-center space-x-3 group cursor-pointer">
                    <input type="checkbox" checked={selectedChannels.includes(channel)} onChange={() => toggleFilter(channel, selectedChannels, setSelectedChannels)} className="w-4 h-4 rounded border-neutral-300 text-black dark:text-white focus:ring-black dark:focus:ring-white dark:border-neutral-700 dark:bg-neutral-900 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1" title={channel}>{channel}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* HEADER */}
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

            {/* NEW: Export Button */}
            <button onClick={exportToExcel} className="hidden sm:flex items-center px-4 py-2 text-sm font-bold bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform shadow-sm">
              <Download className="w-4 h-4 mr-2"/> Export
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#111] transition-all">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* HIGH DENSITY TABLE */}
        <main className="flex-1 flex flex-col min-h-0 p-4 lg:p-6 bg-neutral-50 dark:bg-black">
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-900 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-sm text-left text-neutral-600 dark:text-neutral-400">
                <thead className="text-xs font-black text-black dark:text-white uppercase tracking-widest bg-neutral-50 dark:bg-[#111] border-b border-neutral-200 dark:border-neutral-900 whitespace-nowrap sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 min-w-[200px]">Channel Identity</th>
                    <th className="px-6 py-4 min-w-[120px]">Segment</th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[100px]" onClick={() => setSortBy('fb')}>Facebook</th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[100px]" onClick={() => setSortBy('ig')}>Instagram</th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors min-w-[100px]" onClick={() => setSortBy('yt')}>YouTube</th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors bg-blue-50/50 dark:bg-blue-900/10 min-w-[120px]" onClick={() => setSortBy('total')}>Total Reach</th>
                    <th className="px-6 py-4 min-w-[200px]">Share of Audience</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.length > 0 ? processedData.map((channel, i) => {
                    const total = channel.metrics.total || 0;
                    const fbPct = total > 0 ? ((channel.metrics.fb || 0) / total) * 100 : 0;
                    const igPct = total > 0 ? ((channel.metrics.ig || 0) / total) * 100 : 0;
                    const ytPct = total > 0 ? ((channel.metrics.yt || 0) / total) * 100 : 0;

                    return (
                      <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors whitespace-nowrap">
                        <td className="px-6 py-3 font-bold text-black dark:text-white">{channel.channelName}</td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                            {channel.category}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium">{(channel.metrics.fb || 0).toFixed(2)} M</td>
                        <td className="px-6 py-3 text-right font-medium">{(channel.metrics.ig || 0).toFixed(2)} M</td>
                        <td className="px-6 py-3 text-right font-medium">{(channel.metrics.yt || 0).toFixed(2)} M</td>
                        <td className="px-6 py-3 text-right font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10">
                          {total.toFixed(2)} M
                        </td>
                        <td className="px-6 py-3">
                          <div className="w-full flex flex-col justify-center">
                            {total > 0 ? (
                              <>
                                <div className="flex text-[9px] font-bold mb-1 w-full relative h-3">
                                  {fbPct >= 5 && <span style={{ width: `${fbPct}%` }} className="text-blue-500 absolute left-0 text-left">{fbPct.toFixed(0)}%</span>}
                                  {igPct >= 5 && <span style={{ left: `${fbPct}%`, width: `${igPct}%` }} className="text-purple-500 absolute text-center">{igPct.toFixed(0)}%</span>}
                                  {ytPct >= 5 && <span style={{ width: `${ytPct}%` }} className="text-red-500 absolute right-0 text-right">{ytPct.toFixed(0)}%</span>}
                                </div>
                                <div className="flex w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                  <div style={{ width: `${fbPct}%` }} className="bg-blue-500 h-full transition-all"></div>
                                  <div style={{ width: `${igPct}%` }} className="bg-purple-500 h-full transition-all"></div>
                                  <div style={{ width: `${ytPct}%` }} className="bg-red-500 h-full transition-all"></div>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">No data</span>
                            )}
                          </div>
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
            <div className="bg-neutral-50 dark:bg-[#111] border-t border-neutral-200 dark:border-neutral-900 px-6 py-3 grid grid-cols-3 items-center text-xs text-neutral-500 font-medium shrink-0">
              <div className="flex items-center justify-start">
                <Clock className="w-3.5 h-3.5 mr-2"/> Last Synchronised: {lastSync}
              </div>
              <div className="text-center">
                Click any column header to sort data
              </div>
              <div className="flex items-center justify-end space-x-4 font-bold text-[10px] uppercase tracking-wider">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></span> Facebook</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-1.5"></span> Instagram</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span> YouTube</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}