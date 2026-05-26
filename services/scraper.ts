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
  deadline?: string;
}

interface RssAnnouncement {
  title: string;
  link: string;
}

/**
 * Fetches the latest announcement URL and title from MEB's RSS feed.
 */
async function getLatestAnnouncementFromRss(): Promise<RssAnnouncement | null> {
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
    const firstItem = $('item').first();
    const link = firstItem.find('link').text().trim();
    const title = firstItem.find('title').text().trim();
    if (link) {
      console.log('Discovered latest announcement from RSS:', { title, link });
      return { title, link };
    }
  } catch (error: any) {
    console.error('Failed to parse RSS feed:', error.message);
  }
  return null;
}

/**
 * Scrapes AOL's general announcement list page to find the first dynamic announcement URL.
 * Used as a fallback when RSS feed is down.
 */
async function getLatestAnnouncementUrlFromListPage(): Promise<string> {
  const listUrl = 'https://aol.meb.gov.tr/www/onemli-duyuru/kategori/1';
  try {
    const response = await axios.get(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    
    let foundLink = '';
    // Try content/list containers first to avoid header/footer links
    const selectors = ['.content', '.main', '#content', '.list-group', '.kategori-listesi', 'body'];
    for (const selector of selectors) {
      const container = $(selector);
      if (container.length > 0) {
        container.find('a').each((i, el) => {
          const href = $(el).attr('href');
          if (href && href.includes('/icerik/')) {
            foundLink = href.trim();
            return false;
          }
        });
        if (foundLink) break;
      }
    }

    if (foundLink) {
      const absoluteUrl = foundLink.startsWith('http') 
        ? foundLink 
        : `https://aol.meb.gov.tr${foundLink.startsWith('/') ? '' : '/'}${foundLink}`;
      console.log('Discovered latest announcement link from category list page fallback:', absoluteUrl);
      return absoluteUrl;
    }
  } catch (error: any) {
    console.error('Failed to parse AOL category list page fallback:', error.message);
  }
  
  // Hardcoded absolute fallback if both RSS and category page scraping fail
  return 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481';
}

/**
 * Highlights key terms inside the parsed announcement description.
 */
function highlightImportantTerms(text: string): string {
  // Escape HTML tags to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Class for large bold headings and date ranges
  const highlightClass = "font-black text-pink-700 text-[16px] sm:text-[18px] bg-pink-100/60 px-1.5 py-0.5 rounded border border-pink-200/50 shadow-sm underline decoration-pink-300 decoration-2 underline-offset-4";
  
  // Class for regular key terms
  const termClass = "font-extrabold text-pink-650 text-[15px] sm:text-[16px] underline decoration-pink-300 decoration-2 underline-offset-4";

  // 1. Highlight specific header + date ranges:
  // E.g., "Kayıt Yenileme Tarihleri: 15 Mayıs - 08 Haziran 2026"
  // E.g., "e-Sınav randevu işlemleri: 11 Haziran – 22 Haziran 2026"
  // E.g., "Sınav Tarihleri:"
  const headerDateRegex = /(Kayıt\s+Yenileme\s+Tarihleri|e-Sınav\s+randevu\s+işlemleri|Ders\s+Seçimi\s+İşlemleri|Sınav\s+Merkezi\s+İşlemleri|Sınav\s+Tarihleri)\s*:\s*(\d{1,2}\s+[a-zA-ZçıöşüğÇIÖŞÜĞ]+\s*(?:[-–]\s*\d{1,2}\s+[a-zA-ZçıöşüğÇIÖŞÜĞ]+)?\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{4})?/gi;
  html = html.replace(headerDateRegex, (match, prefix, date) => {
    if (date) {
      return `<span class="${highlightClass}">${prefix}: ${date}</span>`;
    }
    return `<span class="${highlightClass}">${prefix}:</span>`;
  });

  // 2. Highlight other specific exam date patterns:
  // E.g. "18-19 Temmuz 2026" (written exam) or "01 Temmuz - 03 Ağustos 2026" (e-Exam) or "15 Mayıs - 08 Haziran 2026"
  const examDatesRegex = /(\b\d{1,2}(?:[-–]\d{1,2})?\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}\b)/gi;
  html = html.replace(examDatesRegex, (match) => {
    return `<span class="${highlightClass}">${match}</span>`;
  });

  // 3. Match individual key terms if they are not already part of an HTML tag or inside span/strong
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
    'Ek Sınav',
    'Sınav Merkezi'
  ];

  // Sort by length desc to match longest first
  terms.sort((a, b) => b.length - a.length);

  for (const term of terms) {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match existing HTML tags, spans, or strong blocks, OR the term itself
    const regex = new RegExp(`(<span[^>]*>.*?<\\/span>|<strong[^>]*>.*?<\\/strong>|<[^>]+>)|(${escapedTerm})`, 'gi');
    html = html.replace(regex, (match, tagPart, termPart) => {
      if (tagPart) {
        return tagPart; // return HTML tags/blocks unchanged
      }
      return `<strong class="${termClass}">${termPart}</strong>`;
    });
  }

  return html;
}

/**
 * Scrapes the MEB AOL Important Announcement page
 * @param url The URL of the page to scrape
 */
