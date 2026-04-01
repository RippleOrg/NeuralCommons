import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function waitForConfirmations() {
  const network = await ethers.provider.getNetwork();
  return network.chainId === 11155111n ? 2 : 1;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const confirmations = await waitForConfirmations();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name, `(${network.chainId})`);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy ConsentVault
  console.log("\n1. Deploying ConsentVault...");
  const ConsentVault = await ethers.getContractFactory("ConsentVault");
  const consentVault = await ConsentVault.deploy();
  await consentVault.waitForDeployment();
  await consentVault.deploymentTransaction()?.wait(confirmations);
  const consentVaultAddress = await consentVault.getAddress();
  console.log("ConsentVault deployed to:", consentVaultAddress);

  // 2. Deploy RevocationRegistry (pass ConsentVault address)
  console.log("\n2. Deploying RevocationRegistry...");
  const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
  const revocationRegistry = await RevocationRegistry.deploy();
  await revocationRegistry.waitForDeployment();
  await revocationRegistry.deploymentTransaction()?.wait(confirmations);
  const revocationRegistryAddress = await revocationRegistry.getAddress();
  console.log("RevocationRegistry deployed to:", revocationRegistryAddress);

  // Set ConsentVault in RevocationRegistry
  console.log("Setting ConsentVault in RevocationRegistry...");
  const setVaultTx = await revocationRegistry.setConsentVault(consentVaultAddress);
  await setVaultTx.wait();

  // Set RevocationRegistry in ConsentVault
  console.log("Setting RevocationRegistry in ConsentVault...");
  const setRegistryTx = await consentVault.setRevocationRegistry(revocationRegistryAddress);
  await setRegistryTx.wait();

  // 3. Deploy DataDAO
  console.log("\n3. Deploying DataDAO...");
  const DataDAO = await ethers.getContractFactory("DataDAO");
  const dataDAO = await DataDAO.deploy();
  await dataDAO.waitForDeployment();
  await dataDAO.deploymentTransaction()?.wait(confirmations);
  const dataDAOAddress = await dataDAO.getAddress();
  console.log("DataDAO deployed to:", dataDAOAddress);

  // 4. Deploy BountyPool
  console.log("\n4. Deploying BountyPool...");
  const BountyPool = await ethers.getContractFactory("BountyPool");
  const bountyPool = await BountyPool.deploy();
  await bountyPool.waitForDeployment();
  await bountyPool.deploymentTransaction()?.wait(confirmations);
  const bountyPoolAddress = await bountyPool.getAddress();
  console.log("BountyPool deployed to:", bountyPoolAddress);

  // Set DAO in BountyPool
  const setDaoTx = await bountyPool.setDAOAddress(dataDAOAddress);
  await setDaoTx.wait();

  // Save deployments
  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ConsentVault: consentVaultAddress,
      RevocationRegistry: revocationRegistryAddress,
      DataDAO: dataDAOAddress,
      BountyPool: bountyPoolAddress,
    },
  };

  const deploymentsPath = path.join(__dirname, `../deployments.${network.name}.json`);
  const defaultDeploymentsPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  fs.writeFileSync(defaultDeploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\nDeployments saved to:", deploymentsPath);
  console.log("\nDeployment summary:");
  console.log(JSON.stringify(deployments.contracts, null, 2));
  console.log("\nAdd the following to .env:");
  console.log(`VITE_CHAIN_ID=${deployments.chainId}`);
  console.log(`VITE_CONSENT_VAULT_ADDRESS=${consentVaultAddress}`);
  console.log(`VITE_REVOCATION_REGISTRY_ADDRESS=${revocationRegistryAddress}`);
  console.log(`VITE_DATA_DAO_ADDRESS=${dataDAOAddress}`);
  console.log(`VITE_BOUNTY_POOL_ADDRESS=${bountyPoolAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
