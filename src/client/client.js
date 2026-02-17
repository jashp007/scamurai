const Gun = require('gun');
const readline = require('readline');
require('gun/sea');

const NGROK_URL = process.env.RELAY_URL || 'https://83da-8-28-178-75.ngrok-free.app';
const gun = Gun({ peers: [NGROK_URL] });

const alias = process.argv[2] || 'peer';
const pass = process.argv[3] || 'password123';
const user = gun.user();

user.auth(alias, pass, (ack) => {
  if (ack.err) {
    console.log('🔐 Auth failed, creating user...');
    user.create(alias, pass, (res) => {
      if (res.err) return console.error('❌ Creation failed:', res.err);
      user.auth(alias, pass, () => console.log('✅ Created & Authenticated as', alias));
    });
  } else {
    console.log('✅ Authenticated as', alias);
  }
});

user.get('chat-room').map().on((msg) => {
  if (msg?.from && msg?.text) {
    console.log(`📥 ${msg.from}: ${msg.text}`);
  }
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => {
  user.get('chat-room').set({
    from: alias,
    text: input,
    timestamp: Date.now()
  });
  console.log('📤 Message sent!');
});