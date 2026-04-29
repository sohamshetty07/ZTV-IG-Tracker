import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// --- LOCAL DEV CACHE BYPASS TO PREVENT 429 ERRORS ---
const globalCache = globalThis as unknown as {
  sheetCache: {
    talent: { data: any, time: number } | null,
    network: { data: any, time: number } | null,
    talentSync: { data: string, time: number } | null,
    networkSync: { data: string, time: number } | null
  }
};

if (!globalCache.sheetCache) {
  globalCache.sheetCache = { talent: null, network: null, talentSync: null, networkSync: null };
}

const CACHE_TTL = 60 * 1000; // 60 seconds memory cache
// ----------------------------------------------------

// 1. Initialise the Google Auth Client
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID!, serviceAccountAuth);

// 2. Utility: URL Normaliser to extract just the handle
function normalizeHandle(url: string | undefined): string {
  if (!url) return '';
  const cleanStr = String(url).toLowerCase().trim();
  
  // Explicitly ignore "Not Active" and variants
  if (cleanStr === 'not active' || cleanStr === 'n/a' || cleanStr === '-') return '';

  // Route 1: It's a standard Instagram URL
  const match = cleanStr.match(/instagram\.com\/([^/?#]+)/i);
  if (match) return match[1].replace('@', '').trim();

  // Route 2: It's raw text (e.g., "@shraddhaarya" or "shraddhaarya")
  if (!cleanStr.includes('http') && !cleanStr.includes('.com')) {
     return cleanStr.replace('@', '').trim();
  }

  return '';
}

// 3. Main Data Fetching Function (Talent Dashboard)
export async function getDashboardData() {
  if (process.env.NODE_ENV === 'development' && globalCache.sheetCache.talent && (Date.now() - globalCache.sheetCache.talent.time < CACHE_TTL)) {
    console.log('⚡ Serving Talent data from local cache to save API quota...');
    return globalCache.sheetCache.talent.data;
  }

  try {
    await doc.loadInfo(); 

    const rosterSheet = doc.sheetsByTitle['Master_Roster'];
    const logSheet = doc.sheetsByTitle['Data_Log'];

    const rosterRows = await rosterSheet.getRows();
    const logRows = await logSheet.getRows();

    const latestMetrics = new Map();
    
    logRows.forEach((row) => {
      const rawUrl = row.get('Instagram URL');
      const handle = normalizeHandle(rawUrl);
      
      if (handle) {
        latestMetrics.set(handle, {
          exactFollowers: row.get('Exact Followers') || 0,
          formattedFollowers: row.get('Formatted Followers') || '-',
          avgPhotoLikes: row.get('Avg Photo Likes') || '-',
          avgReelViews: row.get('Avg Reel Views') || '-',
          avgComments: row.get('Avg Comments') || '-',
          viewRate: row.get('Reel View Rate %') || '-',
          lastUpdated: row.get('Date') || '-',
        });
      }
    });

    const combinedData = rosterRows.map((row) => {
      const rawUrl = row.get('Instagram URL');
      
      // EXPLICIT OFF-GRID TAGGING
      const isOffGrid = String(rawUrl || '').toLowerCase().trim() === 'not active';
      
      const handle = isOffGrid ? '' : normalizeHandle(rawUrl);
      const metrics = latestMetrics.get(handle) || null;

      return {
        handle: handle,
        isOffGrid: isOffGrid, // NEW DATA POINT
        realName: row.get('Real Name') || 'Unknown',
        reelName: row.get('Reel Name') || '-',
        channel: row.get('Channel') || '-',
        showName: row.get('Show Name') || '-',
        timeSlot: row.get('Time Slot') || '-',
        gender: row.get('Gender') || '-',
        headshotUrl: row.get('Headshot URL') || null,
        status: row.get('Status') || 'Active',
        metrics: metrics,
      };
    });

    const finalData = combinedData.filter((actor) => actor.status.toLowerCase() !== 'inactive');

    if (process.env.NODE_ENV === 'development') {
      globalCache.sheetCache.talent = { data: finalData, time: Date.now() };
    }

    return finalData;

  } catch (error) {
    console.error('Error fetching Dashboard Data:', error);
    return [];
  }
}

// 4. Last Sync Date Function (Talent Dashboard)
export async function getLastSyncDate() {
  if (process.env.NODE_ENV === 'development' && globalCache.sheetCache.talentSync && (Date.now() - globalCache.sheetCache.talentSync.time < CACHE_TTL)) {
    return globalCache.sheetCache.talentSync.data;
  }

  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Data_Log!A:A', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return 'Empty Sheet';

    let lastEntry = '';
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i] && rows[i][0] && rows[i][0].trim() !== '') {
        lastEntry = rows[i][0].trim();
        break;
      }
    }

    if (!lastEntry) return 'No Text Found';

    let resultString = lastEntry.substring(0, 16); 

    try {
      const dateStringOnly = lastEntry.split(' ')[0]; 
      const parts = dateStringOnly.split('-');
      
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[month - 1];

        const getOrdinalSuffix = (n: number) => {
          if (n > 3 && n < 21) return 'th';
          switch (n % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
          }
        };

        if (!isNaN(day) && monthName && !isNaN(year)) {
          resultString = `${day}${getOrdinalSuffix(day)} ${monthName} ${year}`;
        }
      }
    } catch (parseError) { }

    if (process.env.NODE_ENV === 'development') {
      globalCache.sheetCache.talentSync = { data: resultString, time: Date.now() };
    }

    return resultString;

  } catch (error: any) {
    console.error('API Error:', error);
    return (error.message || 'API Error').substring(0, 18);
  }
}

