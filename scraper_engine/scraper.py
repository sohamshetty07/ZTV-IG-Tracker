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
IS_CRON_JOB = '--cron' in sys.argv

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
# 1. FORMATTING & MATHS
# ==========================================
def format_for_presentation(count):
    if not count: return ""
    try:
        num = int(count)
        if num >= 1000000:
            formatted = f"{num / 1000000:.1f}"
            return f"{formatted[:-2]}M" if formatted.endswith('.0') else f"{formatted}M"
        elif num >= 1000:
            formatted = f"{num / 1000:.1f}"
            return f"{formatted[:-2]}K" if formatted.endswith('.0') else f"{formatted}K"
        else:
            return f"{num:,}"
    except ValueError:
        return str(count)

def parse_to_raw_integer(formatted_str):
    if not formatted_str or formatted_str == "-": return 0
    clean_str = str(formatted_str).upper().replace(',', '').strip()
    try:
        if 'M' in clean_str: return int(float(clean_str.replace('M', '')) * 1000000)
        elif 'K' in clean_str: return int(float(clean_str.replace('K', '')) * 1000)
        else: return int(clean_str)
    except Exception:
        return 0

# ==========================================
# 2. GOOGLE SHEETS AUTHENTICATION
# ==========================================
SCOPE = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
CREDS = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", SCOPE)
client = gspread.authorize(CREDS)

SPREADSHEET_NAME = "All Genre-Social Presence + Influencers" 
roster_sheet = client.open(SPREADSHEET_NAME).worksheet("Master_Roster")
log_sheet = client.open(SPREADSHEET_NAME).worksheet("Data_Log")

# ==========================================
# 3. MAIN ORCHESTRATOR
# ==========================================
async def main():
    mode = "INVISIBLE BACKGROUND MODE" if IS_CRON_JOB else "VISIBLE DEBUGGING MODE"
    logger.info(f"Starting the ZTV Instagram Tracker [{mode}]...")
    
    if not os.path.exists("./ig_profile"):
        logger.error("Persistent profile folder 'ig_profile' not found! Run setup_auth.py first.")
        return

    records = roster_sheet.get_all_records()
    rows_to_append = []
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./ig_profile",
            headless=IS_CRON_JOB, 
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        page = context.pages[0]
        logger.info(f"Processing {len(records)} profiles from Master_Roster...\n")
        
        for index, row in enumerate(records):
            influencer_name = row.get('Real Name', 'Unknown')
            full_url = str(row.get("Instagram URL", ""))
            status_flag = str(row.get("Status", "")).strip().lower()

            # Skip inactive talent immediately
            if status_flag == 'inactive':
                logger.info(f" -> Skipping {influencer_name} (Marked Inactive)")
                continue
            
            if not full_url or "instagram" not in full_url.lower():
                rows_to_append.append([current_time, influencer_name, full_url, "", "", "", "", "", "", "Skipped: Invalid Link"])
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
                    avg_likes_str = "-"
                    avg_views_str = "-"
                    avg_comments_str = "-"
                    view_rate_percentage = "-"
                    status = "Blocked/Data not found"
                    
                    # --- 1. GRAB FOLLOWERS ---
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
                    
                    # --- 2. GRAB ENGAGEMENT ---
                    if exact_count is not None:
                        final_followers = format_for_presentation(exact_count)
                        status = "Success (Followers Only)"
                        
                        try:
                            await page.evaluate("window.scrollBy(0, 500)")
                            await page.wait_for_timeout(1500)
                            
                            post_selector = 'a[href*="/p/"], a[href*="/reel/"]'
                            await page.wait_for_selector(post_selector, timeout=10000)
                            posts = await page.locator(post_selector).all()
                            
                            valid_posts = []
                            for post in posts:
                                is_pinned = await post.locator('svg[aria-label*="Pinned"]').count() > 0
                                if not is_pinned:
                                    valid_posts.append(post)
                                if len(valid_posts) == 12:
                                    break
                                    
                            if valid_posts:
                                photo_likes_sum, photo_count = 0, 0
                                reel_views_sum, reel_count = 0, 0
                                total_comments_sum = 0
                                
                                for post in valid_posts:
                                    html_content = await post.inner_html()
                                    is_reel = 'aria-label="Clip"' in html_content or 'aria-label="Reel"' in html_content or 'aria-label="Video"' in html_content
                                    
                                    await post.hover()
                                    await page.wait_for_timeout(850) 
                                    
                                    stats_text = await post.inner_text()
                                    numbers = re.findall(r'([\d.,]+[KM]?)', stats_text.upper())
                                    
                                    if len(numbers) >= 2:
                                        first_stat = parse_to_raw_integer(numbers[0])
                                        comments = parse_to_raw_integer(numbers[1])
                                        
                                        total_comments_sum += comments
                                        
                                        if is_reel:
                                            reel_views_sum += first_stat
                                            reel_count += 1
                                        else:
                                            photo_likes_sum += first_stat
                                            photo_count += 1
                                
                                if (photo_count + reel_count) > 0:
                                    avg_comments = total_comments_sum / (photo_count + reel_count)
                                    avg_comments_str = format_for_presentation(avg_comments)
                                    
                                    if photo_count > 0:
                                        avg_likes_str = format_for_presentation(photo_likes_sum / photo_count)
                                        
                                    if reel_count > 0:
                                        avg_views = reel_views_sum / reel_count
                                        avg_views_str = format_for_presentation(avg_views)
                                        
                                        raw_view_rate = (avg_views / exact_count) * 100
                                        view_rate_percentage = f"{raw_view_rate:.2f}%"
                                        
                                    status = "Success (Followers + Dynamic Metrics)"
                                    
                        except Exception as e:
                            logger.info(f"   [ER skipped for @{handle}: {str(e)}]")
                            
                except Exception:
                    status = "Timeout/Error"
                
                rows_to_append.append([
                    current_time, influencer_name, full_url, 
                    exact_count if exact_count else "", final_followers, 
                    avg_likes_str, avg_views_str, avg_comments_str, view_rate_percentage, status
                ])
                logger.info(f" ✓ @{influencer_name} | Result: {final_followers} | Views: {avg_views_str} | View Rate: {view_rate_percentage} | {status}")
                
                if index < len(records) - 1:
                    sleep_time = random.uniform(3.0, 6.0)
                    await asyncio.sleep(sleep_time)
            else:
                rows_to_append.append([current_time, influencer_name, full_url, "", "", "", "", "", "", "Skipped: Invalid Link"])
                
        await context.close()
        
    logger.info("Appending data to Google Sheets Data Log...")
    max_retries = 3
    for attempt in range(max_retries):
        try:
            log_sheet.append_rows(rows_to_append)
            logger.info("Update complete! New historical data logged successfully.")
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