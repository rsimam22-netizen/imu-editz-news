"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

const ARTICLES_FILE = path.join(
  DATA_DIR,
  "articles.json"
);

const SETTINGS_FILE = path.join(
  DATA_DIR,
  "settings.json"
);

/* =========================================================
   APP CONFIG
========================================================= */

const SITE_NAME =
  process.env.SITE_NAME ||
  "IMU EDITZ News";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  "";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.randomBytes(32).toString("hex");

const SESSION_COOKIE =
  "imu_admin_session";

const SESSION_MAX_AGE =
  1000 * 60 * 60 * 24 * 7;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/* =========================================================
   DATA DIRECTORY
========================================================= */

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }
}

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SETTINGS = {
  headerAd: {
    enabled: false,
    type: "code",
    content: ""
  },

  footerAd: {
    enabled: false,
    type: "code",
    content: ""
  },

  sidebarAd: {
    enabled: false,
    type: "code",
    content: ""
  },

  popupAd: {
    enabled: false,
    type: "code",
    content: "",
    delay: 5000
  },

  videoNews: {
    enabled: false,
    title: "ভিডিও নিউজ",
    videoUrl: "",
    embedCode: ""
  },

  social: {
    facebook: "",
    youtube: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    telegram: "",
    whatsapp: ""
  },

  facebookLive: {
    enabled: false,
    pageUrl: "",
    embedCode: ""
  },

  youtubeLive: {
    enabled: false,
    channelUrl: "",
    embedCode: ""
  },

  site: {
    name: SITE_NAME,
    tagline: "সত্যের সঙ্গে, মানুষের পাশে",
    logo: "",
    favicon: "",
    description: "",
    cardWebsite: ""
  },

  photoCard: {
    enabled: true,
    theme: "blue",
    channelName: SITE_NAME,
    website: "",
    showDate: true,
    showLogo: true
  }
};

/* =========================================================
   SETTINGS STORAGE
========================================================= */

function ensureSettingsFile() {
  ensureDataDirectory();

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(
        DEFAULT_SETTINGS,
        null,
        2
      ),
      "utf8"
    );
  }
}

function mergeObjects(defaults, saved) {
  const result = {
    ...defaults
  };

  Object.keys(defaults).forEach(
    key => {
      const defaultValue =
        defaults[key];

      const savedValue =
        saved &&
        Object.prototype.hasOwnProperty.call(
          saved,
          key
        )
          ? saved[key]
          : undefined;

      if (
        defaultValue &&
        typeof defaultValue === "object" &&
        !Array.isArray(defaultValue)
      ) {
        result[key] =
          mergeObjects(
            defaultValue,
            savedValue &&
            typeof savedValue === "object" &&
            !Array.isArray(savedValue)
              ? savedValue
              : {}
          );
      } else if (
        savedValue !== undefined
      ) {
        result[key] =
          savedValue;
      }
    }
  );

  return result;
}

function readSettings() {
  ensureSettingsFile();

  try {
    const raw =
      fs.readFileSync(
        SETTINGS_FILE,
        "utf8"
      );

    const saved =
      JSON.parse(raw);

    if (
      !saved ||
      typeof saved !== "object" ||
      Array.isArray(saved)
    ) {
      return mergeObjects(
        DEFAULT_SETTINGS,
        {}
      );
    }

    return mergeObjects(
      DEFAULT_SETTINGS,
      saved
    );
  } catch (error) {
    console.error(
      "Settings read error:",
      error
    );

    return mergeObjects(
      DEFAULT_SETTINGS,
      {}
    );
  }
}

function writeSettings(settings) {
  ensureSettingsFile();

  const temporaryFile =
    SETTINGS_FILE + ".tmp";

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(
      settings,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    temporaryFile,
    SETTINGS_FILE
  );
}

/* =========================================================
   ARTICLES STORAGE
========================================================= */

