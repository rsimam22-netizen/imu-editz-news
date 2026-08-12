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
   DATA STORAGE
========================================================= */

function ensureDataFiles() {

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


function getDefaultSettings() {

  return {

    ads: {

      header: {
        enabled: false,
        code: "",
        link: ""
      },

      sidebar: {
        enabled: false,
        code: "",
        link: ""
      },

      footer: {
        enabled: false,
        code: "",
        link: ""
      },

      popup: {
        enabled: false,
        code: "",
        link: "",
        delay: 5000
      }

    },


    social: {

      facebook: "",
      youtube: "",
      instagram: "",
      tiktok: "",
      twitter: "",
      whatsapp: ""

    },


    video: {

      enabled: false,

      title:
        "ভিডিও নিউজ",

      embed: "",

      url: ""

    },


    live: {

      facebook: {
        enabled: false,
        embed: "",
        url: ""
      },

      youtube: {
        enabled: false,
        embed: "",
        url: ""
      }

    },


    updated_at:
      new Date().toISOString()

  };

}


/* =========================================================
   ARTICLES
========================================================= */

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


function writeArticles(
  articles
) {

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


/* =========================================================
   SETTINGS
========================================================= */

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


function writeSettings(
  settings
) {

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
  current
) {

  return {

    ...defaults,

    ...current,

    ads: {
      ...defaults.ads,
      ...(current.ads || {}),

      header: {
        ...defaults.ads.header,
        ...(current.ads?.header || {})
      },

      sidebar: {
        ...defaults.ads.sidebar,
        ...(current.ads?.sidebar || {})
      },

      footer: {
        ...defaults.ads.footer,
        ...(current.ads?.footer || {})
      },

      popup: {
        ...defaults.ads.popup,
        ...(current.ads?.popup || {})
      }

    },

    social: {
      ...defaults.social,
      ...(current.social || {})
    },

    video: {
      ...defaults.video,
      ...(current.video || {})
    },

    live: {

      facebook: {
        ...defaults.live.facebook,
        ...(current.live?.facebook || {})
      },

      youtube: {
        ...defaults.live.youtube,
        ...(current.live?.youtube || {})
      }

    }

  };

}


/* =========================================================
   HELPERS
========================================================= */

function cleanText(
  value
) {

  if (
    typeof value !== "string"
  ) {

    return "";

  }

  return value.trim();

}


function cleanBoolean(
  value
) {

  return value === true;

}


function cleanDelay(
  value
) {

  const delay =
    Number(value);

  if (
    !Number.isFinite(delay)
  ) {

    return 5000;

  }

  return Math.max(
    0,
    Math.min(
      delay,
      600000
    )
  );

}


function normalizeArticle(
  article
) {

  return {

    id:
      Number(article.id),

    title:
      cleanText(article.title),

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


function normalizeSettings(
  input
) {

  const defaults =
    getDefaultSettings();

  const source =
    mergeSettings(
      defaults,
      input || {}
    );


  return {

    ads: {

      header: {

        enabled:
          cleanBoolean(
            source.ads.header.enabled
          ),

        code:
          cleanText(
            source.ads.header.code
          ),

        link:
          cleanText(
            source.ads.header.link
          )

      },


      sidebar: {

        enabled:
          cleanBoolean(
            source.ads.sidebar.enabled
          ),

        code:
          cleanText(
            source.ads.sidebar.code
          ),

        link:
          cleanText(
            source.ads.sidebar.link
          )

      },


      footer: {

        enabled:
          cleanBoolean(
            source.ads.footer.enabled
          ),

        code:
          cleanText(
            source.ads.footer.code
          ),

        link:
          cleanText(
            source.ads.footer.link
          )

      },


      popup: {

        enabled:
          cleanBoolean(
            source.ads.popup.enabled
          ),

        code:
          cleanText(
            source.ads.popup.code
          ),

        link:
          cleanText(
            source.ads.popup.link
          ),

        delay:
          cleanDelay(
            source.ads.popup.delay
          )

      }

    },


    social: {

      facebook:
        cleanText(
          source.social.facebook
        ),

      youtube:
        cleanText(
          source.social.youtube
        ),

      instagram:
        cleanText(
          source.social.instagram
        ),

      tiktok:
        cleanText(
          source.social.tiktok
        ),

      twitter:
        cleanText(
          source.social.twitter
        ),

      whatsapp:
        cleanText(
          source.social.whatsapp
        )

    },


    video: {

      enabled:
        cleanBoolean(
          source.video.enabled
        ),

      title:
        cleanText(
          source.video.title
        ) ||
        "ভিডিও নিউজ",

      embed:
        cleanText(
          source.video.embed
        ),

      url:
        cleanText(
          source.video.url
        )

    },


    live: {

      facebook: {

        enabled:
          cleanBoolean(
            source.live.facebook.enabled
          ),

        embed:
          cleanText(
            source.live.facebook.embed
          ),

        url:
          cleanText(
            source.live.facebook.url
          )

      },


      youtube: {

        enabled:
          cleanBoolean(
            source.live.youtube.enabled
          ),

        embed:
          cleanText(
            source.live.youtube.embed
          ),

        url:
          cleanText(
            source.live.youtube.url
          )

      }

    },

    updated_at:
      new Date().toISOString()

  };

}


/* =========================================================
   API: GET ARTICLES
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
          .filter(
            article =>
              article.status ===
              "published"
          )
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


/* =========================================================
   API: GET ALL ARTICLES FOR ADMIN
========================================================= */

app.get(
  "/api/admin/articles",
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

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Admin সংবাদ লোড করা যায়নি।"

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

      console.error(error);

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

      console.error(error);

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


/* =========================================================
   API: INCREMENT VIEWS
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


      article.updated_at =
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

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "View count update করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   SETTINGS API
   GET SETTINGS
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

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Settings লোড করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   SETTINGS API
   UPDATE SETTINGS
========================================================= */

app.put(
  "/api/settings",
  (req, res) => {

    try {

      const settings =
        normalizeSettings(
          req.body
        );


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
        "Settings save error:",
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
   ADS API
========================================================= */

app.get(
  "/api/ads",
  (req, res) => {

    try {

      const settings =
        readSettings();


      res.json({

        success: true,

        ads:
          settings.ads

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Ads লোড করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   SOCIAL MEDIA API
========================================================= */

app.get(
  "/api/social",
  (req, res) => {

    try {

      const settings =
        readSettings();


      res.json({

        success: true,

        social:
          settings.social

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Social media links লোড করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   VIDEO API
========================================================= */

app.get(
  "/api/video",
  (req, res) => {

    try {

      const settings =
        readSettings();


      res.json({

        success: true,

        video:
          settings.video

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Video settings লোড করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   LIVE API
========================================================= */

app.get(
  "/api/live",
  (req, res) => {

    try {

      const settings =
        readSettings();


      res.json({

        success: true,

        live:
          settings.live

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Live settings লোড করা যায়নি।"

      });

    }

  }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

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


    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "index.html"
      )
    );

  }
);


/* =========================================================
   START SERVER
========================================================= */

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
