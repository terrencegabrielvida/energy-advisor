import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  source: string;
  type?: 'tracking' | 'news' | 'article';
}

export async function searchEnergySites(query: string): Promise<SearchResult[]> {
  console.log('Starting search for:', query);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/Users/terrencegabrielvida/.cache/puppeteer/chrome/mac-137.0.7151.55/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Search with the user's query
    const searchQuery = `${query} Philippines energy`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    await page.goto(`https://www.google.com/search?q=${encodedQuery}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Extract search results
    const searchResults = await page.evaluate(() => {
      const results: SearchResult[] = [];
      const selectors = [
        'div.g', 'div[data-hveid]', 'div.yuRUbf', 'div[jscontroller]',
        'div.rc', 'div[data-sokoban-container]', 'div[data-content-feature="1"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const linkElement = element.querySelector('a');
          const titleElement = element.querySelector('h3, .LC20lb, .DKV0Md');
          const snippetElement = element.querySelector('div.VwiC3b, div.s, span.st, div.IsZvec');

          if (linkElement && titleElement) {
            const url = linkElement.href;
            const title = titleElement.textContent || '';
            const snippet = snippetElement?.textContent || '';
            
            // Only exclude Google and YouTube results
            if (!url.includes('google.com') && !url.includes('youtube.com')) {
              results.push({
                title,
                url,
                snippet,
                source: new URL(url).hostname,
                type: 'article'
              });
            }
          }
        });
      }
      return results;
    });

    // Fetch content for all results
    const resultsWithContent = await Promise.all(
      searchResults.map(async (result) => {
        try {
          const response = await axios.get(result.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 5000
          });
          
          const $ = cheerio.load(response.data);
          
          // Remove unwanted elements
          $('script, style, nav, footer, header, iframe, .ad, .advertisement, .banner, .popup').remove();
          
          // Try to get the main content
          const content = $('article, .article, .content, .post, .entry, main, .main, .story-content, .news-content')
            .text()
            .trim()
            .replace(/\s+/g, ' ')
            .substring(0, 2000); // Limit content length
          
          return {
            ...result,
            content: content || result.snippet
          };
        } catch (error) {
          return result;
        }
      })
    );

    const filteredResults = resultsWithContent.filter(result => result.content && result.content.length > 0);
    console.log(`Found ${filteredResults.length} relevant results`);
    return filteredResults;

  } catch (error) {
    console.error('Error during search:', error);
    return [];
  } finally {
    await browser.close();
  }
} 