const express = require("express");
const puppeteer = require("puppeteer");
const url = require("url");

const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to URL to PDF converter API");
});

app.post("/api/convert", async (req, res) => {
  const {
    url: targetUrl,
    viewport,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    scale,
  } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  let scaleValue;
  if (scale) {
    scaleValue = parseFloat(scale) / 100;
    if (scaleValue < 0.1 || scaleValue > 2) {
      return res
        .status(400)
        .json({ error: "Scale must be between 10 and 200 percent" });
    }
  } else {
    scaleValue = 1.0; // Default scale
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    if (viewport) {
      const viewportDimensions = JSON.parse(viewport);
      await page.setViewport(viewportDimensions);
    }

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const pdfOptions = {
      format: "A4",
      printBackground: true,
      fullPage: true, // Capture the full page
      margin: {
        top: marginTop || "0px",
        right: marginRight || "0px",
        bottom: marginBottom || "0px",
        left: marginLeft || "0px",
      },
      scale: scaleValue, // Set scale based on user input
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    // Extract the hostname to use as filename
    const hostname = new URL(targetUrl).hostname.replace(/^www\./, "");

    // Create the JSON response
    const response = {
      ConversionCost: 1,
      Files: [
        {
          FileName: `${hostname}.pdf`,
          FileExt: "pdf",
          FileSize: pdfBuffer.length,
          FileData: pdfBuffer.toString("base64"),
        },
      ],
    };

    res.setHeader("Content-Type", "application/json");
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error generating PDF:", error);

    let errorMessage;
    if (error instanceof puppeteer.errors.TimeoutError) {
      errorMessage = "Failed to generate PDF: Page load timeout";
    } else {
      errorMessage = "Failed to generate PDF: " + error.message;
    }

    res.status(500).json({ error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
