"use strict";

const fs = require("fs/promises");
const path = require("path");
const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "IMU-EDITZ-News/1.0 (+News Aggregator)"
  }
});

const DATA_DIR = path.join(__dirname, "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");

const DEFAULT_FEEDS = [
  {
    name: "BBC News বাংলা",
    url: "https://feeds.bbci.co.uk/bengali/rss.xml"
  }
];

const NEWS_FEEDS = process.env.NEWS_RSS_URLS
  ? process.env.NEWS_RSS_URLS
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => ({
        name: new URL(url).hostname,
        url
      }))
  : DEFAULT_FEEDS;

const AI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(title, link) {
  const source = `${title}|${link}`;

  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }

  return `news-${Math.abs(hash)}-${Date.now()}`;
}

async function readArticles() {
  try {
    const content = await fs.readFile(
      ARTICLES_FILE,
      "utf8"
    );

    const articles = JSON.parse(content);

    return Array.isArray(articles) ? articles : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await saveArticles([]);
      return [];
    }

    throw error;
  }
}

async function saveArticles(articles) {
  await fs.mkdir(DATA_DIR, {
    recursive: true
  });

  await fs.writeFile(
    ARTICLES_FILE,
    JSON.stringify(articles, null, 2),
    "utf8"
  );
}

async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);

    return result.items.slice(0, 10).map((item) => ({
      source: feed.name,
      title: cleanText(item.title),
      description: cleanText(
        item.contentSnippet ||
          item.content ||
          item.summary ||
          ""
      ),
      link: item.link || "",
      publishedAt:
        item.isoDate ||
        item.pubDate ||
        new Date().toISOString()
    }));
  } catch (error) {
    console.error(
      `RSS error [${feed.name}]:`,
      error.message
    );

    return [];
  }
}

/**
 * Generate a professional Bangla news article
 * using Google's Gemini API.
 */
