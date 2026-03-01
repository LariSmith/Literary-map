from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')
        page.wait_for_timeout(2000) # wait for map to load

        map_box = page.locator('#map').bounding_box()
        board_box = page.locator('#board').bounding_box()
        canvas_box = page.locator('.maplibregl-canvas').bounding_box()

        print("Board:", board_box)
        print("Map:", map_box)
        print("Canvas:", canvas_box)

        browser.close()

if __name__ == '__main__':
    inspect()