function ensureArticlesFile() {
  ensureDataDirectory();

  if (!fs.existsSync(ARTICLES_FILE)) {
    fs.writeFileSync(
      ARTICLES_FILE,
      JSON.stringify(
        [],
        null,
        2
      ),
      "utf8"
    );
  }
}

function readArticles() {
  ensureArticlesFile();

  try {
    const raw =
      fs.readFileSync(
        ARTICLES_FILE,
        "utf8"
      );

    const articles =
      JSON.parse(raw);

    return Array.isArray(articles)
      ? articles
      : [];
  } catch (error) {
    console.error(
      "Articles read error:",
      error
    );

    return [];
  }
}

function writeArticles(articles) {
  ensureArticlesFile();

  const temporaryFile =
    ARTICLES_FILE + ".tmp";

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(
      articles,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    temporaryFile,
    ARTICLES_FILE
  );
}

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function safeNumber(value, fallback = 0) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getNextArticleId(articles) {
  if (!articles.length) {
    return 1;
  }

  return (
    Math.max(
      ...articles.map(
        article =>
          safeNumber(
            article.id
          )
      )
    ) + 1
  );
}

function createSlug(title, id) {
  const normalized =
    cleanText(title)
      .toLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    normalized ||
    `news-${id}`
  );
}

function normalizeStatus(status) {
  return status === "draft"
    ? "draft"
    : "published";
}

function normalizeArticle(article) {
  return {
    id:
      safeNumber(
        article.id
      ),

    title:
      cleanText(
        article.title
      ),

    slug:
      cleanText(
        article.slug
      ) ||
      createSlug(
        article.title,
        article.id
      ),

    category:
      cleanText(
        article.category
      ) ||
      "সর্বশেষ",

    source_name:
      cleanText(
        article.source_name
      ) ||
      SITE_NAME,

    reporter:
      cleanText(
        article.reporter
      ),

    image:
      cleanText(
        article.image
      ),

    summary:
      cleanText(
        article.summary
      ),

    content:
      cleanText(
        article.content
      ),

    status:
      normalizeStatus(
        article.status
      ),

    featured:
      Boolean(
        article.featured
      ),

    views:
      safeNumber(
        article.views
      ),

    created_at:
      article.created_at ||
      new Date().toISOString(),

    updated_at:
      article.updated_at ||
      new Date().toISOString()
  };
}

function parseCookies(req) {
  const header =
    req.headers.cookie || "";

  const cookies = {};

  header
    .split(";")
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean)
    .forEach(
      item => {
        const index =
          item.indexOf("=");

        if (index === -1) {
          return;
        }

        const key =
          item
            .slice(0, index)
            .trim();

        const value =
          item
            .slice(index + 1)
            .trim();

        cookies[key] =
          decodeURIComponent(
            value
          );
      }
    );

  return cookies;
}

function createSessionToken() {
  const payload = {
    iat: Date.now(),
    exp:
      Date.now() +
      SESSION_MAX_AGE
  };

  const body =
    Buffer.from(
      JSON.stringify(
        payload
      )
    ).toString("base64url");

  const signature =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET
      )
      .update(body)
      .digest("base64url");

  return `${body}.${signature}`;
}

function verifySessionToken(token) {
  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [
    body,
    signature
  ] = parts;

  const expected =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET
      )
      .update(body)
      .digest("base64url");

  if (
    signature.length !==
    expected.length
  ) {
    return false;
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return false;
  }

  try {
    const payload =
      JSON.parse(
        Buffer.from(
          body,
          "base64url"
        ).toString("utf8")
      );

    return (
      payload.exp >
      Date.now()
    );
  } catch {
    return false;
  }
}

/* =========================================================
   ADMIN AUTH
========================================================= */

function requireAdmin(req, res, next) {
  /*
    If ADMIN_PASSWORD is not configured,
    keep compatibility with the current
    development setup.
  */

  if (!ADMIN_PASSWORD) {
    return next();
  }

  const cookies =
    parseCookies(req);

  const token =
    cookies[
      SESSION_COOKIE
    ];

  if (
    verifySessionToken(
      token
    )
  ) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message:
      "Admin authentication প্রয়োজন।"
  });
}

