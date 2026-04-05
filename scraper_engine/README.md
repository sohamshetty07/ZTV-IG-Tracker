# ZTV Instagram Follower Tracker

An automated, stealthy Python scraper built for the Sales Planning and Strategy team. It bypasses Meta's login walls using a persistent authenticated session to extract precise follower decimals (e.g., 1.5M, 81.3K) and calculates fortnightly growth metrics directly into Google Sheets.

## Prerequisites
* Python 3.x
* A Google Cloud Service Account (`credentials.json`)
* A target Google Sheet
* A "burner" Instagram account

## Initial Setup
1. Clone this repository to your local machine.
2. Create and activate a virtual environment: `python -m venv venv` and `source venv/bin/activate`
3. Install the required dependencies: `pip install -r requirements.txt`
4. Install Playwright browsers: `playwright install chromium`
5. Place your `credentials.json` file securely in the root directory.

## Authentication
Before running the main tracker, you must create a verified digital footprint:
Run `python setup_auth.py` and log in via the browser window that appears. This creates a local `ig_profile` folder (ignored by Git) which allows the main scraper to bypass login walls.

## Usage
**Visible Debugging Mode:** `python scraper.py` (Runs with the browser visible)

**Invisible Background Mode (For Cron Jobs):**
`python scraper.py --cron` (Runs entirely headlessly)