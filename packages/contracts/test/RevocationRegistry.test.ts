import { expect } from "chai";
import { ethers } from "hardhat";
import { RevocationRegistry, ConsentVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RevocationRegistry", function () {
  let revocationRegistry: RevocationRegistry;
  let consentVault: ConsentVault;
  let owner: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
    revocationRegistry = await RevocationRegistry.deploy();
    await revocationRegistry.waitForDeployment();

    const ConsentVault = await ethers.getContractFactory("ConsentVault");
    consentVault = await ConsentVault.deploy();
    await consentVault.waitForDeployment();

    await revocationRegistry.setConsentVault(await consentVault.getAddress());
    await consentVault.setRevocationRegistry(await revocationRegistry.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await revocationRegistry.owner()).to.equal(owner.address);
    });

    it("Should have ConsentVault set correctly", async function () {
      expect(await revocationRegistry.consentVault()).to.equal(
        await consentVault.getAddress()
      );
    });
  });

  describe("Access Control", function () {
    it("Should only allow ConsentVault to register revocations", async function () {
      const grantId = ethers.keccak256(ethers.toUtf8Bytes("test-grant"));
      await expect(
        revocationRegistry.registerRevocation(
          grantId,
          owner.address,
          "test reason",
          ethers.keccak256(ethers.toUtf8Bytes("proof"))
        )
      ).to.be.revertedWith("Only ConsentVault can register revocations");
    });

    it("Should only allow owner to set ConsentVault", async function () {
      await expect(
        revocationRegistry.connect(other).setConsentVault(other.address)
      ).to.be.reverted;
    });
  });

  describe("isRevoked", function () {
    it("Should return false for non-existent grant", async function () {
      const grantId = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      const [isRevoked] = await revocationRegistry.isRevoked(grantId);
      expect(isRevoked).to.be.false;
    });

    it("Should return true after revocation via ConsentVault", async function () {
      // Create vault and grant first
      const EMPTY_CID = "QmTestCID123";
      const SCOPED_KEY_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 86400 * 30;

      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        other.address,
        [1],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      const grantId = event?.args[0];

      const proof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));
      await consentVault.revokeAccess(grantId, "user request", proof);

      const [isRevoked, record] = await revocationRegistry.isRevoked(grantId);
      expect(isRevoked).to.be.true;
      expect(record.owner).to.equal(owner.address);
      expect(record.reason).to.equal("user request");
      expect(record.keyDestructionProof).to.equal(proof);
    });

    it("Should emit RevocationPublished event", async function () {
      const EMPTY_CID = "QmTestCID123";
      const SCOPED_KEY_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 86400 * 30;

      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        other.address,
        [1],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      const grantId = event?.args[0];

      const proof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));
      await expect(consentVault.revokeAccess(grantId, "user request", proof))
        .to.emit(revocationRegistry, "RevocationPublished")
        .withArgs(grantId, owner.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 2), "user request");
    });
  });

  describe("Append-only registry", function () {
    it("Should track revocation count", async function () {
      const countBefore = await revocationRegistry.getRevocationCount();

      const EMPTY_CID = "QmTestCID123";
      const SCOPED_KEY_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 86400 * 30;

      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        other.address,
        [1],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      const grantId = event?.args[0];

      const proof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));
      await consentVault.revokeAccess(grantId, "test", proof);

      const countAfter = await revocationRegistry.getRevocationCount();
      expect(countAfter).to.equal(countBefore + 1n);
    });
  });
});
