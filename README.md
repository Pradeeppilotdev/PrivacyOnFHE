# 🔐 Private Salary Comparison - FHE dApp

A complete decentralized application (dApp) that demonstrates **Fully Homomorphic Encryption (FHE)** for private salary
comparison. Users can submit their encrypted salaries and get comparison statistics without revealing their actual
amounts.

dApp link - ( https://quantumpay-gamma.vercel.app/ )

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

## 📋 Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- MetaMask wallet
- Sepolia testnet ETH

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone https://github.com/Pradeeppilotdev/PrivacyOnFHE
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

- **PrivateSalaryComparison**: `0x116cE34B5255588260c2A79168849C7091658C03`
- **Network**: Sepolia Testnet
- **Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x116cE34B5255588260c2A79168849C7091658C03)

### Key Functions

```solidity
// Submit encrypted salary
function submitSalary(
    externalEuint32 encryptedSalary,
    bytes calldata inputProof,
    string calldata role,
    string calldata experience
) external

// Remove salary entry for a role
function removeSalary(string calldata role) external

// Get encrypted statistics for a role
function getRoleStats(string calldata role)
    external view returns (euint32 sumSalary, euint32 minSalary, euint32 maxSalary, uint256 totalEntries)

// Recalculate and make min/max publicly decryptable for a role
function recalculateMinMax(string calldata role) external

// Check if a user has an active entry for a role
function hasActiveEntry(address user, string calldata role) external view returns (bool)
```

---

## 🔑 Main Smart Contract Functionality

The `PrivateSalaryComparison` contract enables privacy-preserving salary analytics using Fully Homomorphic Encryption
(FHE) on-chain. Here are the core features and logic:

- **Encrypted Salary Submission:**  
  Users submit their salary (encrypted with FHE) along with their job role and experience. The contract stores this
  encrypted data and updates role-based statistics.

- **Role-Based Encrypted Statistics:**  
  For each role, the contract maintains encrypted statistics:

  - **Sum** of all submitted salaries (encrypted)
  - **Min** and **Max** salary (encrypted, updated via `recalculateMinMax`)
  - **Total number of entries** for the role

- **Privacy-Preserving Computation:**  
  All arithmetic (sum, min, max) is performed directly on encrypted data using FHEVM. No individual salary is ever
  decrypted or exposed on-chain.

- **Public Decryption of Aggregates:**  
  Only the aggregated statistics (sum, min, max) are made publicly decryptable. The average is computed in the frontend
  after decrypting the sum and reading the count.

- **Manual Min/Max Update:**  
  To avoid expensive computation on every salary change, min and max are updated only when `recalculateMinMax(role)` is
  called (either by the user or the frontend).

- **User Experience:**
  - Users can submit, update, or remove their salary entry for a given role.
  - After each salary submission or removal, users (or the frontend) should call `recalculateMinMax` for their role to
    update public stats.
  - Anyone can view encrypted statistics and request public decryption for aggregate values.

### Privacy Model

- **No individual salary is ever decrypted on-chain.**
- **All computations are performed on encrypted data.**
- **Only aggregate statistics (sum, min, max) are made public for decryption.**
- **Average is computed in the frontend after decryption.**

---

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
- View encrypted statistics (sum, min, max, total entries)
- **Note:** Min/Max values are updated by calling `recalculateMinMax`. The frontend automatically calls this after each
  salary submission, and also provides a manual "Recalculate Min/Max" button for users.

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
