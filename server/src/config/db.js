const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing. Copy server/.env.example to server/.env and fill it in.');
    process.exit(1);
  }
  // Some local/router DNS servers refuse the SRV lookups that mongodb+srv:// needs
  // (error: querySrv ECONNREFUSED). Fall back to public DNS for those.
  if (uri.startsWith('mongodb+srv://')) {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected:', mongoose.connection.host + '/' + mongoose.connection.name);
}

module.exports = connectDB;
