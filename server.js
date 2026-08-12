const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

const ARTICLES_FILE = path.join(
  DATA_DIR,
  "articles.json"
);

const SETTINGS_FILE = path.join(
  DATA_DIR,
  "settings.json"
);

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(
  express.json({
    limit: "5mb"
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
   ARTICLES STORAGE
========================================================= */

function ensureArticlesFile() {
  ensureDataDirectory();

  if (!fs.existsSync(ARTICLES_FILE)) {
    fs.writeFileSync(
      ARTICLES_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

function readArticles() {
  ensureArticlesFile();

  try {
    const content =
      fs.readFileSync(
        ARTICLES_FILE,
        "utf8"
      );

    const articles =
      JSON.parse(content);

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

function writeArticles(
  articles
) {
  ensureArticlesFile();

  fs.writeFileSync(
    ARTICLES_FILE,
    JSON.stringify(
      articles,
      null,
      2
    ),
    "utf8"
  );
}

function getNextArticleId(
  articles
) {
  if (!articles.length) {
    return 1;
  }

  return (
    Math.max(
      ...articles.map(
        article =>
          Number(article.id) || 0
      )
    ) + 1
  );
}

/* =========================================================
   SETTINGS STORAGE
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
    name: "IMU EDITZ News",
    tagline: "সত্যের সঙ্গে, মানুষের পাশে",
    logo: "",
    favicon: "",
    description: ""
  }
};

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

function readSettings() {
  ensureSettingsFile();

  try {
    const content =
      fs.readFileSync(
        SETTINGS_FILE,
        "utf8"
      );

    const settings =
      JSON.parse(content);

    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      return {
        ...DEFAULT_SETTINGS
      };
    }

    return mergeSettings(
      DEFAULT_SETTINGS,
      settings
    );
  } catch (error) {
    console.error(
      "Settings read error:",
      error
    );

    return {
      ...DEFAULT_SETTINGS
    };
  }
}

function writeSettings(
  settings
) {
  ensureSettingsFile();

  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(
      settings,
      null,
      2
    ),
    "utf8"
  );
}

function mergeSettings(
  defaults,
  saved
) {
  const result = {
    ...defaults
  };

  Object.keys(defaults).forEach(
    key => {
      if (
        defaults[key] &&
        typeof defaults[key] === "object" &&
        !Array.isArray(
          defaults[key]
        )
      ) {
        result[key] = {
          ...defaults[key],
          ...(saved[key] &&
          typeof saved[key] === "object"
            ? saved[key]
            : {})
        };
      } else if (
        Object.prototype.hasOwnProperty.call(
          saved,
          key
        )
      ) {
        result[key] =
          saved[key];
      }
    }
  );

  return result;
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

function normalizeArticle(
  article
) {
  return {
    id: Number(article.id),

    title:
      cleanText(
        article.title
      ),

    category:
      cleanText(
        article.category
      ) || "সর্বশেষ",

    source_name:
      cleanText(
        article.source_name
      ) || "IMU EDITZ News",

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
      article.status === "draft"
        ? "draft"
        : "published",

    views:
      Number(article.views) || 0,

    created_at:
      article.created_at ||
      new Date().toISOString(),

    updated_at:
      article.updated_at ||
      new Date().toISOString()
  };
}

/* =========================================================
   API: HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      site: "IMU EDITZ News",
      status: "online",
      time:
        new Date().toISOString()
    });
  }
);

/* =========================================================
   API: SETTINGS GET
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
   API: SETTINGS UPDATE
========================================================= */

app.put(
  "/api/settings",
  (req, res) => {
    try {
      const currentSettings =
        readSettings();

      const incomingSettings =
        req.body &&
        typeof req.body === "object" &&
        !Array.isArray(req.body)
          ? req.body
          : {};

      const newSettings =
        mergeSettings(
          currentSettings,
          incomingSettings
        );

      /* -----------------------------------------
         CLEAN ADS
      ----------------------------------------- */

      newSettings.headerAd = {
        enabled:
          Boolean(
            newSettings.headerAd.enabled
          ),

        type:
          newSettings.headerAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            newSettings.headerAd.content
          )
      };

      newSettings.footerAd = {
        enabled:
          Boolean(
            newSettings.footerAd.enabled
          ),

        type:
          newSettings.footerAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            newSettings.footerAd.content
          )
      };

      newSettings.sidebarAd = {
        enabled:
          Boolean(
            newSettings.sidebarAd.enabled
          ),

        type:
          newSettings.sidebarAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            newSettings.sidebarAd.content
          )
      };

      newSettings.popupAd = {
        enabled:
          Boolean(
            newSettings.popupAd.enabled
          ),

        type:
          newSettings.popupAd.type ===
          "link"
            ? "link"
            : "code",

        content:
          cleanText(
            newSettings.popupAd.content
          ),

        delay:
          Math.max(
            0,
            Number(
              newSettings.popupAd.delay
            ) || 5000
          )
      };

      /* -----------------------------------------
         VIDEO
      ----------------------------------------- */

      newSettings.videoNews = {
        enabled:
          Boolean(
            newSettings.videoNews.enabled
          ),

        title:
          cleanText(
            newSettings.videoNews.title
          ) ||
          "ভিডিও নিউজ",

        videoUrl:
          cleanText(
            newSettings.videoNews.videoUrl
          ),

        embedCode:
          cleanText(
            newSettings.videoNews.embedCode
          )
      };

      /* -----------------------------------------
         SOCIAL
      ----------------------------------------- */

      newSettings.social = {
        facebook:
          cleanText(
            newSettings.social.facebook
          ),

        youtube:
          cleanText(
            newSettings.social.youtube
          ),

        instagram:
          cleanText(
            newSettings.social.instagram
          ),

        twitter:
          cleanText(
            newSettings.social.twitter
          ),

        tiktok:
          cleanText(
            newSettings.social.tiktok
          ),

        telegram:
          cleanText(
            newSettings.social.telegram
          ),

        whatsapp:
          cleanText(
            newSettings.social.whatsapp
          )
      };

      /* -----------------------------------------
         FACEBOOK LIVE
      ----------------------------------------- */

      newSettings.facebookLive = {
        enabled:
          Boolean(
            newSettings.facebookLive.enabled
          ),

        pageUrl:
          cleanText(
            newSettings.facebookLive.pageUrl
          ),

        embedCode:
          cleanText(
            newSettings.facebookLive.embedCode
          )
      };

      /* -----------------------------------------
         YOUTUBE LIVE
      ----------------------------------------- */

      newSettings.youtubeLive = {
        enabled:
          Boolean(
            newSettings.youtubeLive.enabled
          ),

        channelUrl:
          cleanText(
            newSettings.youtubeLive.channelUrl
          ),

        embedCode:
          cleanText(
            newSettings.youtubeLive.embedCode
          )
      };

      /* -----------------------------------------
         SITE
      ----------------------------------------- */

      newSettings.site = {
        name:
          cleanText(
            newSettings.site.name
          ) ||
          "IMU EDITZ News",

        tagline:
          cleanText(
            newSettings.site.tagline
          ) ||
          "সত্যের সঙ্গে, মানুষের পাশে",

        logo:
          cleanText(
            newSettings.site.logo
          ),

        favicon:
          cleanText(
            newSettings.site.favicon
          ),

        description:
          cleanText(
            newSettings.site.description
          )
      };

      writeSettings(
        newSettings
      );

      res.json({
        success: true,
        message:
          "Settings সফলভাবে সংরক্ষণ হয়েছে।",
        settings:
          newSettings
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
   API: GET ALL ARTICLES
========================================================= */

app.get(
  "/api/articles",
  (req, res) => {
    try {
      const articles =
        readArticles()
          .map(
            normalizeArticle
          )
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ) -
              new Date(
                a.created_at
              )
          );

      res.json({
        success: true,
        articles
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
   API: GET SINGLE ARTICLE
========================================================= */

app.get(
  "/api/articles/:id",
  (req, res) => {
    try {
      const id =
        Number(
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
            Number(item.id) === id
        );

      if (!article) {
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
   API: CREATE ARTICLE
========================================================= */

app.post(
  "/api/articles",
  (req, res) => {
    try {
      const title =
        cleanText(
          req.body.title
        );

      const content =
        cleanText(
          req.body.content
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

      const now =
        new Date().toISOString();

      const article = {
        id:
          getNextArticleId(
            articles
          ),

        title,

        category:
          cleanText(
            req.body.category
          ) ||
          "সর্বশেষ",

        source_name:
          cleanText(
            req.body.source_name
          ) ||
          "IMU EDITZ News",

        image:
          cleanText(
            req.body.image
          ),

        summary:
          cleanText(
            req.body.summary
          ),

        content,

        status:
          req.body.status ===
          "draft"
            ? "draft"
            : "published",

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
   API: UPDATE ARTICLE
========================================================= */

app.put(
  "/api/articles/:id",
  (req, res) => {
    try {
      const id =
        Number(
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

      const title =
        cleanText(
          req.body.title
        );

      const content =
        cleanText(
          req.body.content
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

      const updatedArticle = {
        ...oldArticle,

        title,

        category:
          cleanText(
            req.body.category
          ) ||
          "সর্বশেষ",

        source_name:
          cleanText(
            req.body.source_name
          ) ||
          "IMU EDITZ News",

        image:
          cleanText(
            req.body.image
          ),

        summary:
          cleanText(
            req.body.summary
          ),

        content,

        status:
          req.body.status ===
          "draft"
            ? "draft"
            : "published",

        views:
          Number(
            oldArticle.views
          ) || 0,

        updated_at:
          new Date().toISOString()
      };

      articles[index] =
        updatedArticle;

      writeArticles(
        articles
      );

      res.json({
        success: true,
        message:
          "সংবাদ সফলভাবে আপডেট হয়েছে।",
        article:
          normalizeArticle(
            updatedArticle
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
   API: DELETE ARTICLE
========================================================= */

app.delete(
  "/api/articles/:id",
  (req, res) => {
    try {
      const id =
        Number(
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
   API: INCREMENT ARTICLE VIEWS
========================================================= */

app.post(
  "/api/articles/:id/view",
  (req, res) => {
    try {
      const id =
        Number(
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

      article.views =
        (Number(
          article.views
        ) || 0) + 1;

      article.updated_at =
        article.updated_at ||
        new Date().toISOString();

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
   STATIC WEBSITE
========================================================= */

app.use(
  express.static(
    PUBLIC_DIR
  )
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
   START SERVER
========================================================= */

ensureDataDirectory();
ensureArticlesFile();
ensureSettingsFile();

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `IMU EDITZ News running on port ${PORT}`
    );

    console.log(
      `PORT: ${PORT}`
    );

    console.log(
      `Public directory: ${PUBLIC_DIR}`
    );

    console.log(
      `Settings file: ${SETTINGS_FILE}`
    );
  }
);
