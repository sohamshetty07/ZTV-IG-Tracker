import asyncio
import re
import random
import os
import sys
import logging
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
from playwright.async_api import async_playwright

# ==========================================
# 0. DYNAMIC HEADLESS & LOGGING SETUP
# ==========================================
# If '--cron' is passed in the terminal, it runs invisibly. Otherwise, it pops up.
IS_CRON_JOB = '--cron' in sys.argv

# Set up logging to write to both the terminal and a permanent text file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler("tracker_history.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ==========================================
# 1. MATHEMATICS & FORMATTING
# ==========================================
def format_for_presentation(count):
    """Converts an exact integer into a clean decimal string (e.g., 1463541 -> '1.5M')."""
    if not count:
        return ""
    try:
        num = int(count)
        if num >= 1000000:
            formatted = f"{num / 1000000:.1f}"
            if formatted.endswith('.0'):
                formatted = formatted[:-2]
            return f"{formatted}M"
        elif num >= 1000:
            formatted = f"{num / 1000:.1f}"
            if formatted.endswith('.0'):
                formatted = formatted[:-2]
            return f"{formatted}K"
        else:
            return f"{num:,}"
    except ValueError:
        return str(count)

def parse_to_raw_integer(formatted_str):
    """Reverse-engineers strings like '1.5M' back into roughly 1500000 for delta maths."""
    if not formatted_str or formatted_str == "-":
        return 0
    clean_str = str(formatted_str).upper().replace(',', '').strip()
    try:
        if 'M' in clean_str:
            return int(float(clean_str.replace('M', '')) * 1000000)
        elif 'K' in clean_str:
            return int(float(clean_str.replace('K', '')) * 1000)
        else:
            return int(clean_str)
    except Exception:
        return 0

def calculate_growth(old_str, new_raw_int):
    """Calculates the difference between the old string and the new exact integer."""
    if not old_str or new_raw_int == 0:
        return "-"
        
    old_raw_int = parse_to_raw_integer(old_str)
    if old_raw_int == 0:
        return "-"
        
    diff = new_raw_int - old_raw_int
    
    if diff > 0:
        return f"+{format_for_presentation(diff)}"
    elif diff < 0:
        return f"-{format_for_presentation(abs(diff))}"
    else:
        return "0"

# ==========================================
# 2. GOOGLE SHEETS AUTHENTICATION
# ==========================================
SCOPE = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
CREDS = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", SCOPE)
client = gspread.authorize(CREDS)

SPREADSHEET_NAME = "All Genre-Social Presence + Influencers" 
sheet = client.open(SPREADSHEET_NAME).worksheet("IG_Tracker")

# ==========================================
# 3. MAIN ORCHESTRATOR
# ==========================================
async def main():
    mode = "INVISIBLE BACKGROUND MODE" if IS_CRON_JOB else "VISIBLE DEBUGGING MODE"
    logger.info(f"Starting the ZTV Instagram Tracker [{mode}]...")
    
    if not os.path.exists("./ig_profile"):
        logger.error("Persistent profile folder 'ig_profile' not found! Run setup_auth.py first.")
        return

    records = sheet.get_all_records()
    # We now have 4 columns to update: Followers, Growth, Time, Status
    batch_updates = [["", "", "", ""] for _ in range(len(records))]
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./ig_profile",
            headless=IS_CRON_JOB, 
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        page = context.pages[0]
        logger.info(f"Processing {len(records)} profiles as a verified user...\n")
        
        for index, row in enumerate(records):
            influencer_name = row.get('Influencer Name', 'Unknown')
            full_url = str(row.get("Instagram URL", ""))
            old_followers = str(row.get("Followers Count", ""))
            old_growth = str(row.get("Growth", "-")) # Fallback if column is empty
            
            if not full_url or "instagram" not in full_url.lower():
                batch_updates[index] = [old_followers, old_growth, current_time, "Skipped: Invalid Link"]
                continue
                
            url_match = re.search(r'instagram\.com/([^/?#]+)', full_url)
            if url_match:
                handle = url_match.group(1).strip()
                logger.info(f" -> Checking @{handle}...")
                
                try:
                    await page.goto(f"https://www.instagram.com/{handle}/", wait_until="domcontentloaded", timeout=15000)
                    await page.wait_for_timeout(3000)
                    
                    exact_count = None
                    final_followers = ""
                    growth_delta = "-"
                    status = "Blocked/Data not found"
                    
                    try:
                        locators = await page.locator('a[href$="/followers/"] span').all()
                        for loc in locators:
                            title = await loc.get_attribute('title')
                            if title:
                                exact_count = int(re.sub(r'[^\d]', '', title))
                                break
                            else:
                                text = await loc.inner_text()
                                if text and text.replace(',', '').isdigit():
                                    exact_count = int(text.replace(',', ''))
                                    break
                    except Exception:
                        pass
                    
                    if exact_count is not None:
                        final_followers = format_for_presentation(exact_count)
                        growth_delta = calculate_growth(old_followers, exact_count)
                        status = "Success (Exact from UI)"
                    
                    if not final_followers:
                        final_followers = old_followers
                        growth_delta = old_growth
                        status = "Failed (Kept Previous Data)"
                        
                except Exception:
                    final_followers = old_followers
                    growth_delta = old_growth
                    status = "Timeout/Error (Kept Previous Data)"
                    
                batch_updates[index] = [final_followers, growth_delta, current_time, status]
                logger.info(f" ✓ @{influencer_name} | Result: {final_followers} | Growth: {growth_delta} | {status}")
                
                if index < len(records) - 1:
                    sleep_time = random.uniform(3.0, 6.0)
                    await asyncio.sleep(sleep_time)
            else:
                batch_updates[index] = [old_followers, old_growth, current_time, "Skipped: Invalid Link"]
                
        await context.close()
        
    logger.info("Pushing data to Google Sheets in one single payload...")
    # Update range is now D to G to include the new Growth column
    cell_range = f"D2:G{len(records) + 1}"
    sheet.update(range_name=cell_range, values=batch_updates)
    logger.info("Update complete! Tracker history has been logged.")

if __name__ == "__main__":
    asyncio.run(main())