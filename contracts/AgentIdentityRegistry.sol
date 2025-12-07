// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Agent Identity Registry
/// @notice ERC-8004 compliant contract for managing agent identities on-chain
/// @dev This contract allows registration and management of agent identities
///      with references to Unibase record keys stored as identity URIs
/// @author 0xGuard
contract AgentIdentityRegistry is Ownable {
    /// @notice Structure to store agent identity information
    /// @param identityURI The URI reference to the Unibase record key
    /// @param registeredAt Timestamp when the agent was first registered
    /// @param lastUpdated Timestamp when the identity was last updated
    struct AgentIdentity {
        string identityURI;
        uint256 registeredAt;
        uint256 lastUpdated;
    }

    /// @notice Mapping from agent address to their identity information
    mapping(address => AgentIdentity) private agentIdentities;

    /// @notice Emitted when a new agent is registered
    /// @param agent The address of the registered agent
    /// @param identityURI The URI reference to the Unibase record key
    event AgentRegistered(address indexed agent, string identityURI);

    /// @notice Emitted when an agent's identity URI is updated
    /// @param agent The address of the agent whose identity was updated
    /// @param oldURI The previous identity URI
    /// @param newURI The new identity URI
    event IdentityURIUpdated(address indexed agent, string oldURI, string newURI);

    /// @notice Constructor sets the contract deployer as the initial owner
    /// @dev Uses OpenZeppelin's Ownable pattern for access control
    constructor() Ownable(msg.sender) {}

    /// @notice Registers a new agent with their identity URI
    /// @dev Only the contract owner can register agents
    /// @dev The identityURI should reference a Unibase record key
    /// @param agent The address of the agent to register
    /// @param identityURI The URI reference to the Unibase record key
    /// @custom:requirement agent must not be the zero address
    /// @custom:requirement identityURI must not be empty
    /// @custom:requirement agent must not already be registered
    function registerAgent(address agent, string calldata identityURI) external onlyOwner {
        require(agent != address(0), "AgentIdentityRegistry: invalid agent address");
        require(bytes(identityURI).length > 0, "AgentIdentityRegistry: identityURI cannot be empty");
        require(bytes(agentIdentities[agent].identityURI).length == 0, "AgentIdentityRegistry: agent already registered");

        agentIdentities[agent] = AgentIdentity({
            identityURI: identityURI,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        emit AgentRegistered(agent, identityURI);
    }

    /// @notice Updates the identity URI for an existing registered agent
    /// @dev Only the contract owner can update agent identities
    /// @param agent The address of the agent whose identity URI should be updated
    /// @param newURI The new URI reference to the Unibase record key
    /// @custom:requirement agent must be registered
    /// @custom:requirement newURI must not be empty
    function updateIdentityURI(address agent, string calldata newURI) external onlyOwner {
        require(bytes(agentIdentities[agent].identityURI).length > 0, "AgentIdentityRegistry: agent not registered");
        require(bytes(newURI).length > 0, "AgentIdentityRegistry: newURI cannot be empty");

        string memory oldURI = agentIdentities[agent].identityURI;
        agentIdentities[agent].identityURI = newURI;
        agentIdentities[agent].lastUpdated = block.timestamp;

        emit IdentityURIUpdated(agent, oldURI, newURI);
    }

    /// @notice Retrieves the identity URI for a registered agent
    /// @dev Returns empty string if agent is not registered
    /// @param agent The address of the agent to query
    /// @return The identity URI reference to the Unibase record key
    function getIdentity(address agent) external view returns (string memory) {
        return agentIdentities[agent].identityURI;
    }

    /// @notice Retrieves full identity information for a registered agent
    /// @dev Returns all identity data including timestamps
    /// @param agent The address of the agent to query
    /// @return identity The complete AgentIdentity struct
    function getIdentityFull(address agent) external view returns (AgentIdentity memory identity) {
        return agentIdentities[agent];
    }

    /// @notice Checks if an agent is registered
    /// @param agent The address of the agent to check
    /// @return True if the agent is registered, false otherwise
    function isRegistered(address agent) external view returns (bool) {
        return bytes(agentIdentities[agent].identityURI).length > 0;
    }
}

