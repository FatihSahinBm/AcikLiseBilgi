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
 * Fetches the latest announcement URL from MEB's RSS feed.
 */
async function getLatestAnnouncementUrl(): Promise<string> {
  const rssUrl = 'https://aol.meb.gov.tr/meb_iys_dosyalar/xml/rss_duyurular.xml';
  try {
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data, { xmlMode: true });
    // Find the link of the first item
    const firstLink = $('item').first().find('link').text().trim();
    if (firstLink) {
      console.log('Discovered latest announcement link from RSS:', firstLink);
      return firstLink;
    }
  } catch (error: any) {
    console.error('Failed to parse RSS feed, using fallback URL:', error.message);
  }
  return 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481';
}

/**
 * Highlights key terms inside the parsed announcement description.
 */
function highlightImportantTerms(text: string): string {
  // Escape HTML tags to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const terms = [
    'Kayıt Yenileme Tarihleri',
    'Kayıt Yenileme Tarihi',
    'Kayıt Yenileme',
    'Kayıt Tarihleri',
    'İlk Kayıt',
    'Yeni Kayıt',
    'Ders Seçimi',
    'Sınav Tarihleri',
    'Sınav Tarihi',
    'Sınav Giriş Belgesi',
    'Sınav Sonuçları',
    'Mazeret Sınavı',
    'Ek Sınav'
  ];

  // Sort terms by length descending to match longer phrases first
  terms.sort((a, b) => b.length - a.length);

  for (const term of terms) {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    escaped = escaped.replace(
      regex,
      '<strong class="font-extrabold text-pink-650 text-[15px] sm:text-[16px] underline decoration-pink-300 decoration-2 underline-offset-4">$1</strong>'
    );
  }

  return escaped;
}

/**
 * Scrapes the MEB AOL Important Announcement page
 * @param url The URL of the page to scrape
 */
export async function scrapeAnnouncement(
  url?: string
): Promise<Announcement> {
  try {
    let targetUrl = url;
    if (!targetUrl) {
      targetUrl = await getLatestAnnouncementUrl();
    }

    // Ensure we are targeting the Turkish version if it's a content page
    if (targetUrl && !targetUrl.endsWith('/tr') && targetUrl.includes('/icerik/')) {
      if (/\/\d+$/.test(targetUrl)) {
        targetUrl = `${targetUrl}/tr`;
      }
    }

    console.log(`Scraping target URL: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
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
    // Clean up consecutive empty lines but keep newlines for paragraph spacing
    let rawContentText = $('.content').text().trim();
    rawContentText = rawContentText.replace(/\n\s*\n+/g, '\n\n').replace(/[ \t]+/g, ' ');

    let description = rawContentText;
    if (description.length > 800) {
      description = description.substring(0, 800) + '...';
    }
    
    if (!description) {
      description = 'Açık Lise web sayfasında yeni bir duyuru güncellendi. Detaylar için uygulamayı ziyaret edin.';
    }

    // Highlight key terms and escape html
    const highlightedDescription = highlightImportantTerms(description);

    // Generate unique ID based on a hash of the title and the update date
    const signature = `${title}-${updateDate}`;
    const id = Buffer.from(signature).toString('base64').substring(0, 16);

    return {
      id,
      title,
      description: highlightedDescription,
      link: targetUrl,
      publishDate,
      updateDate,
      files
    };
  } catch (error: any) {
    console.error('Error while scraping MEB AOL:', error.message);
    throw new Error(`Scraper failed: ${error.message}`);
  }
}

/**
 * Extracts a registration/renewal deadline date from the title or description of an announcement.
 * Maps Turkish month names to numbers and returns the latest date found in the future (relative to 2026).
 */
export function extractDeadline(title: string, description: string): Date | null {
  const combinedText = `${title} ${description}`;
  
  // Turkish months mapping (standard and normalized Turkish characters)
  const turkishMonths: { [key: string]: number } = {
    ocak: 0, subat: 1, şubat: 1, mart: 2, nisan: 3, mayis: 4, mayıs: 4,
    haziran: 5, temmuz: 6, agustos: 7, ağustos: 7, eylul: 8, eylül: 8,
    ekim: 9, kasim: 10, kasım: 10, aralik: 11, aralık: 11
  };

  const dates: Date[] = [];
  
  // 1. Match DD.MM.YYYY or DD/MM/YYYY
  const numericRegex = /\b(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})\b/g;
  let match;
  while ((match = numericRegex.exec(combinedText)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      dates.push(date);
    }
  }

  // 2. Match DD MonthName YYYY (Turkish textual dates, e.g. "15 Haziran 2026")
  const textRegex = /\b(\d{1,2})\s+([a-zA-ZçıöşüğÇIÖŞÜĞ]+)\s+(\d{4})\b/g;
  while ((match = textRegex.exec(combinedText)) !== null) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
    
    if (turkishMonths.hasOwnProperty(monthName)) {
      const month = turkishMonths[monthName];
      const year = parseInt(match[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        dates.push(date);
      }
    }
  }

  if (dates.length === 0) return null;

  // Filter out dates that are in the past relative to the system baseline (2026)
  const validDates = dates.filter(d => d.getFullYear() >= 2026);
  if (validDates.length === 0) return null;

  // Sort ascending, return the latest date
  validDates.sort((a, b) => a.getTime() - b.getTime());
  return validDates[validDates.length - 1];
}

/**
 * Checks if the announcement title or description contains registration/renewal terms.
 */
export function isRegistrationAnnouncement(title: string, description: string): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  return (
    combined.includes('kayıt yenileme') || 
    combined.includes('yeni kayıt') || 
    combined.includes('ilk kayıt') || 
    combined.includes('kayit yenileme') ||
    combined.includes('kayit yenıleme') ||
    combined.includes('kayıt yenıleme') ||
    combined.includes('kayit islemleri') ||
    combined.includes('kayıt işlemleri')
  );
}

export type AnnouncementType = 'registration' | 'course_selection' | 'exam_appointment' | 'none';

/**
 * Classifies the announcement title and description into specific tracking categories.
 */
export function detectAnnouncementType(title: string, description: string): AnnouncementType {
  const combined = `${title} ${description}`.toLowerCase();
  
  if (combined.includes('e-sınav randevu') || 
      combined.includes('e-sinav randevu') || 
      combined.includes('sınav randevusu') || 
      combined.includes('sinav randevusu')) {
    return 'exam_appointment';
  }
  
  if (combined.includes('ders seçimi') || 
      combined.includes('ders secimi') || 
      combined.includes('ders seçme') || 
      combined.includes('ders secme')) {
    return 'course_selection';
  }
  
  if (combined.includes('kayıt yenileme') || 
      combined.includes('yeni kayıt') || 
      combined.includes('ilk kayıt') || 
      combined.includes('kayit yenileme') ||
      combined.includes('kayıt yenıleme') ||
      combined.includes('kayit yenıleme') ||
      combined.includes('kayit islemleri') ||
      combined.includes('kayıt işlemleri')) {
    return 'registration';
  }
  
  return 'none';
}


