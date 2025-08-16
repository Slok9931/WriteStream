# WriteStream 📚

A decentralized publishing platform built on Ethereum that enables writers to publish, monetize, and share articles using blockchain technology and IPFS for content storage.

## 🌟 Features

### Core Functionality
- **Decentralized Publishing**: Publish articles directly to the blockchain with IPFS content storage
- **Freemium Model**: Support for both free and paid articles
- **Smart Contract Integration**: Ethereum-based smart contracts handle all transactions and access control
- **MetaMask Integration**: Seamless wallet connection and transaction management

### Article Management
- **Rich Text Editor**: Built-in React Quill editor with full formatting support (headings, lists, bold, italic, etc.)
- **Content Storage**: Article content stored on IPFS for decentralized access
- **Metadata on Blockchain**: Article metadata (title, author, price, votes) stored immutably on Ethereum
- **Access Control**: Automatic access management for paid content

### Monetization
- **Flexible Pricing**: Authors can set custom prices in ETH for their articles
- **Instant Payments**: Direct ETH payments to authors through smart contracts
- **Tip System**: Readers can tip authors for quality content
- **Revenue Tracking**: Built-in tracking of article purchases and tips

### Social Features
- **Voting System**: Upvote/downvote articles to build community consensus
- **Author Profiles**: Author identification and article attribution
- **Article Discovery**: Browse all published articles with filtering options

### User Experience
- **Responsive Design**: Mobile-friendly interface with dark/light theme support
- **Loading States**: Comprehensive loading indicators for all operations
- **Error Handling**: Robust error handling with user-friendly messages
- **Transaction Feedback**: Real-time transaction status updates

## 🏗️ Architecture

```
WriteStream/
├── WriteStream/          # Frontend React Application
├── blockchain/           # Smart Contracts & Deployment Scripts
└── server/              # Backend API for IPFS uploads
```

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom component library with shadcn/ui
- **State Management**: React Context API
- **Routing**: React Router v6
- **Web3 Integration**: ethers.js for blockchain interactions

### Smart Contracts (Solidity)
- **Contract**: `Writestream.sol` - Main contract handling articles, payments, and access control
- **Network**: Ethereum (configurable for different networks)
- **Development**: Hardhat framework for testing and deployment

### Backend (Python FastAPI)
- **IPFS Integration**: Pinata service for content storage
- **File Upload**: RESTful API for uploading article content to IPFS
- **CORS Support**: Cross-origin resource sharing for frontend integration

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn/bun
- Python 3.8+ and pip
- MetaMask browser extension
- Ethereum wallet with test ETH

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Slok9931/WriteStream.git
cd WriteStream
```

#### 2. Frontend Setup
```bash
cd WriteStream
bun install
```

Create `.env` file:
```env
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_CONTRACT_ABI=[your_contract_abi_array]
```

#### 3. Backend Setup
```bash
cd ../server
pip install fastapi uvicorn python-multipart requests python-dotenv
```

Create `.env` file:
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
```

#### 4. Blockchain Setup
```bash
cd ../blockchain
npm install
```

Create `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
INFURA_PROJECT_ID=your_infura_project_id
```

### Deployment

#### 1. Deploy Smart Contract
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network testnet
```

#### 2. Start Backend Server
```bash
cd server
uvicorn main:app --reload
```
Backend runs on `http://localhost:8000`

#### 3. Start Frontend
```bash
cd WriteStream
bun run dev
```
Frontend runs on `http://localhost:8080`

## 📝 Usage

### For Writers
1. **Connect Wallet**: Connect your MetaMask wallet
2. **Create Article**: Use the rich text editor to write your content
3. **Set Pricing**: Choose between free or paid article (set price in ETH)
4. **Publish**: Deploy to blockchain and IPFS
5. **Earn**: Receive payments and tips directly to your wallet

### For Readers
1. **Browse Articles**: Discover articles on the main feed
2. **Read Free Content**: Access free articles immediately
3. **Purchase Articles**: Buy paid articles with ETH
4. **Engage**: Vote on articles and tip authors
5. **Track Access**: View your purchased articles

## 🔧 Smart Contract Functions

### Core Functions
- `publishArticle(title, ipfsHash, price)` - Publish new articles
- `purchaseArticle(articleId)` - Buy access to paid articles
- `tipWriter(articleId)` - Send tips to authors
- `voteArticle(articleId, isUpvote)` - Vote on articles

### View Functions
- `checkAccess(articleId, user)` - Check if user has access
- `isArticleFree(articleId)` - Check if article is free
- `getArticleVotes(articleId)` - Get vote counts
- `articles(articleId)` - Get article metadata

## 📊 Project Structure

### Frontend Components
```
src/
├── components/          # Reusable UI components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── pages/              # Main application pages
└── lib/                # Utility functions
```

### Smart Contract Structure
```
contracts/
├── Writestream.sol     # Main contract
└── interfaces/         # Contract interfaces
```

### Key Pages
- **ConnectWallet**: Wallet connection interface
- **Articles**: Main article browsing page
- **PublishArticle**: Article creation interface
- **ArticleContent**: Individual article view
- **NotFound**: 404 error page

## 🔐 Security Features

- **Access Control**: Smart contract-based permission system
- **Payment Security**: Direct ETH transfers through verified contracts
- **Content Integrity**: IPFS ensures content immutability
- **Wallet Security**: MetaMask integration for secure key management

## 🌐 Supported Networks

- Ethereum Mainnet
- Ethereum Testnets (Sepolia, Goerli)
- Local Hardhat Network
- Polygon (configurable)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🛠️ Built With

- **Frontend**: React, TypeScript, Tailwind CSS, ethers.js
- **Backend**: Python, FastAPI, IPFS/Pinata
- **Blockchain**: Solidity, Hardhat, Ethereum
- **Tools**: Vite, ESLint, PostCSS

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Review smart contract tests for usage examples

---

Built with ❤️ for the decentralized web