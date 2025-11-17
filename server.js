const express = require('express');
const { PORT } = require('./config/config');
const scraperRoutes = require('./routes/scraper');

const app = express();

// Parse JSON bodies for incoming requests.
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Daddy Leads scraper backend' });
});

app.use('/v1/scraper', scraperRoutes);

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Daddy Leads scraper backend running on port ${PORT}`);
});
