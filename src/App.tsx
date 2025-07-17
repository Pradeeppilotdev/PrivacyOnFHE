import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { validateSalaryInput } from "./utils/fheUtils";
import { PrivateSalaryComparisonContract } from "./types/contract";
import "./App.css";

// Import the full contract ABI from deployment
import contractAbi from "../deployments/sepolia/PrivateSalaryComparison.json";
const CONTRACT_ABI = contractAbi.abi;
const CONTRACT_ADDRESS = "0xb823F60D53bc9a3F3c9A6CF56F902550f8F9297a"; // Final deployed contract address

declare global {
  interface Window {
    relayerSDK: any;
  }
}

function App() {
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<PrivateSalaryComparisonContract | null>(null);
  const [salary, setSalary] = useState<string>("");
  const [experience, setExperience] = useState<string>("Junior");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [hasEntry, setHasEntry] = useState<boolean>(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [isRoleDecryptionPending, setIsRoleDecryptionPending] = useState(false);
  const [rawStats, setRawStats] = useState<any | null>(null);
  const [statsRequested, setStatsRequested] = useState(false);
  const [publicDecrypted, setPublicDecrypted] = useState<{ [key: string]: string | number } | null>(null);
  const [isDecryptingPublic, setIsDecryptingPublic] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isNewRole, setIsNewRole] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Remove relayer initialization from startup - it's not needed for basic operations
  // Relayer will be initialized when needed for user decryption

  useEffect(() => {
    const checkAndInit = async () => {
      if (window.relayerSDK) {
        await window.relayerSDK.initSDK();
        setSdkReady(true);
      } else {
        setTimeout(checkAndInit, 100);
      }
    };
    void checkAndInit();
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const account = accounts[0];

        setAccount(account);
        setProvider(provider);

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider,
        ) as unknown as PrivateSalaryComparisonContract;
        setContract(contract);

        // Fetch user roles
        try {
          const roles: string[] = await (contract as unknown as ethers.Contract).getUserRoles(account);
          setUserRoles(roles);
          if (roles.length > 0) {
            setSelectedRole(roles[0]);
            setIsNewRole(false);
          } else {
            setSelectedRole("");
            setIsNewRole(true);
          }
        } catch {
          setUserRoles([]);
          setSelectedRole("");
          setIsNewRole(true);
        }

        // Check if user has an entry (with error handling)
        // We'll check hasEntry in a useEffect below based on selectedRole

        // Get total entries (with error handling)
        try {
          const total = await contract.getTotalEntries();
          setTotalEntries(Number(total));
        } catch (error) {
          console.warn("Could not get total entries:", error);
          setTotalEntries(0);
        }
      } else {
        // setMessage("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      // setMessage("Error connecting wallet");
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount("");
    setProvider(null);
    setContract(null);
    // setMessage("Wallet disconnected.");
  };

  // Helper to show a message for 5 seconds, with type
  const showUserMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 5000);
  };

  // Submit salary with FHE encryption using FHEVM SDK
  const submitSalary = async () => {
    const roleToUse = isNewRole ? selectedRole : selectedRole;
    if (!account) {
      showUserMessage("Please connect your wallet before submitting your salary.", "error");
      return;
    }
    // Validate all required fields
    const missingFields = [];
    if (!salary) missingFields.push("salary");
    if (!roleToUse) missingFields.push("job role");
    if (!experience) missingFields.push("experience level");
    if (missingFields.length === 3) {
      showUserMessage("Please fill in all the details before submitting your salary.", "error");
      return;
    } else if (missingFields.length > 0) {
      showUserMessage("Fill all fields before submitting.", "error");
      return;
    }
    if (!sdkReady) {
      showUserMessage("FHEVM SDK is still loading. Please wait and try again.", "error");
      return;
    }

    const salaryValue = parseInt(salary);
    console.log("SDK Ready:", sdkReady);
    console.log("RelayerSDK:", window.relayerSDK);
    console.log("SepoliaConfig:", window.relayerSDK?.SepoliaConfig);
    console.log("Account:", account);
    console.log("Contract Address:", CONTRACT_ADDRESS);
    console.log("Salary Value:", salaryValue);

    if (!validateSalaryInput(salaryValue)) {
      // setMessage("Please enter a valid salary (1 - 4,294,967,295)");
      return;
    }

    setLoading(true);
    try {
      const { initSDK, createInstance, SepoliaConfig } = window.relayerSDK;
      // Ensure the SDK is initialized
      await initSDK();
      // Use the SDK's default SepoliaConfig and add the network
      const config = {
        ...SepoliaConfig,
        fhePublicKeyId: "sepolia-003",
        fhePublicKeyUrl: "https://relayer.sepolia.dev.zama.ai/api/v1/public-key",
        relayer: "https://relayer.sepolia.dev.zama.ai",
        network: window.ethereum,
      };
      console.log("FHEVM config being used:", config);
      const fhevm = await createInstance(config);
      console.log("FHEVM Instance:", fhevm);

      // 2. Encrypt salary
      const encryptedInput = await fhevm
        .createEncryptedInput(CONTRACT_ADDRESS, account)
        .add32(Number(salaryValue))
        .encrypt();
      console.log("Encrypted Input:", encryptedInput);

      // 3. Submit to contract
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer!);

      if (!contractWithSigner) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const tx = await (contractWithSigner as any).submitSalary(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        roleToUse,
        experience,
      );
      await tx.wait();

      // setMessage("Salary submitted successfully!");
      setHasEntry(true);
      setTotalEntries((prev) => prev + 1);

      // Clear form
      setSalary("");
      setSelectedRole("");
      setIsNewRole(true);
      // Refetch user roles
      if (contract) {
        try {
          const roles: string[] = await (contract as unknown as ethers.Contract).getUserRoles(account);
          setUserRoles(roles);
        } catch (error) {
          console.error("Error fetching user roles after submit:", error);
        }
      }
      showUserMessage("Your encrypted salary was submitted successfully!", "success");
      try {
        const signer = await provider?.getSigner();
        const contractWithSigner = contract.connect(signer!);
        await (contractWithSigner as any).recalculateMinMax(roleToUse);
      } catch (error) {
        console.warn("Optional min/max recompute failed:", error);
      }
    } catch (error: unknown) {
      console.error("Error submitting salary:", error);
      console.error("Full error object:", error);
      let errorString = "";
      if (typeof error === "string") {
        errorString = error;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        errorString = (error as { message: string }).message;
      } else {
        errorString = JSON.stringify(error);
      }
      if (errorString.includes("execution reverted")) {
        showUserMessage(
          "Looks like this role has reached the current testnet limit for submissions. Please try with a different role or check back later!",
          "error",
        );
      } else {
        showUserMessage("Something went wrong. Please try again or check the console for details.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Example: User decryption (call this where you want to show decrypted value)
  // const handleUserDecryption = async () => {
  //   if (!contract || !account) return;
  //   const ciphertextHandle = await contract.getUserSalary(account);
  //   const signer = await provider?.getSigner();
  //   const decryptedValue = await userDecryptSalary({
  //     ciphertextHandle,
  //     contractAddress: contract.target,
  //     relayerInstance,
  //     signer,
  //   });
  //   setMessage(`Your decrypted salary: ${decryptedValue}`);
  // };

  // Remove salary entry
  const removeSalary = async () => {
    console.log("[removeSalary debug] selectedRole:", selectedRole);
    console.log("[removeSalary debug] hasEntry:", hasEntry);
    console.log("[removeSalary debug] userRoles:", userRoles);
    // Check if selectedRole matches any of the user's roles
    if (!userRoles.includes(selectedRole)) {
      showUserMessage("Selected role does not match any of your active entries. Please select a valid role.", "error");
      return;
    }
    if (!contract || !account || !selectedRole) {
      showUserMessage("No active entry found for this role.", "error");
      return;
    }

    setLoading(true);
    try {
      const signer = await provider?.getSigner();
      const contractWithSigner = contract.connect(signer!);

      if (!contractWithSigner) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const tx = await (contractWithSigner as any).removeSalary(selectedRole);
      await tx.wait();

      // setMessage("Salary entry removed successfully!");
      setHasEntry(false);
      setTotalEntries((prev) => prev - 1);
      // Refetch user roles and hasEntry after removal
      if (contract) {
        try {
          const roles: string[] = await (contract as unknown as ethers.Contract).getUserRoles(account);
          setUserRoles(roles);
          if (roles.length > 0) {
            setSelectedRole(roles[0]);
            setIsNewRole(false);
            // Also check hasEntry for the new selectedRole
            const hasEntry = await (contract as unknown as ethers.Contract).hasActiveEntry(account, roles[0]);
            setHasEntry(hasEntry);
          } else {
            setSelectedRole("");
            setIsNewRole(true);
            setHasEntry(false);
          }
        } catch (error) {
          console.error("Error fetching user roles after removal:", error);
        }
      }
      showUserMessage("Your entry was removed.", "success");
    } catch (error) {
      console.error("Error removing salary:", error);
      let errorString = "";
      if (typeof error === "string") {
        errorString = error;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        errorString = (error as { message: string }).message;
      } else {
        errorString = JSON.stringify(error);
      }
      if (errorString.includes("No active entries for role")) {
        showUserMessage("No active entry found for this role. Please select a valid role.", "error");
      } else {
        showUserMessage("Something went wrong. Please try again or check the console for details.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Get role statistics
  const getRoleStats = async () => {
    if (!contract || !(isNewRole ? selectedRole : selectedRole)) {
      // setMessage("Please enter a role to check statistics");
      return;
    }
    setStatsRequested(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const raw = await (contract as any).getRoleStats(selectedRole);
      setRawStats(raw);
      console.log("Raw getRoleStats result:", raw);
    } catch (error) {
      setRawStats(null);
      console.error("Error getting role stats:", error);
    }
  };

  // Public decrypt for sum, min, max
  const handlePublicDecrypt = async () => {
    setIsDecryptingPublic(true);
    setPublicDecrypted(null);
    try {
      if (!window.relayerSDK || !rawStats) throw new Error("Relayer SDK or raw stats not available");
      const handles = [rawStats[0], rawStats[1], rawStats[2]]; // sum, min, max
      const instance = await window.relayerSDK.createInstance(window.relayerSDK.SepoliaConfig);
      const decrypted = await instance.publicDecrypt(handles);
      // Compute average in frontend
      let average = undefined;
      if (rawStats[3] && decrypted[rawStats[0]] !== undefined) {
        const sum = Number(decrypted[rawStats[0]]);
        const count = Number(rawStats[3]);
        if (count > 0) {
          average = Math.round(sum / count);
        }
      }
      setPublicDecrypted({ ...decrypted, average });
    } catch {
      // Optionally log error
    } finally {
      setIsDecryptingPublic(false);
    }
  };

  const recomputeMinMax = async () => {
    if (!contract || !selectedRole) return;

    setLoading(true);
    try {
      const signer = await provider?.getSigner();
      const contractWithSigner = contract.connect(signer!);

      const tx = await (contractWithSigner as any).recalculateMinMax(selectedRole);
      await tx.wait();

      showUserMessage(`Min/Max recomputed for role: ${selectedRole}`, "success");
    } catch (error) {
      console.error("Error recomputing min/max:", error);
      showUserMessage("Failed to recompute min/max. Check console for details.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch decryption pending state when role changes or after requesting decryption
  useEffect(() => {
    const checkPending = async () => {
      if (!contract || !selectedRole || !account) {
        setIsRoleDecryptionPending(false);
        return;
      }
      try {
        if (!contract) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const pending = await (contract as any).isDecryptionPending(account, selectedRole);
        setIsRoleDecryptionPending(pending);
      } catch {
        setIsRoleDecryptionPending(false);
      }
    };
    void checkPending();
  }, [contract, selectedRole, account]);

  // When userRoles or selectedRole changes, check if user has an entry for selectedRole
  useEffect(() => {
    const checkHasEntry = async () => {
      if (!contract || !account || !selectedRole) {
        setHasEntry(false);
        return;
      }
      try {
        const hasEntry = await (contract as any).hasActiveEntry(account, selectedRole);
        setHasEntry(hasEntry);
      } catch (error) {
        setHasEntry(false);
      }
    };
    if (!isNewRole) {
      void checkHasEntry();
    }
  }, [contract, account, selectedRole, isNewRole]);

  // When user connects, if they have roles, default to dropdown; else, new role input
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.value;
    if (userRoles.includes(value)) {
      setSelectedRole(value);
      setIsNewRole(false);
    } else {
      setSelectedRole(value);
      setIsNewRole(true);
    }
  };

  // Helper to switch to new role input
  const handleNewRoleClick = () => {
    setSelectedRole("");
    setIsNewRole(true);
  };

  // Helper to safely stringify BigInt values
  function safeStringify(obj: any) {
    return JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
  }

  return (
    <div className="App">
      {/* Spacious, non-overlapping ZAMA watermarks */}
      {[
        { top: "8%", left: "7%", fontSize: "2.5vw", rotate: "-18deg", opacity: 0.09 }, // top left
        { top: "12%", left: "80%", fontSize: "2.5vw", rotate: "15deg", opacity: 0.09 }, // top right
        { top: "45%", left: "15%", fontSize: "2.5vw", rotate: "-10deg", opacity: 0.08 }, // left center
        { top: "50%", left: "75%", fontSize: "2.5vw", rotate: "12deg", opacity: 0.08 }, // right center
        { top: "80%", left: "10%", fontSize: "2.5vw", rotate: "-12deg", opacity: 0.09 }, // bottom left
        { top: "78%", left: "85%", fontSize: "2.5vw", rotate: "18deg", opacity: 0.09 }, // bottom right
        { top: "35%", left: "48%", fontSize: "3vw", rotate: "-8deg", opacity: 0.07 }, // center
      ].map((wm, i) => (
        <div
          key={i}
          className="zama-watermark"
          style={{
            top: wm.top,
            left: wm.left,
            fontSize: wm.fontSize,
            transform: `rotate(${wm.rotate})`,
            opacity: wm.opacity,
          }}
        >
          ZAMA
        </div>
      ))}
      {/* Matrix rain particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="matrix-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${8 + Math.random() * 4}s`,
          }}
        >
          {String.fromCharCode(0x30a0 + Math.random() * 96)}
        </div>
      ))}

      <div className="container">
        <header className="header">
          <h1>
            <span className="logo-icon">Q</span> QuantumPay: Encrypted Salary Insights
          </h1>
          <p>Next-Gen Privacy • FHE-Powered Salary Analytics</p>
        </header>

        {/* Left Panel - Main Form */}
        <div className="left-panel">
          <div className="wallet-section">
            {!account ? (
              <button onClick={connectWallet} className="connect-btn">
                CONNECT WALLET
              </button>
            ) : (
              <>
                <div className="account-info">
                  <p>
                    CONNECTED: {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="connect-btn"
                  style={{
                    marginTop: 12,
                    background: "transparent",
                    color: "#ff2222",
                    border: "2px solid #ff2222",
                    boxShadow: "0 0 8px #ff2222",
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  DISCONNECT WALLET
                </button>
              </>
            )}
          </div>

          <div className="form-section">
            <h2>SUBMIT ENCRYPTED SALARY</h2>
            <div className="form-group">
              <label>SALARY (USD):</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter your salary amount"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>JOB ROLE:</label>
              {userRoles.length > 0 && !isNewRole ? (
                <>
                  <select value={selectedRole} onChange={handleRoleChange} disabled={loading}>
                    {userRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleNewRoleClick} className="new-role-btn" disabled={loading}>
                    New Role
                  </button>
                </>
              ) : (
                <input
                  type="text"
                  value={selectedRole}
                  onChange={handleRoleChange}
                  placeholder="e.g., Software Engineer, Data Scientist"
                  disabled={loading}
                />
              )}
            </div>
            <div className="form-group">
              <label>EXPERIENCE LEVEL:</label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} disabled={loading}>
                <option value="Junior">JUNIOR (0-2 YEARS)</option>
                <option value="Mid">MID (3-5 YEARS)</option>
                <option value="Senior">SENIOR (6+ YEARS)</option>
              </select>
            </div>
            <div className="button-group">
              {!hasEntry || isNewRole ? (
                <button onClick={submitSalary} disabled={loading || !sdkReady || !selectedRole}>
                  {loading ? (
                    <>
                      <span className="loading"></span> ENCRYPTING...
                    </>
                  ) : sdkReady ? (
                    "SUBMIT SALARY"
                  ) : (
                    "Loading SDK..."
                  )}
                </button>
              ) : (
                <button onClick={removeSalary} disabled={loading} className="remove-btn">
                  {loading ? (
                    <>
                      <span className="loading"></span> REMOVING...
                    </>
                  ) : (
                    "REMOVE ENTRY"
                  )}
                </button>
              )}
              <button onClick={getRoleStats} disabled={loading || !selectedRole} className="stats-btn">
                {loading ? (
                  <>
                    <span className="loading"></span> ANALYZING...
                  </>
                ) : (
                  "GET STATISTICS"
                )}
              </button>
              <button
                onClick={recomputeMinMax}
                disabled={loading || !selectedRole}
                className="stats-btn"
                style={{
                  marginTop: 8,
                  background: "#222",
                  color: "#ffcc00",
                  border: "1px solid #ffcc00",
                }}
              >
                Recalculate Min/Max
              </button>
            </div>
            {/* User message area - now inside the form, below the buttons */}
            <div style={{ minHeight: 32, marginTop: 12 }}>
              {showMessage && (
                <div
                  style={{
                    background: "#111",
                    color: messageType === "error" ? "#ff2222" : "#00ff41",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontSize: 15,
                    border: messageType === "error" ? "1.5px solid #ff2222" : "1px solid #00ff41",
                    margin: "0 auto",
                    maxWidth: 400,
                    opacity: showMessage ? 1 : 0,
                    transition: "opacity 0.7s",
                    textAlign: "center",
                  }}
                >
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Total entries and active entry info below the form */}
          <div className="entry-info">
            <p>
              <strong>Total Entries:</strong> {totalEntries}
            </p>
            {hasEntry && <p className="has-entry">✅ Active entry detected</p>}
          </div>

          {/* Decryption pending indicator */}
          {isRoleDecryptionPending && (
            <div className="decryption-pending-box">
              <b>Decryption pending for this role.</b> Please wait for the relayer to complete the request before trying
              again.
            </div>
          )}

          {statsRequested && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  background: "#111",
                  color: "#00ff41",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  wordBreak: "break-all",
                  border: "1px solid #00ff41",
                }}
              >
                <b>Raw getRoleStats result:</b>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{safeStringify(rawStats)}</pre>
              </div>
              <button
                className="stats-btn"
                style={{ marginTop: 12, background: "#222", color: "#00ff41", border: "1px solid #00ff41" }}
                onClick={handlePublicDecrypt}
                disabled={isDecryptingPublic}
              >
                {isDecryptingPublic ? "Decrypting..." : "Public Decrypt (sum, min, max)"}
              </button>
              {publicDecrypted &&
                rawStats &&
                (() => {
                  const statsArr = Array.from(rawStats);
                  return (
                    <div
                      style={{
                        marginTop: 12,
                        background: "#222",
                        color: "#00ff41",
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #00ff41",
                      }}
                    >
                      <b>Decrypted Statistics:</b>
                      <div style={{ fontSize: 18, margin: "10px 0", color: "#00ff41" }}>
                        <b>Average Salary:</b> {publicDecrypted.average !== undefined ? publicDecrypted.average : "-"}
                      </div>
                      <div style={{ fontSize: 15, margin: "6px 0", color: "#00ff41" }}>
                        <b>Min Salary:</b> {publicDecrypted[statsArr[1]]?.toString()} <br />
                        <b>Max Salary:</b> {publicDecrypted[statsArr[2]]?.toString()}
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>

        {/* Right Panel - Info & Stats */}
        <div className="right-panel">
          <div className="info-section">
            <h3>FHE PRIVACY PROTECTION</h3>
            <ul>
              <li>Salary data is encrypted before blockchain transmission</li>
              <li>Mathematical operations performed on encrypted data</li>
              <li>Zero-knowledge salary comparisons</li>
              <li>Statistical insights without data exposure</li>
              <li>Quantum-resistant encryption algorithms</li>
            </ul>
          </div>
          <div className="contract-info">
            <h3>SMART CONTRACT DATA</h3>
            <p>
              <strong>CONTRACT:</strong> {CONTRACT_ADDRESS}
            </p>
            <p>
              <strong>NETWORK:</strong> SEPOLIA TESTNET
            </p>
            <p>
              <strong>BLOCKCHAIN:</strong> ETHEREUM L2
            </p>
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="etherscan-link"
            >
              VIEW ON ETHERSCAN
            </a>
          </div>
        </div>
      </div>

      {/* Full-width entry info bar below main content */}
      <div className="entry-info-global">
        <p>
          <strong>Total Entries:</strong> {totalEntries}
        </p>
        {hasEntry && <p className="has-entry">✅ Active entry detected</p>}
      </div>

      {/* Footer */}
      <footer className="footer-hacker">
        <span>
          Made by{" "}
          <a href="https://x.com/pradeeppilot2k5" target="_blank" rel="noopener noreferrer" className="footer-link">
            pradeeppilot
          </a>
        </span>
        <a
          href="https://github.com/Pradeeppilotdev"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-github"
        >
          <svg
            height="20"
            width="20"
            viewBox="0 0 16 16"
            fill="#00ff41"
            xmlns="http://www.w3.org/2000/svg"
            style={{ verticalAlign: "middle", marginLeft: "8px" }}
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </footer>
    </div>
  );
}

export default App;
