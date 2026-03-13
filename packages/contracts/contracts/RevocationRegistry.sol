// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RevocationRegistry is Ownable {
    struct RevocationRecord {
        address owner;
        bytes32 grantId;
        uint256 revokedAt;
        string reason;
        bytes32 keyDestructionProof;
    }

    mapping(bytes32 => RevocationRecord) private revocationRecords;
    mapping(bytes32 => bool) private revokedGrants;
    bytes32[] public allRevocations;

    address public consentVault;

    event RevocationPublished(
        bytes32 indexed grantId,
        address indexed owner,
        uint256 revokedAt,
        string reason
    );

    modifier onlyConsentVault() {
        require(msg.sender == consentVault, "Only ConsentVault can register revocations");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setConsentVault(address vaultAddress) external onlyOwner {
        consentVault = vaultAddress;
    }

    function registerRevocation(
        bytes32 grantId,
        address owner,
        string calldata reason,
        bytes32 keyDestructionProof
    ) external onlyConsentVault {
        require(!revokedGrants[grantId], "Already revoked");

        revocationRecords[grantId] = RevocationRecord({
            owner: owner,
            grantId: grantId,
            revokedAt: block.timestamp,
            reason: reason,
            keyDestructionProof: keyDestructionProof
        });

        revokedGrants[grantId] = true;
        allRevocations.push(grantId);

        emit RevocationPublished(grantId, owner, block.timestamp, reason);
    }

    function isRevoked(bytes32 grantId) external view returns (bool, RevocationRecord memory) {
        return (revokedGrants[grantId], revocationRecords[grantId]);
    }

    function getRevocationCount() external view returns (uint256) {
        return allRevocations.length;
    }

    function getRevocationAt(uint256 index) external view returns (RevocationRecord memory) {
        require(index < allRevocations.length, "Index out of bounds");
        return revocationRecords[allRevocations[index]];
    }
}
