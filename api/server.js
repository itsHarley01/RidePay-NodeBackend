require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const registerRoutes = require('../Routes/registerRoutes');
const accountRoutes = require('../Routes/accountRoutes');
const userRoutes = require('../Routes/userRoutes');
const loginRoutes = require('../Routes/loginRoutes');
const tariffRoutes = require('../Routes/tariffRoutes');
const sharesRoutes = require('../Routes/sharesRoutes');
const busRoutes = require('../Routes/busRoutes');
const deviceRoutes = require('../Routes/deviceRoutes');
const cardRoutes = require('../Routes/cardRoutes');
const transactionRoutes = require('../Routes/transactionRoutes');
const passengerRoutes = require('../Routes/passengerRoutes');
const topUpRoutes = require('../Routes/topUpRoutes');


const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(bodyParser.json());

// Use routes
app.use('/ridepay', registerRoutes);
app.use('/ridepay', userRoutes);
app.use('/ridepay', accountRoutes);
app.use('/ridepay', loginRoutes);
app.use('/ridepay', tariffRoutes);
app.use('/ridepay', sharesRoutes);
app.use('/ridepay', busRoutes);
app.use('/ridepay', deviceRoutes);
app.use('/ridepay', cardRoutes);
app.use('/ridepay', transactionRoutes);
app.use('/ridepay', passengerRoutes);
app.use('/ridepay', topUpRoutes);

// app.listen(3000, () => {
//   console.log('🔐 Server running on http://localhost:3000');
// });

module.exports = app;
module.exports.handler = require('serverless-http')(app); // Key line!