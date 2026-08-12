const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

const DATA_FILE = path.join(
  DATA_DIR,
  "articles.json"
);

const SETTINGS_FILE = path.join(
  DATA_DIR,
  "settings.json"
);

app.use(cors());

app.use(
  express.json({
    limit: "5mb"
  })
);

/* =================================
   DATA STORAGE
================================= */

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(
        getDefaultSettings(),
        null,
        2
      ),
      "utf8"
    );
  }
}


/* =================================
   DEFAULT SETTINGS
================================= */

function getDefaultSettings() {
  return {
    ads: {
      header: {
        enabled: false,
        code: ""
      },

      footer: {
        enabled: false,
        code: ""
      },

      sidebar: {
        enabled: false,
        code: ""
      },

      popup: {
        enabled: false,
        code: "",
        delay: 5000
      }
    },

    video: {
      enabled: false,
      embed: ""
    },

    social: {
      facebook: "",
      youtube: "",
      instagram: "",
      tiktok: "",
      x: ""
    },

    live: {
      facebook: "",
      youtube: ""
    }
  };
}


/* =================================
   ARTICLES
================================= */

function readArticles() {
  ensureDataFiles();

  try {
    const content =
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      );

    const articles =
      JSON.parse(content);

    return Array.isArray(articles)
      ? articles
      : [];

  } catch (error) {

    console.error(
      "Database read error:",
      error
    );

    return [];
  }
}


function writeArticles(articles) {
  ensureDataFiles();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      articles,
      null,
      2
    ),
    "utf8"
  );
}


function getNextId(articles) {

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


/* =================================
   SETTINGS
================================= */

function readSettings() {
  ensureDataFiles();

  try {

    const content =
      fs.readFileSync(
        SETTINGS_FILE,
        "utf8"
      );

    const settings =
      JSON.parse(content);

    return mergeSettings(
      getDefaultSettings(),
      settings
    );

  } catch (error) {

    console.error(
      "Settings read error:",
      error
    );

    return getDefaultSettings();
  }
}


function writeSettings(settings) {
  ensureDataFiles();

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
  custom
) {

  return {

    ads: {

      header: {
        ...defaults.ads.header,
        ...(custom.ads?.header || {})
      },

      footer: {
        ...defaults.ads.footer,
        ...(custom.ads?.footer || {})
      },

      sidebar: {
        ...defaults.ads.sidebar,
        ...(custom.ads?.sidebar || {})
      },

      popup: {
        ...defaults.ads.popup,
        ...(custom.ads?.popup || {})
      }

    },

    video: {
      ...defaults.video,
      ...(custom.video || {})
    },

    social: {
      ...defaults.social,
      ...(custom.social || {})
    },

    live: {
      ...defaults.live,
      ...(custom.live || {})
    }

  };
}


/* =================================
   HELPERS
================================= */

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
      cleanText(article.title),

    category:
      cleanText(article.category) ||
      "সর্বশেষ",

    source_name:
      cleanText(
        article.source_name
      ) ||
      "IMU EDITZ News",

    image:
      cleanText(article.image),

    summary:
      cleanText(article.summary),

    content:
      cleanText(article.content),

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


/* =================================
   SETTINGS API
================================= */

/*
   GET SETTINGS
*/

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

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Settings লোড করা যায়নি।"
      });

    }

  }
);


/*
   UPDATE SETTINGS
*/