app.post(
  "/api/admin/login",
  (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.json({
        success: true,
        authenticated: true,
        message:
          "Admin password configured নয়।"
      });
    }

    const password =
      cleanText(
        req.body &&
        req.body.password
      );

    if (
      !password ||
      password !==
        ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Admin password ভুল।"
      });
    }

    const token =
      createSessionToken();

    res.setHeader(
      "Set-Cookie",
      [
        `${SESSION_COOKIE}=${encodeURIComponent(
          token
        )}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=604800",
        "Secure"
      ].join("; ")
    );

    return res.json({
      success: true,
      authenticated: true,
      message:
        "Admin login সফল হয়েছে।"
    });
  }
);

app.post(
  "/api/admin/logout",
  (req, res) => {
    res.setHeader(
      "Set-Cookie",
      [
        `${SESSION_COOKIE}=`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0",
        "Secure"
      ].join("; ")
    );

    res.json({
      success: true,
      message:
        "Logout সফল হয়েছে।"
    });
  }
);

app.get(
  "/api/admin/session",
  (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.json({
        success: true,
        authenticated: true
      });
    }

    const cookies =
      parseCookies(req);

    const authenticated =
      verifySessionToken(
        cookies[
          SESSION_COOKIE
        ]
      );

    res.json({
      success: true,
      authenticated
    });
  }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      site: SITE_NAME,
      status: "online",
      time:
        new Date().toISOString()
    });
  }
);

/* =========================================================
   SETTINGS GET
========================================================= */

app.get(
  "/api/settings",
  (req, res) => {
    try {
      const settings =
        readSettings();

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error(
        "Settings GET error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Settings লোড করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   SETTINGS UPDATE
========================================================= */

app.put(
  "/api/settings",
  requireAdmin,
  (req, res) => {
    try {
      const current =
        readSettings();

      const incoming =
        req.body &&
        typeof req.body === "object" &&
        !Array.isArray(req.body)
          ? req.body
          : {};

      const settings =
        mergeObjects(
          current,
          incoming
        );

      settings.headerAd = {
        enabled:
          Boolean(
            settings.headerAd.enabled
          ),

        type:
          settings.headerAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            settings.headerAd.content
          )
      };

      settings.footerAd = {
        enabled:
          Boolean(
            settings.footerAd.enabled
          ),

        type:
          settings.footerAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            settings.footerAd.content
          )
      };

      settings.sidebarAd = {
        enabled:
          Boolean(
            settings.sidebarAd.enabled
          ),

        type:
          settings.sidebarAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            settings.sidebarAd.content
          )
      };

      settings.popupAd = {
        enabled:
          Boolean(
            settings.popupAd.enabled
          ),

        type:
          settings.popupAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            settings.popupAd.content
          ),

        delay:
          Math.max(
            0,
            safeNumber(
              settings.popupAd.delay,
              5000
            )
          )
      };

      settings.videoNews = {
        enabled:
          Boolean(
            settings.videoNews.enabled
          ),

        title:
          cleanText(
            settings.videoNews.title
          ) ||
          "ভিডিও নিউজ",

        videoUrl:
          cleanText(
            settings.videoNews.videoUrl
          ),

        embedCode:
          cleanText(
            settings.videoNews.embedCode
          )
      };

      settings.social = {
        facebook:
          cleanText(
            settings.social.facebook
          ),

        youtube:
          cleanText(
            settings.social.youtube
          ),

        instagram:
          cleanText(
            settings.social.instagram
          ),

        twitter:
          cleanText(
            settings.social.twitter
          ),

        tiktok:
          cleanText(
            settings.social.tiktok
          ),

        telegram:
          cleanText(
            settings.social.telegram
          ),

        whatsapp:
          cleanText(
            settings.social.whatsapp
          )
      };

      settings.facebookLive = {
        enabled:
          Boolean(
            settings.facebookLive.enabled
          ),

        pageUrl:
          cleanText(
            settings.facebookLive.pageUrl
          ),

        embedCode:
          cleanText(
            settings.facebookLive.embedCode
          )
      };

      settings.youtubeLive = {
        enabled:
          Boolean(
            settings.youtubeLive.enabled
          ),

        channelUrl:
          cleanText(
            settings.youtubeLive.channelUrl
          ),

        embedCode:
          cleanText(
            settings.youtubeLive.embedCode
          )
      };

      settings.site = {
        name:
          cleanText(
            settings.site.name
          ) ||
          SITE_NAME,

        tagline:
          cleanText(
            settings.site.tagline
          ) ||
          "সত্যের সঙ্গে, মানুষের পাশে",

        logo:
          cleanText(
            settings.site.logo
          ),

        favicon:
          cleanText(
            settings.site.favicon
          ),

        description:
          cleanText(
            settings.site.description
          ),

        cardWebsite:
          cleanText(
            settings.site.cardWebsite
          )
      };

      settings.photoCard = {
        enabled:
          Boolean(
            settings.photoCard.enabled
          ),

        theme:
          cleanText(
            settings.photoCard.theme
          ) ||
          "blue",

        channelName:
          cleanText(
            settings.photoCard.channelName
          ) ||
          settings.site.name ||
          SITE_NAME,

        website:
          cleanText(
            settings.photoCard.website
          ) ||
          settings.site.cardWebsite ||
          "",

        showDate:
          settings.photoCard.showDate !==
          false,

        showLogo:
          settings.photoCard.showLogo !==
          false
      };

      writeSettings(
        settings
      );

      res.json({
        success: true,
        message:
          "Settings সফলভাবে সংরক্ষণ হয়েছে।",
        settings
      });
    } catch (error) {
      console.error(
        "Settings PUT error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Settings সংরক্ষণ করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: PUBLIC LIST
========================================================= */

app.get(
  "/api/articles",
  (req, res) => {
    try {
      const {
        status,
        category,
        search,
        featured,
        limit,
        page
      } = req.query;

      let articles =
        readArticles()
          .map(
            normalizeArticle
          );

      if (
        status === "published" ||
        status === "draft"
      ) {
        articles =
          articles.filter(
            article =>
              article.status ===
              status
          );
      } else {
        /*
          Public requests should only see
          published articles unless an
          authenticated admin explicitly
          asks for drafts.
        */

        const cookies =
          parseCookies(req);

        const admin =
          !ADMIN_PASSWORD ||
          verifySessionToken(
            cookies[
              SESSION_COOKIE
            ]
          );

        if (!admin) {
          articles =
            articles.filter(
              article =>
                article.status ===
                "published"
            );
        }
      }

      if (category) {
        const wanted =
          cleanText(
            category
          ).toLowerCase();

        articles =
          articles.filter(
            article =>
              article.category
                .toLowerCase() ===
              wanted
          );
      }

      if (
        featured === "true"
      ) {
        articles =
          articles.filter(
            article =>
              article.featured
          );
      }

      if (search) {
        const query =
          cleanText(
            search
          ).toLowerCase();

        articles =
          articles.filter(
            article =>
              article.title
                .toLowerCase()
                .includes(query) ||
              article.summary
                .toLowerCase()
                .includes(query) ||
              article.content
                .toLowerCase()
                .includes(query) ||
              article.category
                .toLowerCase()
                .includes(query)
          );
      }

      articles.sort(
        (a, b) => {
          if (
            Boolean(b.featured) !==
            Boolean(a.featured)
          ) {
            return b.featured
              ? 1
              : -1;
          }

          return (
            new Date(
              b.created_at
            ) -
            new Date(
              a.created_at
            )
          );
        }
      );

      const total =
        articles.length;

      const pageNumber =
        Math.max(
          1,
          safeNumber(
            page,
            1
          )
        );

      const perPage =
        Math.min(
          100,
          Math.max(
            1,
            safeNumber(
              limit,
              50
            )
          )
        );

      const start =
        (pageNumber - 1) *
        perPage;

      const paginated =
        articles.slice(
          start,
          start +
            perPage
        );

      res.json({
        success: true,
        articles:
          paginated,
        pagination: {
          page:
            pageNumber,
          limit:
            perPage,
          total,
          totalPages:
            Math.ceil(
              total /
                perPage
            )
        }
      });
    } catch (error) {
      console.error(
        "Articles GET error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "সংবাদ লোড করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: SINGLE
========================================================= */

app.get(
  "/api/articles/:id",
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "সঠিক সংবাদ ID প্রয়োজন।"
        });
      }

      const articles =
        readArticles();

      const article =
        articles.find(
          item =>
            Number(
              item.id
            ) === id
        );

      if (!article) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      const cookies =
        parseCookies(req);

      const isAdmin =
        !ADMIN_PASSWORD ||
        verifySessionToken(
          cookies[
            SESSION_COOKIE
          ]
        );

      if (
        article.status ===
          "draft" &&
        !isAdmin
      ) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      res.json({
        success: true,
        article:
          normalizeArticle(
            article
          )
      });
    } catch (error) {
      console.error(
        "Single article error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "সংবাদ লোড করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: CREATE
========================================================= */

app.post(
  "/api/articles",
  requireAdmin,
  (req, res) => {
    try {
      const body =
        req.body || {};

      const title =
        cleanText(
          body.title
        );

      const content =
        cleanText(
          body.content
        );

      if (!title) {
        return res.status(400).json({
          success: false,
          message:
            "সংবাদের শিরোনাম প্রয়োজন।"
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          message:
            "সংবাদের বিস্তারিত লেখা প্রয়োজন।"
        });
      }

      const articles =
        readArticles();

      const id =
        getNextArticleId(
          articles
        );

      const now =
        new Date().toISOString();

      const article = {
        id,

        title,

        slug:
          createSlug(
            title,
            id
          ),

        category:
          cleanText(
            body.category
          ) ||
          "সর্বশেষ",

        source_name:
          cleanText(
            body.source_name
          ) ||
          SITE_NAME,

        reporter:
          cleanText(
            body.reporter
          ),

        image:
          cleanText(
            body.image
          ),

        summary:
          cleanText(
            body.summary
          ),

        content,

        status:
          normalizeStatus(
            body.status
          ),

        featured:
          Boolean(
            body.featured
          ),

        views: 0,

        created_at: now,

        updated_at: now
      };

      articles.push(
        article
      );

      writeArticles(
        articles
      );

      res.status(201).json({
        success: true,
        message:
          "সংবাদ সফলভাবে সংরক্ষণ হয়েছে।",
        article:
          normalizeArticle(
            article
          )
      });
    } catch (error) {
      console.error(
        "Create article error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "সংবাদ সংরক্ষণ করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: UPDATE
========================================================= */

app.put(
  "/api/articles/:id",
  requireAdmin,
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      const articles =
        readArticles();

      const index =
        articles.findIndex(
          article =>
            Number(
              article.id
            ) === id
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      const body =
        req.body || {};

      const title =
        cleanText(
          body.title
        );

      const content =
        cleanText(
          body.content
        );

      if (!title) {
        return res.status(400).json({
          success: false,
          message:
            "সংবাদের শিরোনাম প্রয়োজন।"
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          message:
            "সংবাদের বিস্তারিত লেখা প্রয়োজন।"
        });
      }

      const oldArticle =
        articles[index];

      const updated = {
        ...oldArticle,

        title,

        slug:
          cleanText(
            body.slug
          ) ||
          createSlug(
            title,
            id
          ),

        category:
          cleanText(
            body.category
          ) ||
          "সর্বশেষ",

        source_name:
          cleanText(
            body.source_name
          ) ||
          SITE_NAME,

        reporter:
          cleanText(
            body.reporter
          ),

        image:
          cleanText(
            body.image
          ),

        summary:
          cleanText(
            body.summary
          ),

        content,

        status:
          normalizeStatus(
            body.status
          ),

        featured:
          Boolean(
            body.featured
          ),

        views:
          safeNumber(
            oldArticle.views
          ),

        created_at:
          oldArticle.created_at ||
          new Date().toISOString(),

        updated_at:
          new Date().toISOString()
      };

      articles[index] =
        updated;

      writeArticles(
        articles
      );

      res.json({
        success: true,
        message:
          "সংবাদ সফলভাবে আপডেট হয়েছে।",
        article:
          normalizeArticle(
            updated
          )
      });
    } catch (error) {
      console.error(
        "Update article error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "সংবাদ আপডেট করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: DELETE
========================================================= */

app.delete(
  "/api/articles/:id",
  requireAdmin,
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      const articles =
        readArticles();

      const index =
        articles.findIndex(
          article =>
            Number(
              article.id
            ) === id
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      articles.splice(
        index,
        1
      );

      writeArticles(
        articles
      );

      res.json({
        success: true,
        message:
          "সংবাদ সফলভাবে Delete হয়েছে।"
      });
    } catch (error) {
      console.error(
        "Delete article error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "সংবাদ Delete করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: FEATURED TOGGLE
========================================================= */

app.patch(
  "/api/articles/:id/featured",
  requireAdmin,
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      const articles =
        readArticles();

      const article =
        articles.find(
          item =>
            Number(
              item.id
            ) === id
        );

      if (!article) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      article.featured =
        Boolean(
          req.body &&
          req.body.featured
        );

      article.updated_at =
        new Date().toISOString();

      writeArticles(
        articles
      );

      res.json({
        success: true,
        message:
          article.featured
            ? "Featured করা হয়েছে।"
            : "Featured সরানো হয়েছে।",
        article:
          normalizeArticle(
            article
          )
      });
    } catch (error) {
      console.error(
        "Featured update error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Featured status পরিবর্তন করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: STATUS
========================================================= */

app.patch(
  "/api/articles/:id/status",
  requireAdmin,
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      const status =
        req.body &&
        req.body.status ===
          "draft"
          ? "draft"
          : "published";

      const articles =
        readArticles();

      const article =
        articles.find(
          item =>
            Number(
              item.id
            ) === id
        );

      if (!article) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      article.status =
        status;

      article.updated_at =
        new Date().toISOString();

      writeArticles(
        articles
      );

      res.json({
        success: true,
        message:
          status === "published"
            ? "সংবাদ Published হয়েছে।"
            : "সংবাদ Draft করা হয়েছে।",
        article:
          normalizeArticle(
            article
          )
      });
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "News status পরিবর্তন করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: VIEW COUNT
========================================================= */

app.post(
  "/api/articles/:id/view",
  (req, res) => {
    try {
      const id =
        safeNumber(
          req.params.id
        );

      const articles =
        readArticles();

      const article =
        articles.find(
          item =>
            Number(
              item.id
            ) === id
        );

      if (!article) {
        return res.status(404).json({
          success: false,
          message:
            "সংবাদ পাওয়া যায়নি।"
        });
      }

      if (
        article.status !==
        "published"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Draft news-এর view count করা যাবে না।"
        });
      }

      article.views =
        safeNumber(
          article.views
        ) + 1;

      writeArticles(
        articles
      );

      res.json({
        success: true,
        views:
          article.views
      });
    } catch (error) {
      console.error(
        "View update error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "View count update করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   ARTICLES: CATEGORIES
========================================================= */

app.get(
  "/api/categories",
  (req, res) => {
    try {
      const categories =
        [
          ...new Set(
            readArticles()
              .map(
                article =>
                  cleanText(
                    article.category
                  )
              )
              .filter(Boolean)
          )
        ]
        .sort(
          (a, b) =>
            a.localeCompare(
              b,
              "bn"
            )
        );

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error(
        "Categories error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Category লোড করা যায়নি।"
      });
    }
  }
);

/* =========================================================
   PHOTO CARD CONFIG
========================================================= */

app.get(
  "/api/photo-card/config",
  (req, res) => {
    try {
      const settings =
        readSettings();

      res.json({
        success: true,
        photoCard:
          settings.photoCard,
        site:
          settings.site
      });
    } catch (error) {
      console.error(
        "Photo card config error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Photo Card settings পাওয়া যায়নি।"
      });
    }
  }
);

/* =========================================================
   ADMIN DASHBOARD SUMMARY
========================================================= */

app.get(
  "/api/admin/stats",
  requireAdmin,
  (req, res) => {
    try {
      const articles =
        readArticles();

      const published =
        articles.filter(
          article =>
            article.status ===
            "published"
        );

      const drafts =
        articles.filter(
          article =>
            article.status ===
            "draft"
        );

      const featured =
        articles.filter(
          article =>
            Boolean(
              article.featured
            )
        );

      const views =
        articles.reduce(
          (sum, article) =>
            sum +
            safeNumber(
              article.views
            ),
          0
        );

      res.json({
        success: true,
        stats: {
          total:
            articles.length,
          published:
            published.length,
          drafts:
            drafts.length,
          featured:
            featured.length,
          views
        }
      });
    } catch (error) {
      console.error(
        "Stats error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Dashboard statistics পাওয়া যায়নি।"
      });
    }
  }
);

/* =========================================================
   STATIC WEBSITE
========================================================= */

app.use(
  express.static(
    PUBLIC_DIR,
    {
      index: "index.html"
    }
  )
);

/* =========================================================
   ADMIN HTML
========================================================= */

app.get(
  "/admin",
  (req, res) => {
    const adminFile =
      path.join(
        PUBLIC_DIR,
        "admin.html"
      );

    if (
      fs.existsSync(
        adminFile
      )
    ) {
      return res.sendFile(
        adminFile
      );
    }

    return res.status(404).send(
      "admin.html পাওয়া যায়নি।"
    );
  }
);

app.get(
  "/admin.html",
  (req, res) => {
    const adminFile =
      path.join(
        PUBLIC_DIR,
        "admin.html"
      );

    if (
      fs.existsSync(
        adminFile
      )
    ) {
      return res.sendFile(
        adminFile
      );
    }

    return res.status(404).send(
      "admin.html পাওয়া যায়নি।"
    );
  }
);

/* =========================================================
   SPA FALLBACK
========================================================= */

app.get(
  "/*splat",
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        success: false,
        message:
          "API endpoint পাওয়া যায়নি।"
      });
    }

    const indexFile =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
    ) {
      return res.sendFile(
        indexFile
      );
    }

    return res.status(404).send(
      "Website index.html পাওয়া যায়নি।"
    );
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(
        error
      );
    }

    res.status(500).json({
      success: false,
      message:
        "Server-এ একটি সমস্যা হয়েছে।"
    });
  }
);

/* =========================================================
   START
========================================================= */

ensureDataDirectory();
ensureArticlesFile();
ensureSettingsFile();

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "========================================"
    );

    console.log(
      `${SITE_NAME} SERVER STARTED`
    );

    console.log(
      `PORT: ${PORT}`
    );

    console.log(
      `PUBLIC: ${PUBLIC_DIR}`
    );

    console.log(
      `DATA: ${DATA_DIR}`
    );

    console.log(
      `ADMIN PASSWORD: ${
        ADMIN_PASSWORD
          ? "CONFIGURED"
          : "NOT CONFIGURED"
      }`
    );

    console.log(
      "========================================"
    );
  }
);
