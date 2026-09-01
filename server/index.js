const express = require('express');
const cors = require('cors');

// Import our API routes
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());

// Tell the server to use our routes with the prefix /api/v1
app.use('/api/v1', apiRoutes);

// A simple health check to see if the server is alive
app.get('/', (req, res) => {
  res.send('Antarctic Navigation API is running');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});