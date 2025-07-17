# 🔐 Private Salary Comparison - FHE dApp

A complete decentralized application (dApp) that demonstrates **Fully Homomorphic Encryption (FHE)** for private salary
comparison. Users can submit their encrypted salaries and get comparison statistics without revealing their actual
amounts.

## 🌟 Real-World Use Case

This dApp solves a real privacy problem: **salary transparency without compromising individual privacy**. Users can:

- Submit encrypted salary data
- Compare their salary with others in the same role
- Get statistical insights (average, min, max) without revealing actual amounts
- Maintain complete privacy of their salary information

## 🚀 Features

### Smart Contract Features

- ✅ **FHE Integration**: Uses Zama's FHEVM for encrypted computations
- ✅ **Private Salary Submission**: Encrypted salary storage
- ✅ **Role-based Statistics**: Compare salaries within job roles
- ✅ **Experience Level Filtering**: Junior, Mid, Senior categories
- ✅ **Privacy Protection**: No salary amounts are ever decrypted on-chain

### Frontend Features

- ✅ **Modern UI**: Beautiful, responsive React interface
- ✅ **Wallet Integration**: MetaMask connection
- ✅ **Real-time Updates**: Live contract interaction
- ✅ **User-friendly**: Intuitive form and feedback system
- ✅ **Mobile Responsive**: Works on all devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  FHEVM Contract │    │   Sepolia Testnet│
│                 │    │                 │    │                 │
│ • Wallet Connect│◄──►│ • Encrypted Data│◄──►│ • Blockchain    │
│ • Form Interface│    │ • FHE Operations│    │ • Gas Fees      │
│ • Real-time UI  │    │ • Statistics    │    │ • Transactions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Improvements Inspired by CoinSweeper

This project incorporates best practices from the [CoinSweeper repository](https://github.com/liolikus/coinsweeper), a
successful Zama FHE dApp:

### ✅ Enhanced CLI Tools

- **Comprehensive Task System**: Full CLI interaction with the contract
- **Testing Utilities**: Easy contract testing and debugging
- **User-Friendly Commands**: Simple commands for complex operations

### ✅ Better FHE Configuration

- **Proper ZamaConfig**: Dedicated configuration for Sepolia network
- **SepoliaConfig Inheritance**: Clean contract structure
- **Oracle Integration**: Proper decryption oracle setup

### ✅ Improved Error Handling

- **Robust Error Messages**: Clear error feedback
- **Input Validation**: Comprehensive validation patterns
- **Graceful Failures**: Better user experience

### ✅ Enhanced Documentation

- **CLI Tutorial**: Step-by-step interaction guide
- **Best Practices**: Industry-standard patterns
- **Comprehensive Examples**: Real-world usage scenarios

## 📋 Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- MetaMask wallet
- Sepolia testnet ETH

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd fhevmcontract
npm install
```

### 2. Environment Setup

```bash
# Set up your wallet mnemonic
npx hardhat vars set MNEMONIC

# Set up Infura API key
npx hardhat vars set INFURA_API_KEY

# Set up Etherscan API key (optional)
npx hardhat vars set ETHERSCAN_API_KEY
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Deploy to Sepolia

```bash
npx hardhat --network sepolia deploy --tags PrivateSalaryComparison
```

### 5. Start Frontend

```bash
npm run dev
```

The dApp will be available at `http://localhost:3000`

## 🔧 Contract Details

### Deployed Contracts

- **PrivateSalaryComparison**: `0x61B2a99d13482B202f7B7f5A0a25A2BC7e1976B3`
- **Network**: Sepolia Testnet
- **Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x61B2a99d13482B202f7B7f5A0a25A2BC7e1976B3)

### Key Functions

```solidity
// Submit encrypted salary
function submitSalary(
    externalEuint32 encryptedSalary,
    bytes calldata inputProof,
    string calldata role,
    string calldata experience
) external

// Get role statistics (encrypted)
function getRoleStats(string calldata role)
    external view returns (euint32, euint32, euint32, uint256)

// Check if user has entry
function hasActiveEntry(address user) external view returns (bool)
```

## 🎯 How FHE Works in This dApp

### 1. **Client-Side Encryption**

