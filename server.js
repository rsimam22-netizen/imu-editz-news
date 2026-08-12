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

/* =====================================================
   DATA STORAGE
===================================================== */

function ensureDataFile() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(
      DATA_DIR,
      {
        recursive: true
      }
    );
  }

  if (!fs.existsSync(DATA_FILE)) {

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        [],
        null,
        2
      ),
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


/* =====================================================
   DEFAULT SETTINGS
===================================================== */

function getDefaultSettings() {

  return {

    /* -----------------------------
       HEADER AD
    ----------------------------- */

    headerAd: {
      enabled: false,
      type: "code",
      content: ""
    },


    /* -----------------------------
       FOOTER AD
    ----------------------------- */

    footerAd: {
      enabled: false,
      type: "code",
      content: ""
    },


    /* -----------------------------
       SIDEBAR AD
    ----------------------------- */

    sidebarAd: {
      enabled: false,
      type: "code",
      content: ""
    },


    /* -----------------------------
       POPUP AD
    ----------------------------- */

    popupAd: {
      enabled: false,
      type: "code",
      content: "",
      delay: 5000
    },


    /* -----------------------------
       VIDEO NEWS
    ----------------------------- */

    videoNews: {
      enabled: false,
      title: "ভিডিও নিউজ",
      embedCode: "",
      videoUrl: ""
    },


    /* -----------------------------
       SOCIAL MEDIA
    ----------------------------- */

    social: {

      facebook: "",
      youtube: "",
      instagram: "",
      twitter: "",
      tiktok: "",
      telegram: "",
      whatsapp: ""

    },


    /* -----------------------------
       FACEBOOK LIVE
    ----------------------------- */

    facebookLive: {

      enabled: false,

      pageUrl: "",

      embedCode: ""

    },


    /* -----------------------------
       YOUTUBE LIVE
    ----------------------------- */

    youtubeLive: {

      enabled: false,

      channelUrl: "",

      embedCode: ""

    },


    /* -----------------------------
       SITE SETTINGS
    ----------------------------- */

    site: {

      name: "IMU EDITZ News",

      tagline:
        "সত্যের সঙ্গে, মানুষের পাশে",

      logo: "",

      favicon: "",

      description:
        "IMU EDITZ News একটি আধুনিক ডিজিটাল নিউজ প্ল্যাটফর্ম।"

    }

  };

}


/* =====================================================
   SETTINGS READ
===================================================== */

function readSettings() {

  ensureDataFile();

  try {

    const content =
      fs.readFileSync(
        SETTINGS_FILE,
        "utf8"
      );

    const settings =
      JSON.parse(content);

    return settings;

  } catch (error) {

    console.error(
      "Settings read error:",
      error
    );

    return getDefaultSettings();
  }
}


/* =====================================================
   SETTINGS WRITE
===================================================== */

