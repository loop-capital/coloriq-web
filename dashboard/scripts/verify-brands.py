"""
ColorIq Brand & Shade Verifier
Cross-references manufacturer websites against our data files.
"""
import asyncio
import json
import os
import re
import sys

try:
    from crawl4ai import AsyncWebCrawler
except ImportError:
    print("Crawl4AI not installed")
    sys.exit(1)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'brands')

BRAND_URLS = {
    'schwarzkopf': ['https://www.schwarzkopf-professional.com/us/en/color/igora.html'],
    'moroccanoil': ['https://www.moroccanoil.com/us_en/hair-color'],
    'davines': ['https://www.davines.com/us/color'],
    'oligo': ['https://www.oligoprofessional.com/calura', 'https://www.oligoprofessional.com/calura-gloss'],
    'lorealpro': ['https://www.lorealprofessionnelusa.com/haircolor'],
    'wella': ['https://www.wella.com/professional/en-US/color'],
    'redken': ['https://www.redken.com/professional/hair-color'],
    'joico': ['https://www.joico.com/lumishine'],
    'matrix': ['https://www.matrix.com/professional-color'],
    'pravana': ['https://www.pravana.com/color/chromasilk'],
    'kenra': ['https://www.kenraprofessional.com/color'],
    'paulmitchell': ['https://www.paulmitchell.com/professional-color'],
    'pulpriot': ['https://www.pulpriothair.com/color'],
    'chi': ['https://www.farouk.com/chi-color'],
    'alfaparf': ['https://www.alfaparf.com/us/professional/color'],
}

def load_our_shades(brand):
    brand_files = []
    for root, dirs, files in os.walk(DATA_DIR):
        for f in files:
            if brand in f.lower() and 'shades' in f and f.endswith('.json') and 'specs' not in f:
                brand_files.append(os.path.join(root, f))
    total = 0
    for f in brand_files:
        try:
            with open(f) as fh:
                data = json.load(fh)
                if isinstance(data, dict) and 'shades' in data:
                    total += len(data['shades'])
                elif isinstance(data, list):
                    total += len(data)
        except:
            pass
    return total, brand_files

async def main():
    print("=" * 60)
    print("ColorIq Brand & Shade Verification")
    print("=" * 60)

    total_ours = 0
    for brand in BRAND_URLS:
        count, files = load_our_shades(brand)
        total_ours += count
        print(f"  {brand:20s}: {count:4d} shades")
    print(f"  {'TOTAL':20s}: {total_ours:4d} shades")

    print("\n=== CRAWLING MANUFACTURER SITES ===")
    async with AsyncWebCrawler(verbose=False) as crawler:
        for brand, urls in BRAND_URLS.items():
            for url in urls:
                try:
                    result = await crawler.arun(url=url)
                    if result.success:
                        text = result.markdown or ''
                        codes = re.findall(r'\b(\d{1,2}[\.\-/][\w]{0,6})\b', text)
                        names = re.findall(r'(?:Natural|Ash|Gold|Copper|Red|Violet|Mahogany|Chocolate|Brown|Blonde|Black|Beige|Pearl)[\w\s\-]{0,30}', text, re.IGNORECASE)
                        unique_codes = len(set(codes))
                        print(f"  [{brand}] ✓ {url[:60]}")
                        print(f"    Text: {len(text)} chars | Shade patterns: {unique_codes}")
                        if codes:
                            print(f"    Sample codes: {', '.join(list(set(codes))[:15])}")
                    else:
                        print(f"  [{brand}] ❌ {url[:60]}: {result.error_message or 'Failed'}")
                except Exception as e:
                    print(f"  [{brand}] ❌ {url[:60]}: {str(e)[:80]}")

if __name__ == '__main__':
    asyncio.run(main())
