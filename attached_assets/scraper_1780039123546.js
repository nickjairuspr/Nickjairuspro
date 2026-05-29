const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://mangabuddy1.co.uk/home';
const DATA_FILE = 'manga_data.json';

async function scrapeManga() {
    console.log('🕷️ LAUNCHING BROWSER...', new Date().toISOString());
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
        
        console.log('📡 NAVIGATING TO:', BASE_URL);
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const mangas = await page.evaluate(() => {
            const results = [];
            
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                const href = link.href;
                const text = link.innerText?.trim();
                
                if (href && (href.includes('/manga/') || href.includes('/read/') || href.includes('/series/')) && text && text.length > 0 && text.length < 100) {
                    results.push({
                        title: text.replace(/\n/g, ' ').trim(),
                        url: href,
                        image: link.querySelector('img')?.src || null
                    });
                }
            });
            
            const cards = document.querySelectorAll('[class*="manga"], [class*="story"], [class*="item"]');
            cards.forEach(card => {
                const titleEl = card.querySelector('h3, h4, .title, a');
                const title = titleEl?.innerText?.trim();
                const link = titleEl?.href;
                const img = card.querySelector('img')?.src;
                
                if (title && title.length > 0 && title.length < 100) {
                    results.push({
                        title: title.replace(/\n/g, ' ').trim(),
                        url: link || null,
                        image: img || null
                    });
                }
            });
            
            const unique = [];
            const seen = new Set();
            for (const m of results) {
                if (!seen.has(m.title)) {
                    seen.add(m.title);
                    unique.push(m);
                }
            }
            
            return unique;
        });
        
        const output = {
            timestamp: new Date().toISOString(),
            count: mangas.length,
            mangas: mangas.slice(0, 200)
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
        console.log(`✅ SAVED ${mangas.length} MANGA to ${DATA_FILE}`);
        return mangas;
        
    } catch (error) {
        console.error('❌ SCRAPER ERROR:', error.message);
        return [];
    } finally {
        if (browser) await browser.close();
        console.log('🔒 BROWSER CLOSED');
    }
}

// Run if called directly
if (require.main === module) {
    scrapeManga().then(() => {
        console.log('✅ SCRAPE COMPLETE');
        process.exit(0);
    }).catch(err => {
        console.error('Fatal:', err);
        process.exit(1);
    });
}

module.exports = { scrapeManga };