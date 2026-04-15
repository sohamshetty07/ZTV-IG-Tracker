import asyncio
import re
import random
import os
import sys
import logging
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
from playwright.async_api import async_playwright
from googleapiclient.discovery import build

# ==========================================
# 0. DYNAMIC HEADLESS & LOGGING SETUP
# ==========================================
IS_CRON_JOB = '--cron' in sys.argv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler("macro_tracker.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ==========================================
# 1. API & CONFIGURATION SETUP
# ==========================================
try:
    with open("config.json", "r") as f:
        config = json.load(f)
    YOUTUBE_API_KEY = config["youtube_api_key"]
    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
except FileNotFoundError:
    logger.error("CRITICAL: config.json not found! Please create it with your youtube_api_key.")
    sys.exit(1)
except KeyError:
    logger.error("CRITICAL: 'youtube_api_key' not found in config.json!")
    sys.exit(1)

# ==========================================
# 2. TEXT PARSING & FORMATTING
# ==========================================
def parse_to_raw_integer(formatted_str):
    if not formatted_str or formatted_str == "-": return 0
    clean_str = str(formatted_str).upper().replace(',', '').strip()
    try:
        if 'M' in clean_str: return int(float(clean_str.replace('M', '')) * 1000000)
        elif 'K' in clean_str: return int(float(clean_str.replace('K', '')) * 1000)
        else: return int(re.sub(r'[^\d]', '', clean_str))
    except Exception:
        return 0

def format_macro_count(count):
    if str(count) in ["Error", "Not Found", "Invalid URL", "Invalid ID"]: 
        return str(count)
    if count == 0 or count == "0":
        return 0
    try:
        num = int(count)
        return round(num / 1_000_000, 4)
    except Exception:
        return str(count)

# ==========================================
# 3. GOOGLE SHEETS AUTHENTICATION
# ==========================================
try:
    SCOPE = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    CREDS = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", SCOPE)
    client = gspread.authorize(CREDS)

    SPREADSHEET_NAME = "All Genre-Social Presence + Influencers" 
    
    # NEW: Connecting to both URL sheets
    roster_sheet = client.open(SPREADSHEET_NAME).worksheet("Master_URLs")
    competitor_sheet = client.open(SPREADSHEET_NAME).worksheet("Competitor_URLs")
    
    # We dump ALL data into the same log to optimize the Next.js backend
    log_sheet = client.open(SPREADSHEET_NAME).worksheet("Macro_Data_Log")
except Exception as e:
    logger.error(f"CRITICAL: Failed to authenticate with Google Sheets. Check credentials.json. Error: {e}")
    sys.exit(1)

# ==========================================
# 4. PLATFORM FETCHERS
# ==========================================
def get_youtube_subs(channel_identifier):
    if not channel_identifier or channel_identifier == "-": return "Invalid ID"
    channel_identifier = str(channel_identifier).strip()
    
    try:
        if channel_identifier.startswith('@'):
            request = youtube.channels().list(part="statistics", forHandle=channel_identifier)
        else:
            request = youtube.channels().list(part="statistics", id=channel_identifier)
            
        response = request.execute()
        
        if 'items' in response and len(response['items']) > 0:
            subs = response['items'][0]['statistics']['subscriberCount']
            return format_macro_count(subs)
            
        return "Not Found"
    except Exception as e:
        logger.error(f"   [YT API Error for {channel_identifier}: {e}]")
        return "Error"

async def get_instagram_followers(page, url):
    if not url or "instagram.com" not in url: return "Invalid URL"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000)
        
        locators = await page.locator('a[href$="/followers/"] span').all()
        for loc in locators:
            title = await loc.get_attribute('title')
            if title:
                return format_macro_count(int(re.sub(r'[^\d]', '', title)))
            text = await loc.inner_text()
            if text and text.replace(',', '').isdigit():
                return format_macro_count(int(text.replace(',', '')))
        return "Not Found"
    except Exception as e:
        logger.error(f"   [IG Error: {e}]")
        return "Error"

async def get_facebook_followers(page, url):
    if not url or "facebook.com" not in url: return "Invalid URL"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(4000) 
        
        body_text = await page.locator("body").inner_text()
        match = re.search(r'([\d.,]+[KM]?)\s+followers', body_text, re.IGNORECASE)
        
        if match:
            raw_int = parse_to_raw_integer(match.group(1))
            return format_macro_count(raw_int)
            
        return "Not Found"
    except Exception as e:
        logger.error(f"   [FB Error: {e}]")
        return "Error"

