"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "change-this-admin-secret";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "";

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "";

const useSupabase =
  Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);


/* -------------------------------------------------------
   APP CONFIGURATION
------------------------------------------------------- */

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Secret"
    ]
  })
);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb"
  })
);


/* -------------------------------------------------------
   SECURITY HEADERS
------------------------------------------------------- */

app.use((req, res, next) => {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  next();
});


/* -------------------------------------------------------
   STATIC WEBSITE
------------------------------------------------------- */

const publicDirectory =
  path.join(__dirname, "public");

app.use(
  express.static(publicDirectory, {
    extensions: ["html"]
  })
);


/* -------------------------------------------------------
   DEMO DATABASE
   Used until Supabase is connected.
------------------------------------------------------- */

let demoArticles = [
  {
    id: 1,
    title: "IMU EDITZ News-এর যাত্রা শুরু",
    summary:
      "আধুনিক প্রযুক্তিনির্ভর একটি নতুন ডিজিটাল নিউজ প্ল্যাটফর্ম হিসেবে IMU EDITZ News-এর যাত্রা শুরু হয়েছে।",
    content:
      "IMU EDITZ News একটি আধুনিক ডিজিটাল সংবাদ প্ল্যাটফর্ম হিসেবে তৈরি করা হচ্ছে। এখানে দেশ-বিদেশের গুরুত্বপূর্ণ সংবাদ পাঠকদের কাছে দ্রুত ও সুন্দরভাবে উপস্থাপন করা হবে।",
    category: "জাতীয়",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
    source_name: "IMU EDITZ News",
    source_url: "",
    status: "published",
    views: 0,
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString()
  }
];


/* -------------------------------------------------------
   SUPABASE HELPER
------------------------------------------------------- */

async function supabaseRequest(
  endpoint,
  options = {}
) {
  if (!useSupabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${endpoint}`,
      {
        ...options,
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization":
            `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type":
            "application/json",
          "Prefer":
            "return=representation",
          ...(options.headers || {})
        }
      }
    );

  const text =
    await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
        data?.hint ||
        "Supabase request failed."
      );

    error.status =
      response.status;

    throw error;
  }

  return data;
}


/* -------------------------------------------------------
   VALIDATION
------------------------------------------------------- */

function cleanText(
  value,
  maxLength = 5000
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}


function normalizeArticle(input) {
  return {
    title:
      cleanText(input.title, 300),

    summary:
      cleanText(input.summary, 1000),

    content:
      cleanText(input.content, 20000),

    category:
      cleanText(
        input.category || "অন্যান্য",
        80
      ),

    image:
      cleanText(input.image, 2000),

    source_name:
      cleanText(
        input.source_name ||
        "IMU EDITZ News",
        200
      ),

    source_url:
      cleanText(input.source_url, 2000)
  };
}


/* -------------------------------------------------------
   ADMIN AUTHENTICATION
------------------------------------------------------- */

function requireAdmin(
  req,
  res,
  next
) {
  const suppliedSecret =
    req.headers["x-admin-secret"];

  if (
    !suppliedSecret ||
    suppliedSecret !== ADMIN_SECRET
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Unauthorized admin request."
    });
  }

  next();
}


/* -------------------------------------------------------
   HEALTH CHECK
------------------------------------------------------- */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      service: "IMU EDITZ News API",
      status: "online",
      database:
        useSupabase
          ? "supabase"
          : "demo-memory",
      time:
        new Date().toISOString()
    });
  }
);


/* -------------------------------------------------------
   GET PUBLISHED ARTICLES
------------------------------------------------------- */

app.get(
  "/api/articles",
  async (req, res) => {
    try {

      if (useSupabase) {

        const articles =
          await supabaseRequest(
            "articles?select=*&status=eq.published&order=created_at.desc"
          );

        return res.json({
          success: true,
          articles: Array.isArray(articles)
            ? articles
            : []
        });
      }


      const articles =
        demoArticles
          .filter(
            article =>
              article.status ===
              "published"
          )
          .sort(
            (a, b) =>
              new Date(b.created_at) -
              new Date(a.created_at)
          );


      return res.json({
        success: true,
        articles
      });

    } catch (error) {

      console.error(
        "GET /api/articles:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "সংবাদ লোড করা যায়নি।"
      });
    }
  }
);


/* -------------------------------------------------------
   GET SINGLE ARTICLE
------------------------------------------------------- */

app.get(
  "/api/articles/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid article ID."
      });
    }


    try {

      if (useSupabase) {

        const result =
          await supabaseRequest(
            `articles?id=eq.${id}&status=eq.published&select=*`
          );

        if (
          !Array.isArray(result) ||
          result.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Article not found."
          });
        }

        return res.json({
          success: true,
          article: result[0]
        });
      }


      const article =
        demoArticles.find(
          item =>
            item.id === id &&
            item.status ===
              "published"
        );


      if (!article) {
        return res.status(404).json({
          success: false,
          message:
            "Article not found."
        });
      }


      article.views =
        Number(article.views || 0) + 1;


      return res.json({
        success: true,
        article
      });

    } catch (error) {

      console.error(
        "GET /api/articles/:id:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Article load failed."
      });
    }
  }
);


/* -------------------------------------------------------
   ADMIN - GET ALL ARTICLES
------------------------------------------------------- */

app.get(
  "/api/admin/articles",
  requireAdmin,
  async (req, res) => {

    try {

      if (useSupabase) {

        const articles =
          await supabaseRequest(
            "articles?select=*&order=created_at.desc"
          );

        return res.json({
          success: true,
          articles
        });
      }


      return res.json({
        success: true,
        articles:
          [...demoArticles].sort(
            (a, b) =>
              new Date(b.created_at) -
              new Date(a.created_at)
          )
      });

    } catch (error) {

      console.error(
        "ADMIN GET ARTICLES:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Admin news load failed."
      });
    }
  }
);


