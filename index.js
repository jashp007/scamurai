const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const { findAndProcessNewCharge } = require('./stripe/stripe');
require('dotenv').config();
const { publishFraud } = require('./gun/gunsea');

const cors = require('cors');  // Add this import
const { auth } = require('express-openid-connect');
const app = express();
const PORT = 5050;


app.use(express.json());


// CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:9000",
        "http://localhost:8080",
        "https://dev-nyglezhgb0zctxph.us.auth0.com" // Auth0 callback origin
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


// Auth0 configuration
const config = {
  authRequired: false,  // Change to true if you want login to be required
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',  // Use a real secret
  baseURL: `http://localhost:${PORT}`,
  clientID: 'HgvOINEf1vwQu8IySdH0vOtvE6hTFLRE',
  issuerBaseURL: 'https://dev-nyglezhgb0zctxph.us.auth0.com',
};



let capturedIp = null;
let geoInfo = null;

app.use(auth(config));

// Routes
app.get("/", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    // Redirect to the frontend app's landing page if authenticated
    return res.redirect("http://localhost:5173/dashboard");
  }
  res.redirect("http://localhost:5173/");
});
const { requiresAuth } = require('express-openid-connect');

app.get('/profile', (req, res) => {
  if (req.oidc && req.oidc.isAuthenticated()) {
    res.json(req.oidc.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});
app.get('/payment', async (req, res) => {
  capturedIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '8.8.8.8';
  if (capturedIp === '::1' || capturedIp === '127.0.0.1') capturedIp = '8.8.8.8';

  try {
    const geoRes = await fetch(`http://ip-api.com/json/${capturedIp}`);
    geoInfo = await geoRes.json();
  } catch {
    geoInfo = {};
  }

  const startTime = Math.floor(Date.now() / 1000);
  findAndProcessNewCharge(startTime, capturedIp, geoInfo);

  res.redirect('https://buy.stripe.com/test_aEU4go4XjaBN90Y6oo');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});



app.post('/gun-publish', async (req, res) => {
  const data = req.body;

  // Map transactionID to id
  data.id = data.id || data.transactionID;

  if (!data?.id || !data?.amount) {
    return res.status(400).json({ error: 'Missing required fraud data' });
  }

  try {
    data.createdAt = data.createdAt || new Date().toISOString();
    data.timestamp = data.timestamp || Date.now();

    await publishFraud(data); // from gunsea.js
    return res.json({ status: 'published', id: data.id });
  } catch (err) {
    console.error('❌ Error publishing fraud alert:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add this route for quick inspection
app.get('/debug/:id', (req, res) => {
  const id = req.params.id;

  gun.get('fraud-firewall').get(id).once(data => {
    if (!data) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(data);
  });
});