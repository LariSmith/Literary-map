import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Set a larger viewport to see the whole map
        await page.set_viewport_size({"width": 1200, "height": 800})
        # Navigate to the local server
        await page.goto('http://localhost:8000')
        # Wait a bit for Leaflet tiles and scripts to load fully
        await page.wait_for_timeout(3000)
        # Take a screenshot
        await page.screenshot(path='/home/jules/verification/map_visuals_v3.png')
        print("Screenshot saved to /home/jules/verification/map_visuals_v3.png")
        await browser.close()

asyncio.run(run())
