const express = require('express');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to URL to PDF converter API');
});

app.post('/api/convert', async (req, res) => {
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
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidURL(targetUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const scaleValue = scale && scale >= 10 && scale <= 200 ? scale / 100 : 1.0;
  const defaultViewport = { width: 1280, height: 800 };

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: false,
    });

    const page = await browser.newPage();
    await page.setViewport(viewport ? JSON.parse(viewport) : defaultViewport);

    const finalUrl = addHttp(targetUrl);
    await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      fullPage: true,
      margin: {
        top: `${marginTop || 0}px`,
        right: `${marginRight || 0}px`,
        bottom: `${marginBottom || 0}px`,
        left: `${marginLeft || 0}px`,
      },
      scale: scaleValue,
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    const hostname = new URL(finalUrl).hostname.replace(/^www\./, '');

    const response = {
      ConversionCost: 1,
      Files: [
        {
          FileName: `${hostname}.pdf`,
          FileExt: 'pdf',
          FileSize: pdfBuffer.length,
          FileData: pdfBuffer.toString('base64'),
        },
      ],
    };

    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating PDF:', error);

    const errorMessage =
      error instanceof puppeteer.errors.TimeoutError
        ? 'Failed to generate PDF: Page load timeout'
        : 'Failed to generate PDF: ' + error.message;

    res.status(500).json({ error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function addHttp(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    url = 'http://' + url;
  }
  return url;
}