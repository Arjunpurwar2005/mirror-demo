require('dotenv').config();

const path = require('path');
const express = require('express');

const { connectDb } = require('./utils/db');
const generateRouter = require('./routes/generate');
const previewRouter = require('./routes/preview');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use('/api/generate', generateRouter);
app.use('/preview', previewRouter);
// No auth on /admin — see routes/admin.js for the warning. Keep this
// deployment private until a login is added.
app.use('/admin', adminRouter);

async function start() {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Demo preview tool running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
