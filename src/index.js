"use strict";

const express = require("express");
const qs = require("qs");
const { URL } = require("url");
const contentDisposition = require("content-disposition");
const createRenderer = require("./renderer");

const port = process.env.PORT || 3000;

const app = express();

// Configure.
app.set("query parser", (s) => qs.parse(s, { allowDots: true }));
app.disable("x-powered-by");

// Render url.
app.use(async (req, res, next) => {
  let { url, type, filename, ...options } = req.query;

  if (!url) {
    return res
      .status(400)
      .send("Search with url parameter. For example, ?url=http://yourdomain");
  }

  if (!url.includes("://")) {
    url = `http://${url}`;
  }

  const renderer = await createRenderer();

  try {
    switch (type) {
      case "pdf":
        const urlObj = new URL(url);
        if (!filename) {
          filename = urlObj.hostname;
          if (urlObj.pathname !== "/") {
            filename = urlObj.pathname.split("/").pop();
            if (filename === "") filename = urlObj.pathname.replace(/\//g, "");
            const extDotPosition = filename.lastIndexOf(".");
            if (extDotPosition > 0)
              filename = filename.substring(0, extDotPosition);
          }
        }
        if (!filename.toLowerCase().endsWith(".pdf")) {
          filename += ".pdf";
        }
        const { contentDispositionType, ...pdfOptions } = options;
        const pdf = await renderer.pdf(url, pdfOptions);
        res
          .set({
            "Content-Type": "application/pdf",
            "Content-Length": pdf.length,
            "Content-Disposition": contentDisposition(filename, {
              type: contentDispositionType || "attachment",
            }),
          })
          .send(pdf);
        break;

      case "screenshot":
        const { screenshotType, buffer } = await renderer.screenshot(
          url,
          options
        );
        res
          .set({
            "Content-Type": `image/${(screenshotType || 'png')}`,
            "Content-Length": buffer.length,
          })
          .send(buffer);
        break;

      default:
        const html = await renderer.html(url, options);
        res.status(200).send(html);
    }
  } catch (e) {
    next(e);
  } finally {
    await renderer.destroy()
  }
});

// Error page.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Oops, An expected error seems to have occurred.");
});

// Start server.
app.listen(port, () => {
  console.info(`Listen port on ${port}.`);
});

// Terminate process
process.on("SIGINT", () => {
  process.exit(0);
});
