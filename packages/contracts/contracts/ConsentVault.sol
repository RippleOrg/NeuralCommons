// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRevocationRegistry {
    function registerRevocation(
        bytes32 grantId,
        address owner,
        string calldata reason,
        bytes32 keyDestructionProof
    ) external;
}

contract ConsentVault is Ownable, ReentrancyGuard {
    struct DataGrant {
        address grantee;
        uint8[] dataTypes;
        bytes32[] purposes;
        uint256 expiry;
        bool revoked;
        string ipfsCID;
        bytes32 scopedKeyHash;
    }

    struct VaultEntry {
        address owner;
        string encryptedMetadataCID;
        bytes32[] grantIds;
        uint256 createdAt;
    }

    mapping(address => VaultEntry) public vaults;
    mapping(bytes32 => DataGrant) public grants;
    mapping(address => bytes32[]) public grantsByGrantee;

    IRevocationRegistry public revocationRegistry;

    event VaultCreated(address indexed owner, string encryptedMetadataCID);
    event GrantCreated(
        bytes32 indexed grantId,
        address indexed owner,
        address indexed grantee,
        uint256 expiry
    );
    event GrantRevoked(bytes32 indexed grantId, address indexed owner, address indexed grantee);
    event DataAccessed(bytes32 indexed grantId, address indexed grantee, uint256 timestamp);

    modifier onlyVaultOwner() {
        require(vaults[msg.sender].owner == msg.sender, "No vault found");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setRevocationRegistry(address registryAddress) external onlyOwner {
        revocationRegistry = IRevocationRegistry(registryAddress);
    }

    function createVault(string calldata encryptedMetadataCID) external {
        require(vaults[msg.sender].owner == address(0), "Vault already exists");
        vaults[msg.sender] = VaultEntry({
            owner: msg.sender,
            encryptedMetadataCID: encryptedMetadataCID,
            grantIds: new bytes32[](0),
            createdAt: block.timestamp
        });
        emit VaultCreated(msg.sender, encryptedMetadataCID);
    }

    function grantAccess(
        address grantee,
        uint8[] calldata dataTypes,
        bytes32[] calldata purposes,
        uint256 expiry,
        string calldata ipfsCID,
        bytes32 scopedKeyHash
    ) external onlyVaultOwner nonReentrant returns (bytes32 grantId) {
        require(grantee != address(0), "Invalid grantee");
        require(expiry > block.timestamp, "Expiry must be in future");
        require(dataTypes.length > 0, "Must specify data types");

        grantId = keccak256(
            abi.encodePacked(msg.sender, grantee, block.timestamp, scopedKeyHash)
        );

        grants[grantId] = DataGrant({
            grantee: grantee,
            dataTypes: dataTypes,
            purposes: purposes,
            expiry: expiry,
            revoked: false,
            ipfsCID: ipfsCID,
            scopedKeyHash: scopedKeyHash
        });

        vaults[msg.sender].grantIds.push(grantId);
        grantsByGrantee[grantee].push(grantId);

        emit GrantCreated(grantId, msg.sender, grantee, expiry);
    }

    function revokeAccess(
        bytes32 grantId,
        string calldata reason,
        bytes32 keyDestructionProof
    ) external onlyVaultOwner nonReentrant {
        DataGrant storage grant = grants[grantId];
        require(grant.grantee != address(0), "Grant not found");
        require(!grant.revoked, "Grant already revoked");

        grant.revoked = true;

        if (address(revocationRegistry) != address(0)) {
            revocationRegistry.registerRevocation(grantId, msg.sender, reason, keyDestructionProof);
        }

        emit GrantRevoked(grantId, msg.sender, grant.grantee);
    }

    function isGrantValid(
        address ownerAddr,
        address grantee,
        uint8 dataType
    ) external view returns (bool) {
        bytes32[] storage granteeGrants = grantsByGrantee[grantee];
        for (uint256 i = 0; i < granteeGrants.length; i++) {
            DataGrant storage grant = grants[granteeGrants[i]];
            if (
                grant.grantee == grantee &&
                !grant.revoked &&
                grant.expiry > block.timestamp
            ) {
                // Check if this grant belongs to the specified owner
                bool ownerMatch = false;
                bytes32[] storage ownerGrantIds = vaults[ownerAddr].grantIds;
                for (uint256 j = 0; j < ownerGrantIds.length; j++) {
                    if (ownerGrantIds[j] == granteeGrants[i]) {
                        ownerMatch = true;
                        break;
                    }
                }
                if (!ownerMatch) continue;

                // Check data type
                for (uint256 k = 0; k < grant.dataTypes.length; k++) {
                    if (grant.dataTypes[k] == dataType) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function getGrant(bytes32 grantId) external view returns (DataGrant memory) {
        return grants[grantId];
    }

    function getMyGrants() external view returns (bytes32[] memory) {
        return vaults[msg.sender].grantIds;
    }

    function getGrantsByGrantee(address grantee) external view returns (bytes32[] memory) {
        return grantsByGrantee[grantee];
    }

    function recordAccess(bytes32 grantId) external nonReentrant {
        DataGrant storage grant = grants[grantId];
        require(grant.grantee == msg.sender, "Not the grantee");
        require(!grant.revoked, "Grant revoked");
        require(grant.expiry > block.timestamp, "Grant expired");
        emit DataAccessed(grantId, msg.sender, block.timestamp);
    }
}
