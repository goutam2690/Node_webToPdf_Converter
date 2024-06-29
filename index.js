const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Welcome to URL to PDF converter API');
});

app.get('/convert', async (req, res) => {
  const { url, viewport, marginTop, marginRight, marginBottom, marginLeft, scale } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  let scaleValue;
  if (scale) {
    scaleValue = parseFloat(scale) / 100;
    if (scaleValue < 0.1 || scaleValue > 2) {
      return res.status(400).send('Scale must be between 10 and 200 percent');
    }
  } else {
    scaleValue = 1.0; // Default scale
  }

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    if (viewport) {
      // Set the viewport if provided
      const viewportDimensions = JSON.parse(viewport);
      await page.setViewport(viewportDimensions);
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const pdfOptions = {
      format: 'A4',
      printBackground: true, 
      fullPage: true, // Capture the full page
      margin: {
        top: marginTop || '0px',
        right: marginRight || '0px',
        bottom: marginBottom || '0px',
        left: marginLeft || '0px'
      },
      scale: scaleValue // Set scale based on user input
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=webpage.pdf',
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);

    if (error instanceof puppeteer.errors.TimeoutError) {
      res.status(500).send('Failed to generate PDF: Page load timeout');
    } else {
      res.status(500).send('Failed to generate PDF: ' + error.message);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
