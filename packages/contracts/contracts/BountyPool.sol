// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BountyPool is Ownable, ReentrancyGuard {
    struct Bounty {
        uint256 id;
        address depositor;
        uint256 amount;
        string description;
        uint8 dataType;
        bool claimed;
        address contributor;
        string ipfsProofCID;
        bool approved;
    }

    uint256 public bountyCount;
    mapping(uint256 => Bounty) public bounties;
    address public daoAddress;

    event BountyDeposited(
        uint256 indexed bountyId,
        address indexed depositor,
        uint256 amount,
        string description
    );
    event BountyClaimed(uint256 indexed bountyId, address indexed contributor, string ipfsProofCID);
    event BountyApproved(uint256 indexed bountyId, address indexed contributor, uint256 amount);

    modifier onlyDAO() {
        require(msg.sender == daoAddress || msg.sender == owner(), "Only DAO or owner");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setDAOAddress(address _daoAddress) external onlyOwner {
        daoAddress = _daoAddress;
    }

    function depositBounty(
        string calldata description,
        uint8 dataTypeRequired
    ) external payable returns (uint256 bountyId) {
        require(msg.value > 0, "Must deposit ETH");

        bountyId = ++bountyCount;
        bounties[bountyId] = Bounty({
            id: bountyId,
            depositor: msg.sender,
            amount: msg.value,
            description: description,
            dataType: dataTypeRequired,
            claimed: false,
            contributor: address(0),
            ipfsProofCID: "",
            approved: false
        });

        emit BountyDeposited(bountyId, msg.sender, msg.value, description);
    }

    function claimBounty(uint256 bountyId, string calldata ipfsProofCID) external {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.id != 0, "Bounty not found");
        require(!bounty.claimed, "Already claimed");
        require(bytes(ipfsProofCID).length > 0, "Proof CID required");

        bounty.claimed = true;
        bounty.contributor = msg.sender;
        bounty.ipfsProofCID = ipfsProofCID;

        emit BountyClaimed(bountyId, msg.sender, ipfsProofCID);
    }

    function approveClaim(uint256 bountyId, address contributor) external onlyDAO nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.id != 0, "Bounty not found");
        require(bounty.claimed, "Not yet claimed");
        require(!bounty.approved, "Already approved");
        require(bounty.contributor == contributor, "Wrong contributor");

        bounty.approved = true;
        uint256 amount = bounty.amount;
        bounty.amount = 0;

        (bool success, ) = payable(contributor).call{value: amount}("");
        require(success, "Transfer failed");

        emit BountyApproved(bountyId, contributor, amount);
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    function getBountyCount() external view returns (uint256) {
        return bountyCount;
    }
}
