import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact with PrivateSalaryComparison
 * ===========================================================
 *
 * 1. Deploy the contract:
 *    npx hardhat --network sepolia deploy --tags PrivateSalaryComparison
 *
 * 2. Submit a salary:
 *    npx hardhat --network sepolia task:submit-salary --address <CONTRACT_ADDRESS> --value 75000 --role "Software Engineer" --experience "Mid"
 *
 * 3. Get role statistics:
 *    npx hardhat --network sepolia task:get-role-stats --address <CONTRACT_ADDRESS> --role "Software Engineer"
 *
 * 4. Request decryption:
 *    npx hardhat --network sepolia task:request-decryption --address <CONTRACT_ADDRESS> --role "Software Engineer"
 *
 * 5. Check decrypted average:
 *    npx hardhat --network sepolia task:get-decrypted-average --address <CONTRACT_ADDRESS> --role "Software Engineer"
 */

/**
 * Get the contract address
 */
task("task:address", "Prints the PrivateSalaryComparison address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;
  const privateSalaryComparison = await deployments.get("PrivateSalaryComparison");
  console.log("PrivateSalaryComparison address is " + privateSalaryComparison.address);
});

/**
 * Submit a salary entry
 */
task("task:submit-salary", "Submit an encrypted salary entry")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addParam("value", "The salary value to submit")
  .addParam("role", "The job role")
  .addParam("experience", "Experience level (Junior, Mid, Senior)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Argument --value must be a positive integer`);
    }

    // Encrypt the salary value
    const encryptedValue = await fhevm.createEncryptedInput(contractAddress, signers[0].address).add32(value).encrypt();

    const tx = await contract
      .connect(signers[0])
      .submitSalary(encryptedValue.handles[0], encryptedValue.inputProof, taskArguments.role, taskArguments.experience);

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Salary submitted successfully!`);
  });

/**
 * Get role statistics
 */
task("task:get-role-stats", "Get encrypted statistics for a role")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addParam("role", "The job role to check")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    try {
      const stats = await contract.getRoleStats(taskArguments.role);
      console.log(`Role: ${taskArguments.role}`);
      console.log(`Average Salary (encrypted): ${stats[0]}`);
      console.log(`Min Salary (encrypted): ${stats[1]}`);
      console.log(`Max Salary (encrypted): ${stats[2]}`);
      console.log(`Total Entries: ${stats[3]}`);
      console.log(`\nNote: Encrypted values cannot be displayed as plaintext due to FHE privacy.`);
    } catch (error) {
      console.error("Error getting role stats:", error);
    }
  });

/**
 * Request decryption of average salary
 */
task("task:request-decryption", "Request decryption of average salary for a role")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addParam("role", "The job role to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    try {
      const tx = await contract.connect(signers[0]).requestAverageDecryption(taskArguments.role);

      console.log(`Wait for tx:${tx.hash}...`);
      const receipt = await tx.wait();
      console.log(`tx:${tx.hash} status=${receipt?.status}`);
      console.log(`Decryption requested for role: ${taskArguments.role}`);
      console.log(
        `Check the result later using: npx hardhat --network sepolia task:get-decrypted-average --address ${contractAddress} --role "${taskArguments.role}"`,
      );
    } catch (error) {
      console.error("Error requesting decryption:", error);
    }
  });

/**
 * Get decrypted average salary
 */
task("task:get-decrypted-average", "Get the decrypted average salary for a role")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addParam("role", "The job role to check")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    try {
      const decryptedAverage = await contract.decryptedAverages(taskArguments.role);
      if (decryptedAverage === 0n) {
        console.log(`No decrypted average available for role: ${taskArguments.role}`);
        console.log(
          `Make sure to request decryption first using: npx hardhat --network sepolia task:request-decryption --address ${contractAddress} --role "${taskArguments.role}"`,
        );
      } else {
        console.log(`Decrypted average salary for ${taskArguments.role}: $${decryptedAverage}`);
      }
    } catch (error) {
      console.error("Error getting decrypted average:", error);
    }
  });

/**
 * Get total entries
 */
task("task:get-total-entries", "Get the total number of salary entries")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    try {
      const totalEntries = await contract.getTotalEntries();
      console.log(`Total salary entries: ${totalEntries}`);
    } catch (error) {
      console.error("Error getting total entries:", error);
    }
  });

/**
 * Check if user has an entry
 */
task("task:has-entry", "Check if a user has an active salary entry")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addOptionalParam("user", "User address to check (defaults to deployer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractAddress = taskArguments.address || (await deployments.get("PrivateSalaryComparison")).address;
    console.log(`PrivateSalaryComparison: ${contractAddress}`);

    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;
    const contract = await ethers.getContractAt("PrivateSalaryComparison", contractAddress);

    try {
      const hasEntry = await contract.hasActiveEntry(userAddress);
      console.log(`User ${userAddress} has active entry: ${hasEntry}`);

      if (hasEntry) {
        const userInfo = await contract.getUserInfo(userAddress);
        console.log(`Role: ${userInfo[0]}`);
        console.log(`Experience: ${userInfo[1]}`);
        console.log(`Timestamp: ${new Date(Number(userInfo[2]) * 1000).toLocaleString()}`);
      }
    } catch (error) {
      console.error("Error checking user entry:", error);
    }
  });