export async function scrapeAnnouncement(
  url?: string,
  preferredTitle?: string
): Promise<Announcement> {
  try {
    let targetUrl = url;
    let rssTitle = preferredTitle || '';

    if (!targetUrl) {
      const rssData = await getLatestAnnouncementFromRss();
      if (rssData) {
        targetUrl = rssData.link;
        rssTitle = rssData.title;
      } else {
        targetUrl = await getLatestAnnouncementUrlFromListPage();
      }
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
    let title = '';

    // Prioritize RSS title if available
    if (rssTitle) {
      title = rssTitle;
    }

    // Fallback 1: Cheerio headings (.content h1, .content h2, .content h3, h1, h2, h3)
    if (!title) {
      const headingSelectors = ['.content h1', '.content h2', 'h1', 'h2', '.content h3', 'h3'];
      for (const selector of headingSelectors) {
        const headingText = $(selector).first().text().trim();
        if (headingText && headingText.length > 10 && headingText.length < 200) {
          title = headingText;
          break;
        }
      }
    }

    // Fallback 2: Check inside .content paragraphs containing strong tags
    if (!title) {
      const paragraphs = $('.content p');
      for (let i = 0; i < paragraphs.length; i++) {
        const pText = $(paragraphs[i]).text().trim();
        const hasStrong = $(paragraphs[i]).find('strong').length > 0;
        
        if (hasStrong && pText.length > 20 && pText.length < 200) {
          title = pText;
          break;
        }
      }
    }

    // Fallback 3: First paragraph inside .content
    if (!title) {
      const firstP = $('.content p').first().text().trim();
      if (firstP && firstP.length > 20 && firstP.length < 200) {
        title = firstP;
      }
    }

    // Final Fallback
    if (!title) {
      title = 'Açık Öğretim Lisesi Önemli Duyuru';
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

    // Ensure display dates are clean and static, avoiding dynamic current time fallbacks
    const displayPublishDate = publishDate || 'Belirtilmedi';
    const displayUpdateDate = updateDate || publishDate || 'Belirtilmedi';

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

    // Formül her zaman sabit kalmalı: title-targetUrl-updateDate
    const signature = `${title}-${targetUrl}-${updateDate || ''}`;
    const id = Buffer.from(signature).toString('base64').substring(0, 16);

    const deadlineDate = extractDeadline(title, description);
    const deadline = deadlineDate ? deadlineDate.toISOString() : undefined;

    return {
      id,
      title,
      description: highlightedDescription,
      link: targetUrl,
      publishDate: displayPublishDate,
      updateDate: displayUpdateDate,
      files,
      deadline
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
  
  // 1. Match DD.MM.YYYY or DD/MM/YYYY or DD.MM.YY (any 2-digit or 4-digit year; past years filtered downstream)
  const numericRegex = /\b(\d{1,2})[\./-](\d{1,2})[\./-](20\d{2}|\d{2})(?![a-zA-Z0-9çıöşüğÇIÖŞÜĞ:])/g;
  let match;
  while ((match = numericRegex.exec(combinedText)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const parsedYear = parseInt(match[3], 10);
    const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    const date = new Date(Date.UTC(year, month, day));
    if (!isNaN(date.getTime())) {
      dates.push(date);
    }
  }

  // 2. Match DD MonthName [Year] (Turkish textual dates, e.g. "15 Haziran 2026" or "15 Haziran 26" or "15 Haziran")
  const textRegex = /\b(\d{1,2})\s+([a-zA-ZçıöşüğÇIÖŞÜĞ]+)(?:\s+(20\d{2}|\d{2}))?(?![a-zA-Z0-9çıöşüğÇIÖŞÜĞ:])/gi;
  while ((match = textRegex.exec(combinedText)) !== null) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
    
    if (turkishMonths.hasOwnProperty(monthName)) {
      const month = turkishMonths[monthName];
      let year = new Date().getFullYear(); // Default to current year
      
      if (match[3]) {
        const parsedYear = parseInt(match[3], 10);
        year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
      } else {
        // New Year/Holiday Transition Check:
        // If current month is late in the year (Nov/Dec) and target deadline month is early in the year (Jan-Mar),
        // we assume the deadline is in the upcoming year (currentYear + 1).
        const currentMonthIndex = new Date().getMonth();
        if (currentMonthIndex >= 9 && month <= 2) {
          year = year + 1;
        }
      }
      
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) {
        dates.push(date);
      }
    }
  }

  if (dates.length === 0) return null;

  // Filter out dates that are in the past relative to the system baseline (current year)
  const currentYear = new Date().getFullYear();
  const validDates = dates.filter(d => d.getUTCFullYear() >= currentYear);
  if (validDates.length === 0) return null;

  // Sort ascending, return the latest date
  validDates.sort((a, b) => a.getTime() - b.getTime());
  return validDates[validDates.length - 1];
}

/**
 * Checks if the announcement title or description contains registration/renewal terms.
 */
export function isRegistrationAnnouncement(title: string, description: string): boolean {
  const combined = `${title} ${description}`.toLocaleLowerCase('tr-TR');
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
  const combined = `${title} ${description}`.toLocaleLowerCase('tr-TR');
  
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