```javascript
// User enters salary: $75,000
const salary = 75000;

// FHE encryption happens client-side
const encryptedSalary = await fhevm.encrypt(salary);
```

### 2. **Encrypted Storage**

```solidity
// Contract stores encrypted value
userSalaries[msg.sender] = SalaryEntry({
    encryptedSalary: salary, // This is encrypted!
    role: "Software Engineer",
    experience: "Senior",
    timestamp: block.timestamp,
    isActive: true
});
```

### 3. **Encrypted Computations**

```solidity
// Compare encrypted salaries without decryption
euint32 currentMin = FHE.select(
    FHE.lt(newSalary, stats.minSalary),
    newSalary,
    stats.minSalary
);
```

### 4. **Privacy Preserved**

- ✅ No salary amounts are ever decrypted on-chain
- ✅ Comparisons happen on encrypted data
- ✅ Only the user can decrypt their own data
- ✅ Statistical insights without individual exposure

## 🎨 Frontend Features

### Modern UI Components

- **Gradient Background**: Beautiful visual design
- **Glass Morphism**: Modern card-based layout
- **Responsive Design**: Works on mobile and desktop
- **Interactive Elements**: Hover effects and animations

### User Experience

- **Wallet Connection**: One-click MetaMask integration
- **Form Validation**: Real-time input validation
- **Loading States**: Clear feedback during transactions
- **Success/Error Messages**: User-friendly notifications

## 🔒 Privacy & Security

### FHE Benefits

- **Zero-Knowledge**: No salary amounts revealed
- **Computational Privacy**: Operations on encrypted data
- **User Control**: Only users can decrypt their data
- **Statistical Insights**: Get market data without exposure

### Security Features

- **Input Validation**: Prevents malicious inputs
- **Access Control**: Only authorized operations
- **Event Logging**: Transparent transaction history
- **Gas Optimization**: Efficient contract operations

## 🧪 Testing & CLI Tools

### Smart Contract Tests

```bash
npx hardhat test
```

### CLI Tasks (Inspired by CoinSweeper)

Our project includes comprehensive CLI tasks for testing and interacting with the contract:

#### Get Contract Address

```bash
npx hardhat --network sepolia task:address
```

#### Submit a Salary Entry

```bash
npx hardhat --network sepolia task:submit-salary --value 75000 --role "Software Engineer" --experience "Mid"
```

#### Get Role Statistics

```bash
npx hardhat --network sepolia task:get-role-stats --role "Software Engineer"
```

#### Request Decryption

```bash
npx hardhat --network sepolia task:request-decryption --role "Software Engineer"
```

#### Check Decrypted Average

```bash
npx hardhat --network sepolia task:get-decrypted-average --role "Software Engineer"
```

#### Get Total Entries

```bash
npx hardhat --network sepolia task:get-total-entries
```

#### Check User Entry

```bash
npx hardhat --network sepolia task:has-entry
```

### Frontend Testing

```bash
npm run build
npm run preview
```

## 📊 Demo Walkthrough

### 1. **Connect Wallet**

- Click "Connect Wallet" button
- Approve MetaMask connection
- View connected account address

### 2. **Submit Salary**

- Enter your salary amount
- Select job role and experience level
- Click "Submit Salary" (encrypted)
- Confirm transaction in MetaMask

### 3. **View Statistics**

- Enter a job role to check
- Click "Get Role Statistics"
- View encrypted statistics (average, min, max)

### 4. **Privacy Verification**

- Check Etherscan transaction
- Notice: No salary amounts visible
- Only encrypted data on blockchain

## 🚀 Deployment

### Production Deployment

```bash
# Build frontend
npm run build

# Deploy to your preferred hosting
# (Vercel, Netlify, AWS, etc.)
```

### Contract Verification

```bash
npx hardhat --network sepolia etherscan-verify
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Zama**: For FHEVM and technical guidance
- **Hardhat**: For the development framework
- **Ethers.js**: For blockchain interaction
- **React**: For the frontend framework

## 📞 Support

For questions or issues:

- Create an issue in this repository
- Check the [Zama FHEVM documentation](https://docs.zama.ai/)
- Review the [Hardhat documentation](https://hardhat.org/)

---

**🔐 Built with FHE for a more private future**
