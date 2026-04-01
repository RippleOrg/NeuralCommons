// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DataDAO is Ownable, ReentrancyGuard {
    enum ProposalType {
        MODEL_UPDATE,
        PRIVACY_BUDGET_CHANGE,
        GRANTEE_WHITELIST,
        BOUNTY_ALLOCATION
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        string ipfsCID;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        ProposalType proposalType;
    }

    uint256 public proposalCount;
    uint256 public constant QUORUM = 3;
    uint256 public constant VOTING_PERIOD = 7 days;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public contributionScore;
    mapping(address => bool) public members;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        ProposalType proposalType
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    event MemberAdded(address indexed member, uint256 score);

    modifier onlyMember() {
        require(members[msg.sender] || contributionScore[msg.sender] > 0, "Not a member");
        _;
    }

    constructor() Ownable(msg.sender) {
        members[msg.sender] = true;
        contributionScore[msg.sender] = 1;
        emit MemberAdded(msg.sender, 1);
    }

    function addMember(address member, uint256 score) external onlyOwner {
        members[member] = true;
        contributionScore[member] = score;
        emit MemberAdded(member, score);
    }

    function updateContributionScore(address member, uint256 score) external onlyOwner {
        contributionScore[member] = score;
        if (score > 0) {
            members[member] = true;
        }
    }

    function propose(
        string calldata description,
        string calldata ipfsCID,
        ProposalType proposalType
    ) external onlyMember returns (uint256 proposalId) {
        proposalId = ++proposalCount;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            ipfsCID: ipfsCID,
            forVotes: 0,
            againstVotes: 0,
            deadline: block.timestamp + VOTING_PERIOD,
            executed: false,
            proposalType: proposalType
        });

        emit ProposalCreated(proposalId, msg.sender, description, proposalType);
    }

    function vote(uint256 proposalId, bool support) external onlyMember {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp < proposal.deadline, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes++;
        } else {
            proposal.againstVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.deadline, "Voting period not ended");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        bool passed = totalVotes >= QUORUM && proposal.forVotes * 100 / totalVotes > 50;

        emit ProposalExecuted(proposalId, passed);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}
