import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// 1. Initialise the Google Auth Client
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID!, serviceAccountAuth);

// 2. Utility: URL Normaliser to extract just the handle (e.g., 'shraddhaarya')
function normalizeHandle(url: string | undefined): string {
  if (!url) return '';
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? match[1].toLowerCase().trim() : '';
}

// 3. Main Data Fetching Function
export async function getDashboardData() {
  await doc.loadInfo(); 

  const rosterSheet = doc.sheetsByTitle['Master_Roster'];
  const logSheet = doc.sheetsByTitle['Data_Log'];

  const rosterRows = await rosterSheet.getRows();
  const logRows = await logSheet.getRows();

  // Create a map of the latest scrape data for each actor
  // By looping through the log, the last entry for a handle overwrites previous ones, giving us the freshest data.
  const latestMetrics = new Map();
  
  logRows.forEach((row) => {
    const rawUrl = row.get('Instagram URL');
    const handle = normalizeHandle(rawUrl);
    
    if (handle) {
      latestMetrics.set(handle, {
        exactFollowers: row.get('Exact Followers') || 0,
        formattedFollowers: row.get('Formatted Followers') || '-',
        avgReelViews: row.get('Avg Reel Views') || '-',
        viewRate: row.get('Reel View Rate %') || '-',
        lastUpdated: row.get('Date') || '-',
      });
    }
  });

  // Merge the Roster metadata with the Latest Metrics
  const combinedData = rosterRows.map((row) => {
    const handle = normalizeHandle(row.get('Instagram URL'));
    const metrics = latestMetrics.get(handle) || null;

    return {
      handle: handle,
      realName: row.get('Real Name') || 'Unknown',
      reelName: row.get('Reel Name') || '-',
      channel: row.get('Channel') || '-',
      showName: row.get('Show Name') || '-',
      timeSlot: row.get('Time Slot') || '-',
      gender: row.get('Gender') || '-',
      headshotUrl: row.get('Headshot URL') || null,
      status: row.get('Status') || 'Active',
      metrics: metrics, // This attaches the numerical data
    };
  });

  // Filter out inactive actors before sending to the frontend
  return combinedData.filter((actor) => actor.status.toLowerCase() !== 'inactive');
}

// Add this at the bottom of your googleSheets.ts file
export async function getLastSyncDate() {
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
    
    // Fetch only Column A from Data_Log
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Data_Log!A:A',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return 'No sync data';

    // Grab the very last row in the array
    const lastEntry = rows[rows.length - 1][0];
    
    return lastEntry;
  } catch (error) {
    console.error('Error fetching last sync date:', error);
    return 'Unknown';
  }
}