# ==========================================
# 5. MAIN ORCHESTRATOR
# ==========================================
async def main():
    mode = "INVISIBLE BACKGROUND MODE" if IS_CRON_JOB else "VISIBLE DEBUGGING MODE"
    logger.info(f"Starting Macro Multi-Platform Tracker [{mode}]...")
    
    if not os.path.exists("./ig_profile"):
        logger.error("Persistent profile folder 'ig_profile' not found! Run setup_auth.py first.")
        return

    logger.info("Caching historical data to use as a fallback for scrape errors...")
    log_records = log_sheet.get_all_records()
    last_known_data = {}
    for row in log_records:
        ch = str(row.get('Channel Name', '')).strip()
        if ch:
            last_known_data[ch] = {
                'FB': row.get('FB Followers', 0),
                'IG': row.get('IG Followers', 0),
                'YT': row.get('YT Subscribers', 0)
            }

    # NEW: Fetching and combining both sheets
    logger.info("Fetching Zee URLs and Competitor URLs...")
    zee_records = roster_sheet.get_all_records()
    comp_records = competitor_sheet.get_all_records()
    combined_records = zee_records + comp_records
    
    rows_to_append = []
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # --- SELECTIVE TARGETING LOGIC ---
    target_records = [r for r in combined_records if str(r.get("Status", "")).strip().lower() == 'target']
    
    if len(target_records) > 0:
        active_records = target_records
        logger.info(f"Target Mode Activated: Found {len(active_records)} channels marked 'Target' across both sheets. Skipping everything else.")
    else:
        active_records = [r for r in combined_records if str(r.get("Status", "")).strip().lower() == 'active']
        logger.info(f"Standard Mode: Processing {len(active_records)} total active channels.")

    if len(active_records) == 0:
        logger.info("No channels found to process. Exiting.")
        return
    
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./ig_profile",
            headless=IS_CRON_JOB, 
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        page = context.pages[0]
        
        for index, row in enumerate(active_records):
            channel_name = row.get('Channel Name', 'Unknown')
            fb_url = str(row.get("Facebook URL", "")).strip()
            ig_url = str(row.get("Instagram URL", "")).strip()
            yt_id = str(row.get("YouTube Channel ID", "")).strip()
            
            logger.info(f"\n -> Fetching data for {channel_name}...")
            has_error = False
            
            # 1. YouTube
            if yt_id == "-":
                yt_subs = 0
                logger.info("    ✓ YouTube: Skipped (0)")
            else:
                yt_subs = get_youtube_subs(yt_id)
                if str(yt_subs) in ["Error", "Not Found", "Invalid ID"]:
                    has_error = True
                    yt_subs = last_known_data.get(channel_name, {}).get('YT', yt_subs)
                    logger.info(f"    ⚠ YouTube Failed. Using historical fallback: {yt_subs}")
                else:
                    logger.info(f"    ✓ YouTube: {yt_subs}")
            
            # 2. Instagram
            if ig_url == "-":
                ig_followers = 0
                logger.info("    ✓ Instagram: Skipped (0)")
            else:
                ig_followers = await get_instagram_followers(page, ig_url)
                if str(ig_followers) in ["Error", "Not Found", "Invalid URL"]:
                    has_error = True
                    ig_followers = last_known_data.get(channel_name, {}).get('IG', ig_followers)
                    logger.info(f"    ⚠ Instagram Failed. Using historical fallback: {ig_followers}")
                else:
                    logger.info(f"    ✓ Instagram: {ig_followers}")
            
            # 3. Facebook
            if fb_url == "-":
                fb_followers = 0
                logger.info("    ✓ Facebook: Skipped (0)")
            else:
                fb_followers = await get_facebook_followers(page, fb_url)
                if str(fb_followers) in ["Error", "Not Found", "Invalid URL"]:
                    has_error = True
                    fb_followers = last_known_data.get(channel_name, {}).get('FB', fb_followers)
                    logger.info(f"    ⚠ Facebook Failed. Using historical fallback: {fb_followers}")
                else:
                    logger.info(f"    ✓ Facebook: {fb_followers}")
            
            status = "Success (with Fallbacks)" if has_error else "Success"
            
            rows_to_append.append([
                current_time, channel_name, fb_followers, ig_followers, yt_subs, status
            ])
            
            if index < len(active_records) - 1:
                sleep_time = random.uniform(4.0, 7.0)
                await asyncio.sleep(sleep_time)
                
        await context.close()
        
    logger.info("\nAppending combined data to Macro_Data_Log...")
    max_retries = 3
    for attempt in range(max_retries):
        try:
            log_sheet.append_rows(rows_to_append)
            logger.info("Update complete! New macro historical data logged successfully.")
            
            if len(target_records) > 0:
                logger.info("Note: Please remember to change your 'Target' statuses back to 'Active' in your sheet for the next full run.")
            
            break 
        except Exception as e:
            logger.error(f"Google Sheets Upload Error (Attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                logger.info("Waiting 10 seconds for Wi-Fi/Network to stabilise before retrying...")
                import time
                time.sleep(10)
            else:
                logger.error("CRITICAL: Failed to append to Google Sheets.")

if __name__ == "__main__":
    asyncio.run(main())