// 5. Macro Dashboard Data Fetching (Network Overview)
export async function getMacroData() {
  if (process.env.NODE_ENV === 'development' && globalCache.sheetCache.network && (Date.now() - globalCache.sheetCache.network.time < CACHE_TTL)) {
    console.log('⚡ Serving Network data from local cache to save API quota...');
    return globalCache.sheetCache.network.data;
  }

  try {
    await doc.loadInfo(); 

    const urlsSheet = doc.sheetsByTitle['Master_URLs'];
    const compUrlsSheet = doc.sheetsByTitle['Competitor_URLs']; 
    const logSheet = doc.sheetsByTitle['Macro_Data_Log'];

    if (!urlsSheet || !logSheet) return [];

    const urlRows = await urlsSheet.getRows();
    const compUrlRows = compUrlsSheet ? await compUrlsSheet.getRows() : []; 
    const logRows = await logSheet.getRows();

    const latestMacroMetrics = new Map();

    logRows.forEach((row) => {
      const channelName = (row.get('Channel Name') || '').trim();
      if (channelName) {
        const parseMetric = (val: string) => parseFloat(val?.replace(/,/g, '') || '0') || 0;
        
        latestMacroMetrics.set(channelName.toLowerCase(), {
          fb: parseMetric(row.get('FB Followers')),
          ig: parseMetric(row.get('IG Followers')),
          yt: parseMetric(row.get('YT Subscribers')),
          lastUpdated: row.get('Date') || '-',
        });
      }
    });

    const uniqueChannels = new Map();

    const processRows = (rows: any[], networkType: 'Zee' | 'Competitor') => {
      rows.forEach((row) => {
        const channelName = (row.get('Channel Name') || '').trim();
        const status = (row.get('Status') || '').trim().toLowerCase();
        
        if (!channelName || status !== 'active') return;

        const normalizedName = channelName.toLowerCase();

        if (!uniqueChannels.has(normalizedName)) {
          const metrics = latestMacroMetrics.get(normalizedName) || { fb: 0, ig: 0, yt: 0, lastUpdated: '-' };
          const totalAudience = metrics.fb + metrics.ig + metrics.yt;

          let category = (row.get('Category') || '').trim();
          if (!category) category = 'Uncategorised';

          // NEW: Fetch Network Alignment with safe fallbacks
          const rawAlignment = row.get('Network Alignment')?.trim();
          const alignment = rawAlignment || (networkType === 'Zee' ? 'Zee Entertainment' : 'Competitor');

          const fbUrl = row.get('Facebook URL')?.trim() || '-';
          const igUrl = row.get('Instagram URL')?.trim() || '-';
          let ytId = row.get('YouTube Channel ID')?.trim() || '-';
          
          if (ytId !== '-' && !ytId.includes('youtube.com')) {
            ytId = ytId.startsWith('@') ? `https://www.youtube.com/${ytId}` : `https://www.youtube.com/channel/${ytId}`;
          }

          uniqueChannels.set(normalizedName, {
            id: channelName,
            channelName: channelName,
            category: category,
            alignment: alignment, // APPENDED TO OUTPUT OBJECT
            status: 'Active',
            networkType: networkType, 
            urls: {
              facebook: fbUrl,
              instagram: igUrl,
              youtube: ytId
            },
            metrics: {
              ...metrics,
              total: totalAudience
            }
          });
        }
      });
    };

    processRows(urlRows, 'Zee');
    processRows(compUrlRows, 'Competitor');

    const finalData = Array.from(uniqueChannels.values());

    if (process.env.NODE_ENV === 'development') {
      globalCache.sheetCache.network = { data: finalData, time: Date.now() };
    }

    return finalData;

  } catch (error) {
    console.error('Error fetching Macro Data:', error);
    return [];
  }
}

// 6. Macro Dashboard Last Sync Date
export async function getMacroLastSyncDate() {
  if (process.env.NODE_ENV === 'development' && globalCache.sheetCache.networkSync && (Date.now() - globalCache.sheetCache.networkSync.time < CACHE_TTL)) {
    return globalCache.sheetCache.networkSync.data;
  }

  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Macro_Dashboard!A1:B3', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return 'Unknown';

    let finalDate = 'Unknown';

    for (const row of rows) {
      if (row[0] && row[0].toString().toLowerCase().includes('last updated')) {
        if (row[1] && row[1].trim() !== '') finalDate = row[1].trim();
      }
    }

    if (finalDate === 'Unknown' && rows[1] && rows[1][1] && rows[1][1].trim() !== '') finalDate = rows[1][1].trim();
    if (finalDate === 'Unknown' && rows[0] && rows[0][1] && rows[0][1].trim() !== '') finalDate = rows[0][1].trim();

    if (process.env.NODE_ENV === 'development') {
      globalCache.sheetCache.networkSync = { data: finalDate, time: Date.now() };
    }

    return finalDate;

  } catch (error) {
    console.error('Error fetching Macro Last Sync:', error);
    return 'Unknown';
  }
}