import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type DeploymentFile = {
  contracts: {
    ConsentVault: string;
    DataDAO: string;
  };
};

function loadDeployments(networkName: string): DeploymentFile {
  const deploymentPath = path.join(__dirname, `../deployments.${networkName}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found for network ${networkName}: ${deploymentPath}`);
  }

  return JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as DeploymentFile;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployments(network.name);

  const consentVault = await ethers.getContractAt("ConsentVault", deployment.contracts.ConsentVault, deployer);
  const dataDAO = await ethers.getContractAt("DataDAO", deployment.contracts.DataDAO, deployer);

  const storageReference = `local://bootstrap-${network.name}-${deployer.address.slice(2, 10).toLowerCase()}`;
  const datasetHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        kind: "neuralcommons-bootstrap",
        network: network.name,
        chainId: Number(network.chainId),
        owner: deployer.address.toLowerCase(),
        storageReference,
      })
    )
  );
  const neutralFlowState = ethers.keccak256(ethers.toUtf8Bytes("neutral"));
  const currentVault = await consentVault.getVault(deployer.address);
  const currentOwner = currentVault.owner ?? currentVault[0];
  const currentGrantCount = currentVault.grantCount ?? currentVault[4];

  if (currentOwner === ethers.ZeroAddress) {
    console.log("Creating bootstrap vault...");
    await (await consentVault.createVault(storageReference)).wait();
  } else {
    console.log("Vault already exists, skipping vault creation.");
  }

  const datasetCount = await consentVault.getDatasetCount(deployer.address);
  if (datasetCount === 0n) {
    console.log("Anchoring bootstrap dataset metadata...");
    await (
      await consentVault.anchorDataset(storageReference, datasetHash, 1, 1, neutralFlowState)
    ).wait();
  } else {
    console.log("Dataset anchor already exists, skipping dataset seed.");
  }

  if (currentGrantCount === 0n) {
    console.log("Creating active bootstrap grant...");
    await (
      await consentVault.grantAccess(
        deployer.address,
        [1, 3],
        [ethers.keccak256(ethers.toUtf8Bytes("dashboard_render"))],
        BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30),
        storageReference,
        ethers.keccak256(ethers.toUtf8Bytes("bootstrap-active-grant"))
      )
    ).wait();

    console.log("Creating revocable bootstrap grant...");
    const revokedGrantTx = await consentVault.grantAccess(
        deployer.address,
        [2],
        [ethers.keccak256(ethers.toUtf8Bytes("audit_history"))],
        BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14),
        storageReference,
        ethers.keccak256(ethers.toUtf8Bytes("bootstrap-revoked-grant"))
      );
    const revokedGrantReceipt = await revokedGrantTx.wait();

    const revokedGrantEvent = revokedGrantReceipt?.logs
      .map((log) => {
        try {
          return consentVault.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "GrantCreated");

    if (!revokedGrantEvent) {
      throw new Error("Unable to find GrantCreated event for the bootstrap revocation seed.");
    }

    const revokedGrantId = revokedGrantEvent.args[0];

    console.log("Revoking bootstrap audit grant...");
    await (
      await consentVault.revokeAccess(
        revokedGrantId,
        "Bootstrap lifecycle verification",
        ethers.keccak256(ethers.toUtf8Bytes("bootstrap-key-destroyed"))
      )
    ).wait();
  } else {
    console.log("Grants already exist, skipping grant seed.");
  }

  const proposalCount = await dataDAO.getProposalCount();
  if (proposalCount === 0n) {
    console.log("Submitting bootstrap governance proposal...");
    await (
      await dataDAO.propose(
        "Ratify Sepolia bootstrap state and authorize the first production governance window.",
        storageReference,
        0
      )
    ).wait();
  } else {
    console.log("Governance proposals already exist, skipping proposal seed.");
  }

  const finalVault = await consentVault.getVault(deployer.address);
  console.log("Seed summary:");
  console.log(`  owner: ${deployer.address}`);
  console.log(`  datasets: ${finalVault.datasetCount.toString()}`);
  console.log(`  grants: ${finalVault.grantCount.toString()}`);
  console.log(`  proposals: ${(await dataDAO.getProposalCount()).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });