from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local file
        cwd = os.getcwd()
        file_path = f"file://{cwd}/test/mock_ui.html"
        print(f"Loading {file_path}")
        page.goto(file_path)

        # Open Sidebar
        page.evaluate("window.openSidebar()")

        # 1. Config View
        page.evaluate("window.openConfig()")
        page.wait_for_timeout(500)
        page.screenshot(path="/home/jules/verification/config_view.png")

        # 2. Review View
        page.evaluate("""
            const host = document.getElementById('recorder-sidebar-host');
            const shadow = host.shadowRoot;
            shadow.getElementById('configView').classList.add('hidden');
            shadow.getElementById('reviewView').classList.remove('hidden');

            // Add some mock items
            const list = shadow.getElementById('reviewList');
            for(let i=0; i<3; i++) {
                const item = document.createElement('div');
                item.className = 'review-item';
                item.style.padding = '10px';
                item.style.borderBottom = '1px solid #eee';
                item.innerHTML = '<input type="checkbox" checked> Item ' + (i+1);
                list.appendChild(item);
            }
        """)

        page.wait_for_timeout(500)
        page.screenshot(path="/home/jules/verification/review_view.png")
        print("Screenshot saved to /home/jules/verification/review_view.png")

        browser.close()

if __name__ == "__main__":
    run()
