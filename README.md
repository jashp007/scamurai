# 🛡️ Scamurai

A real-time fraud detection and payment monitoring system built with Node.js, Stripe, and Gun.js. Scamurai helps businesses detect and prevent fraudulent transactions by analyzing payment data, geolocation information, and behavioral patterns.

## ✨ Features

- **Real-time Payment Monitoring**: Automatically tracks and analyzes Stripe payment transactions
- **Fraud Detection**: Risk scoring and assessment for each transaction
- **Geolocation Tracking**: IP-based location verification for transaction authenticity
- **Decentralized Alerts**: Uses Gun.js for distributed fraud alert broadcasting
- **Authentication**: Secure OAuth 2.0 integration with Auth0
- **Automatic Refunds**: Configurable automatic refunds for detected fraudulent transactions
- **Dashboard Analytics**: Real-time visualization of payment data and fraud metrics

## 🏗️ Architecture

```
scamurai/
├── src/
│   ├── client/           # Express backend & client interface
│   │   ├── index.js      # Main server with Auth0 & payment routes
│   │   ├── client.js     # Gun.js peer communication
│   │   └── gun/          # Gun.js SEA encryption modules
│   ├── server/           # Core services
│   │   ├── server.js     # Gun.js relay server
│   │   └── stripe.js     # Stripe payment processing & monitoring
│   └── data/             # Transaction data storage
└── config/               # Configuration files
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or pnpm
- Stripe account with API keys
- Auth0 account for authentication

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jashp007/scamurai.git
cd scamurai
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Create a `.env` file in the root directory:
```env
STRIPE_SECRET_KEY=your_stripe_secret_key
PORT_RELAY=6001
RELAY_URL=your_ngrok_or_relay_url
LOCAL_IP=your_local_ip_address
```

4. Start the development server:
```bash
pnpm dev
# or
npm run dev
```

The server will start on `http://localhost:5050`

## 🔧 Configuration

### Auth0 Setup

Update the Auth0 configuration in `src/client/index.js`:

```javascript
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'your-secret-key',
  baseURL: 'http://localhost:5050',
  clientID: 'your-client-id',
  issuerBaseURL: 'https://your-domain.auth0.com',
};
```

### Stripe Integration

The system monitors Stripe charges in real-time. Configure your Stripe webhook URL to point to your server for production environments.

## 📡 API Endpoints

### Authentication
- `GET /` - Home route (redirects to dashboard if authenticated)
- `GET /profile` - Get authenticated user profile

### Payment Processing
- `GET /payment` - Initiates payment flow and begins monitoring
- `POST /gun-publish` - Publishes fraud data to Gun.js network

### Server Status
- `GET /status` - Gun.js relay server status and peer information

## 🔐 Security Features

- **SEA Encryption**: Gun.js Security, Encryption, & Authorization for secure data transmission
- **OAuth 2.0**: Industry-standard authentication via Auth0
- **Risk Scoring**: Stripe's built-in risk assessment integration
- **Geolocation Verification**: IP-based location checking
- **CORS Protection**: Configured allowed origins for secure API access

## 📊 How It Works

1. **Payment Initiation**: User clicks payment link
2. **IP Capture**: System captures user's IP and retrieves geolocation data
3. **Stripe Monitoring**: Polls Stripe API for new successful charges
4. **Data Analysis**: Extracts payment details, billing info, and risk scores
5. **Fraud Detection**: Analyzes transaction patterns (configurable)
6. **Alert Broadcasting**: Publishes fraud alerts to Gun.js network
7. **Automatic Response**: Optionally refunds fraudulent transactions

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Payment Processing**: Stripe API
- **Authentication**: Auth0 (express-openid-connect)
- **Decentralized Database**: Gun.js with SEA
- **Development**: Vite, Nodemon
- **Package Manager**: pnpm

## 📦 Dependencies

### Production
- `express` - Web framework
- `stripe` - Payment processing
- `gun` - Decentralized database
- `express-openid-connect` - Auth0 integration
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment configuration
- `node-fetch` - HTTP requests

### Development
- `nodemon` - Auto-restart development server
- `eslint` - Code linting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ Important Notes

- Replace hardcoded Auth0 credentials before production deployment
- Set up proper environment variables for all sensitive data
- Configure Stripe webhooks for production environments
- Implement custom fraud detection logic in `stripe.js`
- Use HTTPS in production environments

## 📄 License

ISC

## 👨‍💻 Author

**jashp007**

## 🔗 Links

- [Repository](https://github.com/jashp007/scamurai)
- [Stripe Documentation](https://stripe.com/docs/api)
- [Gun.js Documentation](https://gun.eco/docs/)
- [Auth0 Documentation](https://auth0.com/docs)

---

**Note**: This is a development project. Ensure proper security audits and compliance checks before deploying to production environments handling real payment data.
