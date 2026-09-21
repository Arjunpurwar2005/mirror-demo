const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/demo-preview-tool';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri}`);
}

module.exports = { connectDb };
