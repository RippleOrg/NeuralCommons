import { expect } from "chai";
import { ethers } from "hardhat";
import { DataDAO, BountyPool } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DataDAO", function () {
  let dataDAO: DataDAO;
  let owner: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let nonMember: SignerWithAddress;

  beforeEach(async function () {
    [owner, member1, member2, member3, nonMember] = await ethers.getSigners();

    const DataDAO = await ethers.getContractFactory("DataDAO");
    dataDAO = await DataDAO.deploy();
    await dataDAO.waitForDeployment();

    // Add members
    await dataDAO.addMember(member1.address, 10);
    await dataDAO.addMember(member2.address, 5);
    await dataDAO.addMember(member3.address, 7);
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await dataDAO.owner()).to.equal(owner.address);
    });

    it("Should have 0 proposals initially", async function () {
      expect(await dataDAO.proposalCount()).to.equal(0n);
    });
  });

  describe("Membership", function () {
    it("Should register members correctly", async function () {
      expect(await dataDAO.members(member1.address)).to.be.true;
      expect(await dataDAO.contributionScore(member1.address)).to.equal(10n);
    });

    it("Should not allow non-owner to add members", async function () {
      await expect(
        dataDAO.connect(member1).addMember(nonMember.address, 5)
      ).to.be.reverted;
    });
  });

  describe("propose", function () {
    it("Should allow a member to create a proposal", async function () {
      await expect(
        dataDAO
          .connect(member1)
          .propose("Update privacy budget", "QmProposalCID", 1) // ProposalType.PRIVACY_BUDGET_CHANGE = 1
      )
        .to.emit(dataDAO, "ProposalCreated")
        .withArgs(1n, member1.address, "Update privacy budget", 1n);

      expect(await dataDAO.proposalCount()).to.equal(1n);
    });

    it("Should not allow non-member to create proposal", async function () {
      await expect(
        dataDAO.connect(nonMember).propose("Bad proposal", "QmCID", 0)
      ).to.be.revertedWith("Not a member");
    });
  });

  describe("vote", function () {
    let proposalId: bigint;

    beforeEach(async function () {
      const tx = await dataDAO.connect(member1).propose("Test proposal", "QmCID", 0);
      await tx.wait();
      proposalId = 1n;
    });

    it("Should allow members to vote", async function () {
      await expect(dataDAO.connect(member1).vote(proposalId, true))
        .to.emit(dataDAO, "VoteCast")
        .withArgs(proposalId, member1.address, true);

      const proposal = await dataDAO.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(1n);
    });

    it("Should not allow double voting", async function () {
      await dataDAO.connect(member1).vote(proposalId, true);
      await expect(dataDAO.connect(member1).vote(proposalId, true)).to.be.revertedWith(
        "Already voted"
      );
    });

    it("Should not allow voting after deadline", async function () {
      await time.increase(8 * 24 * 60 * 60); // 8 days
      await expect(dataDAO.connect(member1).vote(proposalId, true)).to.be.revertedWith(
        "Voting period ended"
      );
    });
  });

  describe("execute", function () {
    let proposalId: bigint;

    beforeEach(async function () {
      const tx = await dataDAO.connect(member1).propose("Test proposal", "QmCID", 0);
      await tx.wait();
      proposalId = 1n;
    });

    it("Should execute a proposal after voting period with enough votes", async function () {
      // Cast 3 votes (quorum = 3), all for
      await dataDAO.connect(member1).vote(proposalId, true);
      await dataDAO.connect(member2).vote(proposalId, true);
      await dataDAO.connect(member3).vote(proposalId, true);

      await time.increase(8 * 24 * 60 * 60); // 8 days

      await expect(dataDAO.execute(proposalId))
        .to.emit(dataDAO, "ProposalExecuted")
        .withArgs(proposalId, true);
    });

    it("Should fail execution if quorum not met", async function () {
      await dataDAO.connect(member1).vote(proposalId, true);
      await dataDAO.connect(member2).vote(proposalId, true); // Only 2 votes < quorum of 3

      await time.increase(8 * 24 * 60 * 60);

      await expect(dataDAO.execute(proposalId))
        .to.emit(dataDAO, "ProposalExecuted")
        .withArgs(proposalId, false); // passed = false
    });

    it("Should not allow execution before voting period ends", async function () {
      await expect(dataDAO.execute(proposalId)).to.be.revertedWith(
        "Voting period not ended"
      );
    });

    it("Should not allow double execution", async function () {
      await dataDAO.connect(member1).vote(proposalId, true);
      await dataDAO.connect(member2).vote(proposalId, true);
      await dataDAO.connect(member3).vote(proposalId, true);
      await time.increase(8 * 24 * 60 * 60);

      await dataDAO.execute(proposalId);
      await expect(dataDAO.execute(proposalId)).to.be.revertedWith("Already executed");
    });
  });
});

