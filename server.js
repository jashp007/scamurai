const fs = require("fs");
const path = require("path");
const Gun = require("gun");
require("gun/sea");
require("gun/lib/webrtc");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env")
});
const express = require("express");
const http = require("http");
const os = require("os");

// Get local IP for better peer discovery
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost
}

const LOCAL_IP = process.env.LOCAL_IP || getLocalIP();
const app = express();
const server = http.createServer(app);

// Configure basic middleware
app.use(express.json());

// Initialize Gun with proper configuration for local network
// Remove the multicast option to fix the error
const gun = Gun({
  web: server,
  file: path.resolve(__dirname, "../../../gun-data"),
  rad: true,
  axe: true, // Enable axe for better peer discovery
  // Don't use multicast as it's causing issues
});

const keyPath = path.join(__dirname, "keypair.json");
let keypair;

// 🔐 Load or generate SEA keypair for this relay node
(async () => {
  if (fs.existsSync(keyPath)) {
    keypair = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    console.log("🔐 Loaded existing keypair");
  } else {
    keypair = await Gun.SEA.pair();
    fs.writeFileSync(keyPath, JSON.stringify(keypair, null, 2));
    console.log("🔐 Generated new keypair");
  }
  
  // Add a relay identifier message to help verify it's working
  gun.get('relay-info').put({
    type: 'relay',
    id: keypair.pub.slice(0, 8),
    timestamp: Date.now(),
    ip: LOCAL_IP
  });
})();

// 🧠 Broadcast signed fraud alert
async function broadcastFraudAlert(data) {
  if (!keypair) {
    console.log("⏳ Waiting for keypair to initialize...");
    return;
  }

  // Add timestamp if not present
  data.timestamp = data.timestamp || Date.now();
  
  try {
    const signed = await Gun.SEA.sign(data, keypair);
    signed.pub = keypair.pub;  // Attach public key so peers can verify
    gun.get("fraud-firewall").set(signed);
    console.log("📡 Signed & broadcasted fraud alert:", signed);
  } catch (err) {
    console.error("🚨 Signing failed:", err);
  }
}

// Add status endpoint to help diagnose issues
app.get("/status", (req, res) => {
  const peers = Object.keys(gun._.opt.peers || {});
  res.json({
    status: "running",
    ip: LOCAL_IP,
    peers: peers.length,
    peersList: peers,
    relayId: keypair ? keypair.pub.slice(0, 8) : 'initializing'
  });
});

app.get("/", (req, res) => res.send(`🔫 Gun.js Relay with SEA running on ${LOCAL_IP}`));

const PORT = process.env.PORT_RELAY || 6001;
const HOST = "0.0.0.0"; // Bind to all interfaces
server.listen(PORT, HOST, () => {
  console.log(`🚀 Gun relay running at http://${LOCAL_IP}:${PORT}/gun`);
  console.log(`📍 Also available at http://localhost:${PORT}/gun`);
});

// Monitor connection activity
setInterval(() => {
  const peers = Object.keys(gun._.opt.peers || {});
  console.log(`🔄 Relay status: ${peers.length} peers connected`);
}, 30000);

// Periodically broadcast heartbeat to help establish network presence
setInterval(() => {
  gun.get('relay-heartbeat').put({
    timestamp: Date.now(),
    id: keypair?.pub.slice(0, 8) || 'initializing'
  });
}, 20000);


function setupFraudListeners() {
 console.log("👂 Setting up fraud alert listeners...");
 
 // Listen for all fraud alerts
 gun.get('fraud-firewall').map().on(async (data, key) => {
   // Skip non-data entries
   if (!data || typeof data !== 'object' || key.startsWith('_') || key === 'undefined') {
     return;
   }
   
   console.log(`🔍 Received potential fraud data: ${key} ${typeof data}`);
   
   const pub = data?.pub;
   if (!pub) {
     console.log("⚠️ Received data without public key, ignoring");
     return;
   }
   
   console.log(`📥 Processing potential fraud alert from ${data.alias || pub.slice(0, 8)}`);
   
   try {
     // Verify the signature using the sender's public key
     console.log(`🔐 Attempting to verify signature with pub: ${pub.slice(0, 16)}`);
     
     const verifyModule = require('./gun-verify');
     const verified = await verifyModule.verifyFraudSignature(data, pub);
     
     console.log(`✅ VERIFIED fraud alert: ${JSON.stringify(verified)}`);
     
     // Log to audit file
     const auditLogPath = path.resolve(__dirname, '../audit-log.json');
     let logs = [];
     
     if (fs.existsSync(auditLogPath)) {
       try {
         logs = JSON.parse(fs.readFileSync(auditLogPath));
       } catch (err) {
         console.error("❌ Error reading audit log:", err.message);
         logs = [];
       }
     }
     
     // Add to log if not already present
     if (!logs.some(log => log.id === verified.id)) {
       logs.push({
         ...verified,
         receivedAt: new Date().toISOString()
       });
       
       fs.writeFileSync(auditLogPath, JSON.stringify(logs, null, 2));
       console.log(`📝 Added new fraud alert to audit log: ${verified.id}`);
     } else {
       console.log(`ℹ️ Fraud alert already in audit log: ${verified.id}`);
     }
   } catch (err) {
     console.warn(`❌ Invalid or tampered fraud alert ignored: ${err.message}`);
   }
 });
 
 // Also listen specifically for the latest fraud alerts
 gun.get('fraud-latest').on((data) => {
   if (data && data.id && data.timestamp && Date.now() - data.timestamp < 60000) {
     console.log(`🔔 New fraud alert notification: ${data.id} from ${data.publisher || 'unknown'}`);
   }
 });
}

