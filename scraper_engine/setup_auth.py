from playwright.sync_api import sync_playwright

def main():
    print("Opening persistent browser for Instagram Login...")
    
    with sync_playwright() as p:
        # This creates a permanent, dedicated browser profile folder on your Mac
        context = p.chromium.launch_persistent_context(
            user_data_dir="./ig_profile", 
            headless=False
        )
        
        # Persistent contexts automatically open a blank page
        page = context.pages[0]
        page.goto("https://www.instagram.com/")
        
        print("\n" + "="*40)
        print("*** ACTION REQUIRED ***")
        print("1. Log in using your 'Burner' Instagram account.")
        print("2. Click 'Save Info' if Instagram asks you to remember your login.")
        print("3. Wait until your feed is fully loaded.")
        print("4. Come back to this terminal and press ENTER.")
        print("="*40)
        
        input("\nPress ENTER here once you are fully logged in...")
        
        print("\nSuccess! Your login session is permanently saved in the 'ig_profile' folder.")
        context.close()

if __name__ == "__main__":
    main()