describe("BountyPool", function () {
  let bountyPool: BountyPool;
  let dataDAO: DataDAO;
  let owner: SignerWithAddress;
  let depositor: SignerWithAddress;
  let contributor: SignerWithAddress;

  beforeEach(async function () {
    [owner, depositor, contributor] = await ethers.getSigners();

    const DataDAO = await ethers.getContractFactory("DataDAO");
    dataDAO = await DataDAO.deploy();
    await dataDAO.waitForDeployment();

    const BountyPool = await ethers.getContractFactory("BountyPool");
    bountyPool = await BountyPool.deploy();
    await bountyPool.waitForDeployment();

    await bountyPool.setDAOAddress(await dataDAO.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await bountyPool.owner()).to.equal(owner.address);
    });

    it("Should have DAO address set", async function () {
      expect(await bountyPool.daoAddress()).to.equal(await dataDAO.getAddress());
    });
  });

  describe("depositBounty", function () {
    it("Should allow depositing a bounty with ETH", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        bountyPool
          .connect(depositor)
          .depositBounty("EEG data bounty", 1, { value: amount })
      )
        .to.emit(bountyPool, "BountyDeposited")
        .withArgs(1n, depositor.address, amount, "EEG data bounty");

      expect(await bountyPool.getBountyCount()).to.equal(1n);
    });

    it("Should revert if no ETH sent", async function () {
      await expect(
        bountyPool.connect(depositor).depositBounty("Test bounty", 1, { value: 0n })
      ).to.be.revertedWith("Must deposit ETH");
    });
  });

  describe("claimBounty", function () {
    let bountyId: bigint;

    beforeEach(async function () {
      const amount = ethers.parseEther("1.0");
      await bountyPool
        .connect(depositor)
        .depositBounty("EEG data bounty", 1, { value: amount });
      bountyId = 1n;
    });

    it("Should allow a contributor to claim a bounty", async function () {
      const proofCID = "QmProofCID123";
      await expect(bountyPool.connect(contributor).claimBounty(bountyId, proofCID))
        .to.emit(bountyPool, "BountyClaimed")
        .withArgs(bountyId, contributor.address, proofCID);

      const bounty = await bountyPool.getBounty(bountyId);
      expect(bounty.claimed).to.be.true;
      expect(bounty.contributor).to.equal(contributor.address);
    });

    it("Should not allow double claiming", async function () {
      await bountyPool.connect(contributor).claimBounty(bountyId, "QmProofCID");
      await expect(
        bountyPool.connect(contributor).claimBounty(bountyId, "QmProofCID2")
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("approveClaim", function () {
    let bountyId: bigint;
    const depositAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      await bountyPool
        .connect(depositor)
        .depositBounty("EEG data bounty", 1, { value: depositAmount });
      bountyId = 1n;
      await bountyPool.connect(contributor).claimBounty(bountyId, "QmProofCID");
    });

    it("Should transfer ETH to contributor on approval", async function () {
      const balanceBefore = await ethers.provider.getBalance(contributor.address);
      await bountyPool.approveClaim(bountyId, contributor.address);
      const balanceAfter = await ethers.provider.getBalance(contributor.address);
      expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

    it("Should not allow non-DAO/owner to approve", async function () {
      await expect(
        bountyPool.connect(depositor).approveClaim(bountyId, contributor.address)
      ).to.be.revertedWith("Only DAO or owner");
    });

    it("Should not allow double approval", async function () {
      await bountyPool.approveClaim(bountyId, contributor.address);
      await expect(
        bountyPool.approveClaim(bountyId, contributor.address)
      ).to.be.revertedWith("Already approved");
    });
  });
});