async function generateBanglaArticle(news) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it as a secure environment variable."
    );
  }

  const prompt = `
তুমি IMU EDITZ News-এর একজন পেশাদার বাংলা নিউজ ডেস্ক এডিটর।

নিচের RSS তথ্য ব্যবহার করে একটি নতুন বাংলা নিউজ draft তৈরি করো।

গুরুত্বপূর্ণ নিয়ম:

1. কোনো তথ্য বানিয়ে লিখবে না।
2. মূল উৎসের তথ্যের বাইরে অনুমান করবে না।
3. মূল উৎসের বাক্য হুবহু কপি করবে না।
4. সংক্ষিপ্ত, পরিষ্কার ও পেশাদার বাংলা ব্যবহার করবে।
5. সংবাদটি neutral tone-এ লিখবে।
6. এটি এখনো DRAFT, তাই নিজে থেকে প্রকাশিত খবর হিসেবে দাবি করবে না।
7. মূল উৎসের link সংরক্ষণ করতে হবে।
8. তথ্য পর্যাপ্ত না হলে অতিরিক্ত তথ্য বানাবে না।
9. শিরোনাম আকর্ষণীয় কিন্তু clickbait হবে না।
10. সম্ভব হলে category নির্বাচন করবে: জাতীয়, আন্তর্জাতিক, রাজনীতি, প্রযুক্তি, খেলাধুলা, বিনোদন, অর্থনীতি, বিজ্ঞান, অন্যান্য।
11. tags সর্বোচ্চ ৮টি হবে।
12. শুধু JSON object ফেরত দেবে।
13. JSON-এর বাইরে কোনো Markdown, explanation বা code fence দেবে না।

RSS SOURCE:

Source:
${news.source}

Title:
${news.title}

Description:
${news.description}

Published:
${news.publishedAt}

Original URL:
${news.link}

নিচের JSON format অনুসরণ করো:

{
  "title": "বাংলা শিরোনাম",
  "summary": "২-৩ বাক্যের সংক্ষিপ্ত সারাংশ",
  "content": "৩-৬টি ছোট অনুচ্ছেদে বিস্তারিত বাংলা সংবাদ",
  "category": "জাতীয়",
  "tags": ["বাংলাদেশ", "সংবাদ"],
  "editorNote": "প্রকাশের আগে সম্পাদকীয় যাচাই প্রয়োজন।"
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      AI_MODEL
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 2500
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const apiMessage =
      data?.error?.message ||
      `Gemini API request failed with HTTP ${response.status}`;

    throw new Error(apiMessage);
  }

  const output =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  if (!output) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  let generated;

  try {
    generated = JSON.parse(output);
  } catch {
    const jsonMatch = output.match(
      /\{[\s\S]*\}/
    );

    if (!jsonMatch) {
      throw new Error(
        "Gemini returned invalid JSON."
      );
    }

    generated = JSON.parse(jsonMatch[0]);
  }

  return {
    title: cleanText(generated.title),

    summary: cleanText(
      generated.summary
    ),

    content: String(
      generated.content || ""
    ).trim(),

    category: cleanText(
      generated.category ||
        "অন্যান্য"
    ),

    tags: Array.isArray(generated.tags)
      ? generated.tags
          .map(cleanText)
          .filter(Boolean)
          .slice(0, 8)
      : [],

    editorNote: cleanText(
      generated.editorNote ||
        "প্রকাশের আগে সম্পাদকীয় যাচাই প্রয়োজন।"
    )
  };
}

async function collectNews(options = {}) {
  const limit = Number(
    options.limit || 5
  );

  const existingArticles =
    await readArticles();

  const existingLinks = new Set(
    existingArticles
      .map(
        (article) =>
          article.sourceUrl
      )
      .filter(Boolean)
  );

  const allNews = [];

  for (const feed of NEWS_FEEDS) {
    const items = await fetchFeed(feed);

    for (const item of items) {
      if (!item.link) {
        continue;
      }

      if (existingLinks.has(item.link)) {
        continue;
      }

      allNews.push(item);
    }
  }

  const selectedNews =
    allNews.slice(0, limit);

  const createdDrafts = [];

  for (const news of selectedNews) {
    try {
      console.log(
        `Generating draft: ${news.title}`
      );

      const generated =
        await generateBanglaArticle(
          news
        );

      const article = {
        id: makeId(
          news.title,
          news.link
        ),

        title: generated.title,

        summary:
          generated.summary,

        content:
          generated.content,

        category:
          generated.category,

        tags:
          generated.tags,

        image: "",

        source:
          news.source,

        sourceUrl:
          news.link,

        originalTitle:
          news.title,

        originalPublishedAt:
          news.publishedAt,

        status: "draft",

        aiGenerated: true,

        verified: false,

        editorNote:
          generated.editorNote,

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()
      };

      createdDrafts.push(article);

      existingLinks.add(
        news.link
      );
    } catch (error) {
      console.error(
        `AI generation failed for "${news.title}":`,
        error.message
      );
    }
  }

  if (createdDrafts.length > 0) {
    const updatedArticles = [
      ...createdDrafts,
      ...existingArticles
    ].slice(0, 500);

    await saveArticles(
      updatedArticles
    );
  }

  return {
    success: true,

    found:
      allNews.length,

    created:
      createdDrafts.length,

    articles:
      createdDrafts
  };
}

async function getNews(options = {}) {
  const articles =
    await readArticles();

  const status =
    options.status || "all";

  const limit = Number(
    options.limit || 50
  );

  const filtered =
    status === "all"
      ? articles
      : articles.filter(
          (article) =>
            article.status ===
            status
        );

  return filtered.slice(
    0,
    limit
  );
}

async function publishNews(articleId) {
  const articles =
    await readArticles();

  const index =
    articles.findIndex(
      (article) =>
        article.id ===
        articleId
    );

  if (index === -1) {
    throw new Error(
      "Article not found."
    );
  }

  articles[index] = {
    ...articles[index],

    status: "published",

    verified: true,

    updatedAt:
      new Date().toISOString()
  };

  await saveArticles(
    articles
  );

  return articles[index];
}

async function deleteNews(articleId) {
  const articles =
    await readArticles();

  const filtered =
    articles.filter(
      (article) =>
        article.id !==
        articleId
    );

  if (
    filtered.length ===
    articles.length
  ) {
    throw new Error(
      "Article not found."
    );
  }

  await saveArticles(
    filtered
  );

  return {
    success: true,
    deleted: articleId
  };
}

async function main() {
  console.log(
    "======================================"
  );

  console.log(
    " IMU EDITZ News - Gemini News Collector"
  );

  console.log(
    "======================================"
  );

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "GEMINI_API_KEY is missing. Collector was not started."
    );

    process.exitCode = 1;

    return;
  }

  const result =
    await collectNews({
      limit: Number(
        process.env.NEWS_LIMIT || 5
      )
    });

  console.log(
    `Finished. Found: ${result.found}, Created drafts: ${result.created}`
  );
}

module.exports = {
  collectNews,
  getNews,
  publishNews,
  deleteNews
};

if (require.main === module) {
  main().catch((error) => {
    console.error(
      "Collector error:",
      error
    );

    process.exitCode = 1;
  });
}
