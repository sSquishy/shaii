require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const deploymentsPath = path.join(__dirname, '..', 'ignition', 'deployments', 'chain-11155111', 'deployed_addresses.json');
  let deployed = {};
  try {
    deployed = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  } catch (e) {
    console.warn('No existing deployed_addresses.json found, will proceed using env or prompt.');
  }

  const bookNftKey = 'BookModule#BookNFT';
  // Prefer explicit env override, then ignition deployments, then env var used by frontend
  const bookNftAddress = process.env.BOOKNFT_ADDRESS || deployed[bookNftKey] || process.env.VITE_BOOKNFT_CONTRACT;

  if (!bookNftAddress) {
    throw new Error('BookNFT address not found in ignition deployment file or env (VITE_BOOKNFT_CONTRACT). Aborting.');
  }

  const rpc = process.env.SEPOLIA_RPC_URL;
  const pk = process.env.SEPOLIA_PRIVATE_KEY;
  if (!rpc || !pk) {
    throw new Error('Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in env');
  }

  console.log('Using BookNFT at:', bookNftAddress);
  console.log('Connecting to RPC:', rpc);

  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'BookMarketplace.sol', 'BookMarketplace.json');
  const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log('Deploying BookMarketplace...');
  const contract = await factory.deploy(bookNftAddress);
  await contract.waitForDeployment();
  const deployedAddr = contract.target || contract.address;
  console.log('BookMarketplace deployed to:', deployedAddr);

  deployed['BookMarketplace'] = contract.address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log('Updated deployments file:', deploymentsPath);
}

main().catch(err => { console.error(err); process.exit(1); });
