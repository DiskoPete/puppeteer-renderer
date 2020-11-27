"use strict";

const puppeteer = require("puppeteer");
const waitForAnimations = require("./wait-for-animations");

class Renderer {
  constructor(browser) {
    this.browser = browser;
  }

  async html(url, options = {}) {
    const { timeout, waitUntil, credentials } = options;
    const page = await this.createPage(url, { timeout, waitUntil, credentials });
    return await page.content();
  }

  async pdf(url, options = {}) {
    const {
      timeout,
      waitUntil,
      credentials,
      emulateMedia,
      ...extraOptions
    } = options;
    const page = await this.createPage(url, {
      timeout,
      waitUntil,
      credentials,
      emulateMedia: emulateMedia || "print",
    });

    const {
      scale = 1.0,
      displayHeaderFooter,
      printBackground,
      landscape,
    } = extraOptions;
    return await page.pdf({
      ...extraOptions,
      scale: Number(scale),
      displayHeaderFooter: displayHeaderFooter === "true",
      printBackground: printBackground === "true",
      landscape: landscape === "true",
    });
  }

  async screenshot(url, options = {}) {
    const { timeout, waitUntil, credentials, ...extraOptions } = options;
    const page = await this.createPage(url, { timeout, waitUntil, credentials });
    page.setViewport({
      width: Number(extraOptions.width || 800),
      height: Number(extraOptions.height || 600),
    });

    const {
      fullPage,
      omitBackground,
      screenshotType,
      quality,
      ...restOptions
    } = extraOptions;
    let screenshotOptions = {
      ...restOptions,
      type: screenshotType || "png",
      quality:
        Number(quality) ||
        (screenshotType === undefined || screenshotType === "png" ? 0 : 100),
      fullPage: fullPage === "true",
      omitBackground: omitBackground === "true",
    };

    const animationTimeout = Number(options.animationTimeout || 0);
    if (animationTimeout > 0) {
      await waitForAnimations(page, screenshotOptions, animationTimeout);
    }

    return {
      screenshotType,
      buffer: await page.screenshot(screenshotOptions),
    };
  }

  async createPage(url, options = {}) {
    const { timeout, waitUntil, credentials, emulateMedia } = options;
    const page = await this.browser.newPage();

    page.on('error', (error) => {
      console.trace(error);
    });

    if (emulateMedia) {
      await page.emulateMedia(emulateMedia);
    }

    if (credentials) {
      await page.authenticate(credentials);
    }

    await page.goto(url, {
      timeout: Number(timeout) || 30 * 1000,
      waitUntil: waitUntil || "networkidle2",
    });
    return page;
  }

  destroy() {
    return this.browser.close();
  }
}

async function create() {
  const browser = await puppeteer.launch(
    {
      ignoreHTTPSErrors: !!process.env.IGNORE_HTTPS_ERRORS,
      args: ['--no-sandbox']
    }
  );
  return new Renderer(browser);
}

module.exports = create;
