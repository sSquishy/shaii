const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "ignition", "deployments", "chain-11155111", "deployed_addresses.json");
  let deployed = {};
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

  const Marketplace = await hre.ethers.getContractFactory("BookMarketplace");
  const marketplace = await Marketplace.deploy(bookNftAddress);

  await marketplace.deployed();

  console.log("BookMarketplace deployed to:", marketplace.address);

  // write back to the same deployments JSON
  deployed["BookMarketplace"] = marketplace.address;
  try {
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
    console.log("Updated deployments file:", deploymentsPath);
  } catch (e) {
    console.warn("Failed to update deployments file:", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
