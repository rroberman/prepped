import * as cheerio from "cheerio";

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(html: string, selectors?: string[]): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, aside, iframe, noscript").remove();

  if (selectors) {
    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        return cleanText(el.text());
      }
    }
  }

  return cleanText($("body").text());
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim()
    .slice(0, 8000);
}

function extractBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "";
  }
}

export async function scrapeJobUrl(url: string): Promise<string> {
  const html = await fetchPage(url);
  return extractText(html, [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[class*="posting"]',
    '[class*="vacancy"]',
    "article",
    "main",
    '[role="main"]',
  ]);
}

/** Scrape the company homepage + about page + engineering blog for real context */
export async function scrapeCompanyContext(jobUrl: string): Promise<{
  homepage: string;
  about: string;
  engineering: string;
}> {
  const baseUrl = extractBaseUrl(jobUrl);
  if (!baseUrl) return { homepage: "", about: "", engineering: "" };

  const results = await Promise.allSettled([
    fetchPage(baseUrl).then((html) => extractText(html)),
    fetchPage(`${baseUrl}/about`).then((html) => extractText(html)).catch(() =>
      fetchPage(`${baseUrl}/about-us`).then((html) => extractText(html))
    ),
    fetchPage(`${baseUrl}/blog`).then((html) => extractText(html, ["article", "main", '[class*="blog"]'])).catch(() =>
      fetchPage(`${baseUrl}/engineering`).then((html) => extractText(html))
    ),
  ]);

  return {
    homepage: results[0].status === "fulfilled" ? results[0].value : "",
    about: results[1].status === "fulfilled" ? results[1].value : "",
    engineering: results[2].status === "fulfilled" ? results[2].value : "",
  };
}
