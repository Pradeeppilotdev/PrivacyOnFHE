import { prepareFHEInput, validateSalaryInput } from "./fheUtils";

// Test the FHE utilities
export function testFHEUtils() {
  console.log("Testing FHE utilities...");

  // Test validation
  console.log("Valid salary 50000:", validateSalaryInput(50000));
  console.log("Invalid salary 0:", validateSalaryInput(0));
  console.log("Invalid salary too large:", validateSalaryInput(5000000000));

  // Test FHE preparation
  const fheInput = prepareFHEInput(75000);
  console.log("FHE Input for 75000:", fheInput);

  return fheInput;
}