// Call this function after initializing Gun and keypair
setupFraudListeners();


// Set up enhanced monitoring
function enhancedNetworkMonitor() {
  // Initial connection check
  console.log("🔄 Starting enhanced network monitoring...");
  
  // Track message counts to verify data flow
  let messageStats = {
    sent: 0,
    received: 0,
    lastSent: null,
    lastReceived: null
  };
  
  // Monitor connected peers with more detail
  setInterval(() => {
    const peers = Object.keys(gun._.opt.peers || {});
    console.log(`🌐 Network status: ${peers.length} peers connected`);
    
    if (peers.length > 0) {
      console.log(`🔗 Connected to: ${peers.join(', ')}`);
    } else {
      console.log("🔍 No peers connected. Checking connection...");
    }
    
    // Report message stats
    console.log(`📊 Network activity: Sent ${messageStats.sent}, Received ${messageStats.received}`);
    if (messageStats.lastSent) {
      console.log(`📤 Last sent: ${new Date(messageStats.lastSent).toISOString()}`);
    }
    if (messageStats.lastReceived) {
      console.log(`📥 Last received: ${new Date(messageStats.lastReceived).toISOString()}`);
    }
  }, 10000);
  
  // Subscribe to fraud-firewall to track messages
  gun.get('fraud-firewall').map().on((data, key) => {
    if (!key.startsWith('_') && key !== 'undefined' && data) {
      messageStats.received++;
      messageStats.lastReceived = Date.now();
      console.log(`📩 Data received on fraud-firewall from: ${data.alias || data.pub?.slice(0, 8) || 'unknown'}`);
    }
  });
  
  // Track outgoing messages
  const originalPut = gun.put;
  gun.put = function(...args) {
    messageStats.sent++;
    messageStats.lastSent = Date.now();
    return originalPut.apply(this, args);
  };
  
  // Listen for pings for connectivity testing
  gun.get('ping-test').on((data) => {
    if (data && data.timestamp && Date.now() - data.timestamp < 30000) {
      console.log(`🏓 Received ping from: ${data.sender || 'unknown'}`);
      
      // Reply to confirm two-way communication
      gun.get('ping-response').put({
        timestamp: Date.now(),
        respondingTo: data.timestamp,
        sender: 'relay-node',
        type: 'pong'
      });
    }
  });
}

// Initialize all the components
(async () => {
  console.log("🚀 Initializing server components...");
  
  // Start enhanced network monitoring
  enhancedNetworkMonitor();
  
  // Setup fraud alert listeners
  setupFraudListeners();
  
  // Setup handshake responder
  setupHandshakeResponder();
  
  console.log("✅ Server initialization complete!");
})();

function setupHandshakeResponder() {
  console.log("🤝 Setting up handshake responder");
  
  // Listen for direct handshake requests
  gun.get('handshake').map().on((data, key) => {
    if (data && data.type === 'request' && data.timestamp && Date.now() - data.timestamp < 10000) {
      console.log(`🤝 Received handshake request: ${key} from ${data.from || 'unknown'}`);
      
      // Respond to the handshake
      gun.get('handshake').get(key).put({
        type: 'response',
        timestamp: Date.now(),
        from: 'relay-node',
        pub: keypair.pub
      });
    }
  });
  
  // Also listen for relay commands
  gun.get('relay-command').on((data) => {
    if (data && data.command === 'respond-handshake' && data.id && data.timestamp && 
        Date.now() - data.timestamp < 10000) {
      console.log(`🤝 Received relay command to respond to handshake: ${data.id}`);
      
      // Send a response to the handshake
      gun.get('handshake').get(data.id).put({
        type: 'response',
        timestamp: Date.now(),
        from: 'relay-node',
        pub: keypair.pub
      });
    }
  });
}

module.exports = { broadcastFraudAlert, keypair, gun };