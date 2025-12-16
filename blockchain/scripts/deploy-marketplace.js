const hre = require("hardhat");

async function main() {
  // Replace this with your deployed BookNFT contract address
  const BOOKNFT_ADDRESS = "0x02b233Cd0B3d5A2E2e5A68285bcf9F759c1F0df2";

  console.log("Deploying BookMarketplace...");
  console.log("BookNFT Address:", BOOKNFT_ADDRESS);

  const BookMarketplace = await hre.ethers.getContractFactory(
    "BookMarketplace"
  );
  const marketplace = await BookMarketplace.deploy(BOOKNFT_ADDRESS);

  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();
  console.log("✅ BookMarketplace deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`VITE_MARKETPLACE_CONTRACT=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