function writeSettings(settings) {

  ensureDataFile();

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


/* =====================================================
   ARTICLES READ
===================================================== */

function readArticles() {

  ensureDataFile();

  try {

    const content =
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      );

    const articles =
      JSON.parse(content);

    return Array.isArray(
      articles
    )
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


/* =====================================================
   ARTICLES WRITE
===================================================== */

function writeArticles(
  articles
) {

  ensureDataFile();

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


/* =====================================================
   NEXT ARTICLE ID
===================================================== */

function getNextId(
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


/* =====================================================
   HELPERS
===================================================== */

function cleanText(
  value
) {

  if (
    typeof value !==
    "string"
  ) {

    return "";
  }

  return value.trim();
}


/* =====================================================
   NORMALIZE ARTICLE
===================================================== */

function normalizeArticle(
  article
) {

  return {

    id:
      Number(article.id),

    title:
      cleanText(
        article.title
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
      "IMU EDITZ News",

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


/* =====================================================
   API
   GET ALL ARTICLES
===================================================== */

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


/* =====================================================
   API
   GET SINGLE ARTICLE
===================================================== */

app.get(
  "/api/articles/:id",
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

        return res.status(
          404
        ).json({

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


/* =====================================================
   API
   CREATE ARTICLE
===================================================== */

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

        return res.status(
          400
        ).json({

          success: false,

          message:
            "সংবাদের শিরোনাম প্রয়োজন।"

        });
      }

      if (!content) {

        return res.status(
          400
        ).json({

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
          req.body.status ===
          "draft"
            ? "draft"
            : "published",

        views: 0,

        created_at:
          now,

        updated_at:
          now
      };

      articles.push(
        article
      );

      writeArticles(
        articles
      );

      res.status(
        201
      ).json({

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


/* =====================================================
   API
   UPDATE ARTICLE
===================================================== */

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

        return res.status(
          404
        ).json({

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

        return res.status(
          400
        ).json({

          success: false,

          message:
            "সংবাদের শিরোনাম প্রয়োজন।"

        });
      }

      if (!content) {

        return res.status(
          400
        ).json({

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


/* =====================================================
   API
   DELETE ARTICLE
===================================================== */

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

        return res.status(
          404
        ).json({

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

      console.error(
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


/* =====================================================
   API
   INCREMENT VIEWS
===================================================== */

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

        return res.status(
          404
        ).json({

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

      console.error(
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


/* =====================================================
   SETTINGS API
   GET SETTINGS
===================================================== */

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


/* =====================================================
   SETTINGS API
   UPDATE SETTINGS
===================================================== */

app.put(
  "/api/settings",
  (req, res) => {

    try {

      const oldSettings =
        readSettings();

      const body =
        req.body || {};


      const settings = {

        ...oldSettings,

        headerAd: {

          ...oldSettings.headerAd,

          ...(body.headerAd || {}),

          enabled:
            Boolean(
              body.headerAd?.enabled
            ),

          type:
            body.headerAd?.type ===
            "link"
              ? "link"
              : "code",

          content:
            cleanText(
              body.headerAd?.content
            )

        },


        footerAd: {

          ...oldSettings.footerAd,

          ...(body.footerAd || {}),

          enabled:
            Boolean(
              body.footerAd?.enabled
            ),

          type:
            body.footerAd?.type ===
            "link"
              ? "link"
              : "code",

          content:
            cleanText(
              body.footerAd?.content
            )

        },


        sidebarAd: {

          ...oldSettings.sidebarAd,

          ...(body.sidebarAd || {}),

          enabled:
            Boolean(
              body.sidebarAd?.enabled
            ),

          type:
            body.sidebarAd?.type ===
            "link"
              ? "link"
              : "code",

          content:
            cleanText(
              body.sidebarAd?.content
            )

        },


        popupAd: {

          ...oldSettings.popupAd,

          ...(body.popupAd || {}),

          enabled:
            Boolean(
              body.popupAd?.enabled
            ),

          type:
            body.popupAd?.type ===
            "link"
              ? "link"
              : "code",

          content:
            cleanText(
              body.popupAd?.content
            ),

          delay:
            Math.max(
              0,
              Number(
                body.popupAd?.delay
              ) || 5000
            )

        },


        videoNews: {

          ...oldSettings.videoNews,

          ...(body.videoNews || {}),

          enabled:
            Boolean(
              body.videoNews?.enabled
            ),

          title:
            cleanText(
              body.videoNews?.title
            ) ||
            "ভিডিও নিউজ",

          embedCode:
            cleanText(
              body.videoNews?.embedCode
            ),

          videoUrl:
            cleanText(
              body.videoNews?.videoUrl
            )

        },


        social: {

          ...oldSettings.social,

          ...(body.social || {}),

          facebook:
            cleanText(
              body.social?.facebook
            ),

          youtube:
            cleanText(
              body.social?.youtube
            ),

          instagram:
            cleanText(
              body.social?.instagram
            ),

          twitter:
            cleanText(
              body.social?.twitter
            ),

          tiktok:
            cleanText(
              body.social?.tiktok
            ),

          telegram:
            cleanText(
              body.social?.telegram
            ),

          whatsapp:
            cleanText(
              body.social?.whatsapp
            )

        },


        facebookLive: {

          ...oldSettings.facebookLive,

          ...(body.facebookLive || {}),

          enabled:
            Boolean(
              body.facebookLive?.enabled
            ),

          pageUrl:
            cleanText(
              body.facebookLive?.pageUrl
            ),

          embedCode:
            cleanText(
              body.facebookLive?.embedCode
            )

        },


        youtubeLive: {

          ...oldSettings.youtubeLive,

          ...(body.youtubeLive || {}),

          enabled:
            Boolean(
              body.youtubeLive?.enabled
            ),

          channelUrl:
            cleanText(
              body.youtubeLive?.channelUrl
            ),

          embedCode:
            cleanText(
              body.youtubeLive?.embedCode
            )

        },


        site: {

          ...oldSettings.site,

          ...(body.site || {}),

          name:
            cleanText(
              body.site?.name
            ) ||
            "IMU EDITZ News",

          tagline:
            cleanText(
              body.site?.tagline
            ) ||
            "সত্যের সঙ্গে, মানুষের পাশে",

          logo:
            cleanText(
              body.site?.logo
            ),

          favicon:
            cleanText(
              body.site?.favicon
            ),

          description:
            cleanText(
              body.site?.description
            )

        }

      };


      writeSettings(
        settings
      );


      res.json({

        success: true,

        message:
          "Website settings সফলভাবে সংরক্ষণ হয়েছে।",

        settings

      });

    } catch (error) {

      console.error(
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Website settings সংরক্ষণ করা যায়নি।"

      });
    }
  }
);


/* =====================================================
   HEALTH CHECK
===================================================== */

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


/* =====================================================
   STATIC WEBSITE
===================================================== */

app.use(
  express.static(
    PUBLIC_DIR
  )
);


/* =====================================================
   SPA FALLBACK
===================================================== */

app.get(
  "/*splat",
  (req, res) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return res.status(
        404
      ).json({

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


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `IMU EDITZ News running on port ${PORT}`
    );

  }
);