app.put(
  "/api/settings",
  (req, res) => {

    try {

      const currentSettings =
        readSettings();

      const newSettings =
        mergeSettings(
          currentSettings,
          req.body || {}
        );


      /*
         AD SETTINGS
      */

      newSettings.ads.header.enabled =
        Boolean(
          newSettings.ads.header.enabled
        );

      newSettings.ads.footer.enabled =
        Boolean(
          newSettings.ads.footer.enabled
        );

      newSettings.ads.sidebar.enabled =
        Boolean(
          newSettings.ads.sidebar.enabled
        );

      newSettings.ads.popup.enabled =
        Boolean(
          newSettings.ads.popup.enabled
        );


      newSettings.ads.header.code =
        cleanText(
          newSettings.ads.header.code
        );

      newSettings.ads.footer.code =
        cleanText(
          newSettings.ads.footer.code
        );

      newSettings.ads.sidebar.code =
        cleanText(
          newSettings.ads.sidebar.code
        );

      newSettings.ads.popup.code =
        cleanText(
          newSettings.ads.popup.code
        );


      const popupDelay =
        Number(
          newSettings.ads.popup.delay
        );

      newSettings.ads.popup.delay =
        Number.isFinite(
          popupDelay
        ) &&
        popupDelay >= 0
          ? popupDelay
          : 5000;


      /*
         VIDEO
      */

      newSettings.video.enabled =
        Boolean(
          newSettings.video.enabled
        );

      newSettings.video.embed =
        cleanText(
          newSettings.video.embed
        );


      /*
         SOCIAL MEDIA
      */

      newSettings.social.facebook =
        cleanText(
          newSettings.social.facebook
        );

      newSettings.social.youtube =
        cleanText(
          newSettings.social.youtube
        );

      newSettings.social.instagram =
        cleanText(
          newSettings.social.instagram
        );

      newSettings.social.tiktok =
        cleanText(
          newSettings.social.tiktok
        );

      newSettings.social.x =
        cleanText(
          newSettings.social.x
        );


      /*
         LIVE
      */

      newSettings.live.facebook =
        cleanText(
          newSettings.live.facebook
        );

      newSettings.live.youtube =
        cleanText(
          newSettings.live.youtube
        );


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

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Settings সংরক্ষণ করা যায়নি।"
      });

    }

  }
);


/* =================================
   ARTICLES API
================================= */


/*
   GET ALL ARTICLES
*/

app.get(
  "/api/articles",
  (req, res) => {

    try {

      const articles =
        readArticles()
          .map(normalizeArticle)
          .sort(
            (a, b) =>
              new Date(
                b.published_at ||
                b.created_at
              ) -
              new Date(
                a.published_at ||
                a.created_at
              )
          );

      res.json({
        success: true,
        articles
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "সংবাদ লোড করা যায়নি।"
      });

    }

  }
);


/*
   GET SINGLE ARTICLE
*/

app.get(
  "/api/articles/:id",
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

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
          normalizeArticle(article)
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "সংবাদ লোড করা যায়নি।"
      });

    }

  }
);


/*
   CREATE ARTICLE
*/

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
          getNextId(
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
          req.body.status === "draft"
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

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "সংবাদ সংরক্ষণ করা যায়নি।"
      });

    }

  }
);


/*
   UPDATE ARTICLE
*/

app.put(
  "/api/articles/:id",
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const articles =
        readArticles();

      const index =
        articles.findIndex(
          article =>
            Number(article.id) === id
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
          req.body.status === "draft"
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

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "সংবাদ আপডেট করা যায়নি।"
      });

    }

  }
);


/*
   DELETE ARTICLE
*/

app.delete(
  "/api/articles/:id",
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const articles =
        readArticles();

      const index =
        articles.findIndex(
          article =>
            Number(article.id) === id
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
          "সংবাদ Delete হয়েছে।"
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "সংবাদ Delete করা যায়নি।"
      });

    }

  }
);


/*
   INCREMENT VIEWS
*/

app.post(
  "/api/articles/:id/view",
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

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

      article.views =
        (
          Number(
            article.views
          ) || 0
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

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "View count update করা যায়নি।"
      });

    }

  }
);


/* =================================
   HEALTH CHECK
================================= */

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      site:
        "IMU EDITZ News",

      status:
        "online",

      time:
        new Date().toISOString()

    });

  }
);


/* =================================
   STATIC WEBSITE
================================= */

app.use(
  express.static(
    PUBLIC_DIR
  )
);


/* =================================
   FALLBACK
================================= */

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

    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "index.html"
      )
    );

  }
);


/* =================================
   START SERVER
================================= */

ensureDataFiles();

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `IMU EDITZ News running on port ${PORT}`
    );

  }
);