/* -------------------------------------------------------
   ADMIN - CREATE ARTICLE
------------------------------------------------------- */

app.post(
  "/api/admin/articles",
  requireAdmin,
  async (req, res) => {

    try {

      const article =
        normalizeArticle(req.body);


      if (!article.title) {
        return res.status(400).json({
          success: false,
          message:
            "Headline is required."
        });
      }


      const status =
        req.body.status ===
        "published"
          ? "published"
          : "draft";


      const now =
        new Date().toISOString();


      if (useSupabase) {

        const payload = {
          ...article,
          status,
          views: 0,
          created_at: now,
          published_at:
            status === "published"
              ? now
              : null
        };


        const result =
          await supabaseRequest(
            "articles",
            {
              method: "POST",
              body:
                JSON.stringify(payload)
            }
          );


        return res.status(201).json({
          success: true,
          article: result[0]
        });
      }


      const newArticle = {
        id:
          demoArticles.length
            ? Math.max(
                ...demoArticles.map(
                  item => item.id
                )
              ) + 1
            : 1,

        ...article,

        status,

        views: 0,

        created_at: now,

        published_at:
          status === "published"
            ? now
            : null
      };


      demoArticles.push(
        newArticle
      );


      return res.status(201).json({
        success: true,
        article: newArticle
      });

    } catch (error) {

      console.error(
        "ADMIN CREATE:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "সংবাদ তৈরি করা যায়নি।"
      });
    }
  }
);


/* -------------------------------------------------------
   ADMIN - UPDATE ARTICLE
------------------------------------------------------- */

app.put(
  "/api/admin/articles/:id",
  requireAdmin,
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid article ID."
      });
    }


    try {

      const updates =
        normalizeArticle(req.body);


      if (req.body.status) {

        updates.status =
          req.body.status ===
          "published"
            ? "published"
            : "draft";
      }


      if (useSupabase) {

        if (
          updates.status ===
          "published"
        ) {
          updates.published_at =
            new Date().toISOString();
        }


        const result =
          await supabaseRequest(
            `articles?id=eq.${id}`,
            {
              method: "PATCH",
              body:
                JSON.stringify(updates)
            }
          );


        if (
          !Array.isArray(result) ||
          result.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Article not found."
          });
        }


        return res.json({
          success: true,
          article: result[0]
        });
      }


      const index =
        demoArticles.findIndex(
          item => item.id === id
        );


      if (index === -1) {
        return res.status(404).json({
          success: false,
          message:
            "Article not found."
        });
      }


      const existing =
        demoArticles[index];


      demoArticles[index] = {
        ...existing,
        ...updates
      };


      if (
        updates.status ===
        "published"
      ) {
        demoArticles[index]
          .published_at =
          new Date().toISOString();
      }


      return res.json({
        success: true,
        article:
          demoArticles[index]
      });

    } catch (error) {

      console.error(
        "ADMIN UPDATE:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "সংবাদ update করা যায়নি।"
      });
    }
  }
);


/* -------------------------------------------------------
   ADMIN - DELETE ARTICLE
------------------------------------------------------- */

app.delete(
  "/api/admin/articles/:id",
  requireAdmin,
  async (req, res) => {

    const id =
      Number(req.params.id);


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid article ID."
      });
    }


    try {

      if (useSupabase) {

        const result =
          await supabaseRequest(
            `articles?id=eq.${id}`,
            {
              method: "DELETE"
            }
          );


        return res.json({
          success: true,
          deleted:
            Array.isArray(result)
              ? result.length
              : 0
        });
      }


      const oldLength =
        demoArticles.length;


      demoArticles =
        demoArticles.filter(
          item => item.id !== id
        );


      if (
        demoArticles.length ===
        oldLength
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Article not found."
        });
      }


      return res.json({
        success: true,
        deleted: 1
      });

    } catch (error) {

      console.error(
        "ADMIN DELETE:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "সংবাদ delete করা যায়নি।"
      });
    }
  }
);


/* -------------------------------------------------------
   ADMIN DASHBOARD STATS
------------------------------------------------------- */

app.get(
  "/api/admin/stats",
  requireAdmin,
  async (req, res) => {

    try {

      let articles;


      if (useSupabase) {

        articles =
          await supabaseRequest(
            "articles?select=id,status"
          );

      } else {

        articles =
          demoArticles;
      }


      const total =
        articles.length;

      const published =
        articles.filter(
          item =>
            item.status ===
            "published"
        ).length;

      const drafts =
        articles.filter(
          item =>
            item.status ===
            "draft"
        ).length;

      const pending =
        articles.filter(
          item =>
            item.status ===
            "pending"
        ).length;


      return res.json({
        success: true,
        stats: {
          total,
          published,
          drafts,
          pending
        }
      });

    } catch (error) {

      console.error(
        "ADMIN STATS:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Stats load failed."
      });
    }
  }
);


/* -------------------------------------------------------
   404 API
------------------------------------------------------- */

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found."
    });
  }
);


/* -------------------------------------------------------
   GENERAL ERROR HANDLER
------------------------------------------------------- */

app.use(
  (error, req, res, next) => {

    console.error(error);

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      success: false,
      message:
        "Internal server error."
    });
  }
);


/* -------------------------------------------------------
   START SERVER
------------------------------------------------------- */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "===================================="
    );

    console.log(
      " IMU EDITZ News Server"
    );

    console.log(
      ` Port: ${PORT}`
    );

    console.log(
      ` Database: ${
        useSupabase
          ? "Supabase"
          : "Demo Memory"
      }`
    );

    console.log(
      "===================================="
    );
  }
);
