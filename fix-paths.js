const fs = require("fs");
const path = require("path");

// Function to recursively find and fix .sol files
function fixSolFiles(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixSolFiles(filePath);
    } else if (file.endsWith(".sol")) {
      console.log(`Fixing paths in: ${filePath}`);
      let content = fs.readFileSync(filePath, "utf8");

      // Replace backslashes with forward slashes in import statements
      content = content.replace(/from "([^"]*\\)([^"]*)"/g, 'from "$1/$2"');
      content = content.replace(/import "([^"]*\\)([^"]*)"/g, 'import "$1/$2"');

      fs.writeFileSync(filePath, content);
    }
  }
}

// Fix the fhevmTemp directory
if (fs.existsSync("./fhevmTemp")) {
  console.log("Fixing Windows path issues in FHEVM generated files...");
  fixSolFiles("./fhevmTemp");
  console.log("Path fixes completed!");
} else {
  console.log("fhevmTemp directory not found. Run hardhat compile first.");
}
