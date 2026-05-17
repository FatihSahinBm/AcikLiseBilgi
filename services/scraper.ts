import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  link: string;
  publishDate: string;
  updateDate: string;
  files: { title: string; url: string }[];
}

/**
 * Scrapes the MEB AOL Important Announcement page
 * @param url The URL of the page to scrape
 */
export async function scrapeAnnouncement(
  url: string = 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481/tr'
): Promise<Announcement> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // 1. Title Extraction
    // First we check if there's a strong/p inside .content that contains the primary subject
    let title = '';
    
    // Check inside .content paragraphs
    const paragraphs = $('.content p');
    for (let i = 0; i < paragraphs.length; i++) {
      const pText = $(paragraphs[i]).text().trim();
      const hasStrong = $(paragraphs[i]).find('strong').length > 0;
      
      // If paragraph contains a strong tag and is of decent length, it's likely our main title
      if (hasStrong && pText.length > 20 && pText.length < 200) {
        title = pText;
        break;
      }
    }

    // Fallbacks if no matching strong paragraph is found
    if (!title) {
      const firstP = $('.content p').first().text().trim();
      if (firstP && firstP.length > 20 && firstP.length < 200) {
        title = firstP;
      } else {
        const h2Title = $('h2').first().text().trim();
        title = h2Title || 'Açık Öğretim Lisesi Önemli Duyuru';
      }
    }

    // Clean up excessive whitespace
    title = title.replace(/\s+/g, ' ').trim();

    // 2. Date Extraction (Yayın and Güncelleme dates)
    let publishDate = '';
    let updateDate = '';

    $('.info-item').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.includes('Yayın :')) {
        publishDate = text.replace('Yayın :', '').trim();
      } else if (text.includes('Güncelleme :')) {
        updateDate = text.replace('Güncelleme :', '').trim();
      }
    });

    // Fallbacks for dates if they aren't parsed
    const currentDateString = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    publishDate = publishDate || currentDateString;
    updateDate = updateDate || currentDateString;

    // 3. Extract Attached Files / Guides (PDFs, Videos, etc.)
    const files: { title: string; url: string }[] = [];
    $('.content a').each((i, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim();
      
      if (href && (href.includes('dosya') || href.endsWith('.pdf') || href.endsWith('.mp4') || href.endsWith('.doc') || href.endsWith('.docx'))) {
        const absoluteUrl = href.startsWith('http') ? href : `https://aol.meb.gov.tr${href}`;
        
        // Try to find a descriptive text around this link
        let descriptionText = $(el).parent().text().trim();
        // Clean "tıklayınız" or "için tıklayınız"
        descriptionText = descriptionText
          .replace(/tıklayınız\.?/gi, '')
          .replace(/için/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Avoid adding duplicate file links
        if (!files.some(f => f.url === absoluteUrl)) {
          files.push({
            title: descriptionText || linkText || 'Ek Dosya',
            url: absoluteUrl
          });
        }
      }
    });

    // 4. Extract Description
    // We scrape the main text of `.content`, clean it up and take a nice excerpt.
    const rawContentText = $('.content').text().trim().replace(/\s+/g, ' ');
    const description = rawContentText.length > 300 
      ? rawContentText.substring(0, 300) + '...'
      : rawContentText || 'Açık Lise web sayfasında yeni bir duyuru güncellendi. Detaylar için uygulamayı ziyaret edin.';

    // Generate unique ID based on a hash of the title and the update date
    const signature = `${title}-${updateDate}`;
    const id = Buffer.from(signature).toString('base64').substring(0, 16);

    return {
      id,
      title,
      description,
      link: url,
      publishDate,
      updateDate,
      files
    };
  } catch (error: any) {
    console.error('Error while scraping MEB AOL:', error.message);
    throw new Error(`Scraper failed: ${error.message}`);
  }
}
