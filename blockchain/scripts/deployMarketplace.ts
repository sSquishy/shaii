import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "ignition", "deployments", "chain-11155111", "deployed_addresses.json");
  let deployed = {} as any;
  try {
    deployed = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  } catch (e) {
    console.warn("No existing deployed_addresses.json found, will proceed using env or prompt.");
  }

  const bookNftKey = "BookModule#BookNFT";
  const bookNftAddress = deployed[bookNftKey] || process.env.BOOKNFT_ADDRESS || process.env.VITE_BOOKNFT_CONTRACT;

  if (!bookNftAddress) {
    throw new Error("BookNFT address not found in ignition deployment file or env (VITE_BOOKNFT_CONTRACT). Aborting.");
  }

  console.log("Using BookNFT at:", bookNftAddress);

  // Use Hardhat ethers deployContract API (works with newer Hardhat/ethers integration)
  const marketplace = await hre.ethers.deployContract("BookMarketplace", [bookNftAddress]);
  await marketplace.waitForDeployment();
  const deployedAddress = marketplace.target || marketplace.address || marketplace.deploymentAddress || null;
  console.log("BookMarketplace deployed to:", deployedAddress || "(address not available)");

  // write back to the same deployments JSON
  deployed["BookMarketplace"] = marketplace.address;
  try {
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
    console.log("Updated deployments file:", deploymentsPath);
  } catch (e) {
    console.warn("Failed to update deployments file:", (e as Error).message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
