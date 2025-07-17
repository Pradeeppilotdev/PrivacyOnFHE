import { ethers } from "ethers";

export interface FHEEncryptedData {
  encryptedValue: string;
  proof: string;
}

// Prepare FHE encrypted input for contract submission using Relayer SDK
export async function prepareFHEInputWithRelayer({
  value,
  contractAddress,
  userAddress,
  relayerInstance,
}: {
  value: number;
  contractAddress: string;
  userAddress: string;
  relayerInstance: any;
}): Promise<{ encryptedSalary: string; inputProof: string }> {
  // Create the encrypted input using the relayer SDK
  const input = relayerInstance.createEncryptedInput(contractAddress, userAddress);
  input.add32(value);
  const encryptedInput = await input.encrypt();
  return {
    encryptedSalary: encryptedInput.handles[0],
    inputProof: encryptedInput.inputProof,
  };
}

export function validateSalaryInput(value: number): boolean {
  return value > 0 && value <= 4294967295;
}

// --- USER DECRYPTION FLOW ---
// Based on Zama documentation: https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webapp
// 1. Retrieve the ciphertext handle from the contract (e.g., getUserSalary)
// 2. Use the relayer SDK to decrypt it for the user
export async function userDecryptSalary({
  ciphertextHandle,
  contractAddress,
  relayerInstance,
  signer,
}: {
  ciphertextHandle: string;
  contractAddress: string;
  relayerInstance: any;
  signer: ethers.Signer;
}): Promise<number> {
  try {
    // Generate a keypair for this decryption operation
    const keypair = relayerInstance.generateKeypair();

    // Prepare the handle-contract pairs
    const handleContractPairs = [
      {
        handle: ciphertextHandle,
        contractAddress: contractAddress,
      },
    ];

    // Set up the decryption request parameters
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10"; // String for consistency
    const contractAddresses = [contractAddress];

    // Create the EIP712 signature data
    const eip712 = relayerInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

    // Sign the decryption request
    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message,
    );

    // Perform the user decryption
    const result = await relayerInstance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      await signer.getAddress(),
      startTimeStamp,
      durationDays,
    );

    // Return the decrypted value
    return result[ciphertextHandle];
  } catch (error) {
    console.error("Error in user decryption:", error);
    throw new Error(`User decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ---
// Usage:
// 1. Initialize relayerInstance with RelayerSdk.createInstance({...})
// 2. Use prepareFHEInputWithRelayer for encryption
// 3. Use userDecryptSalary for user decryption
