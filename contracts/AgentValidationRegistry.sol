// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Agent Validation Registry
/// @notice ERC-8004 compatible contract for managing agent validation status on-chain
/// @dev This contract allows validation and revocation of agents with evidence
///      references stored as URIs pointing to Unibase validation records
/// @author 0xGuard
contract AgentValidationRegistry is Ownable {
    /// @notice Mapping from agent address to validation status
    mapping(address => bool) public isValidAgent;

    /// @notice Mapping from agent address to validation evidence URI
    mapping(address => string) public validationEvidenceURI;

    /// @notice Emitted when an agent is validated
    /// @param agent The address of the validated agent
    /// @param evidenceURI The URI reference to the Unibase validation record
    event AgentValidated(address indexed agent, string evidenceURI);

    /// @notice Emitted when an agent's validation is revoked
    /// @param agent The address of the agent whose validation was revoked
    event AgentRevoked(address indexed agent);

    /// @notice Constructor sets the contract deployer as the initial owner
    /// @dev Uses OpenZeppelin's Ownable pattern for access control
    constructor() Ownable(msg.sender) {}

    /// @notice Validates an agent with evidence
    /// @dev Only the contract owner (admin) can validate agents
    /// @dev The evidenceURI should reference a Unibase validation record
    /// @param agent The address of the agent to validate
    /// @param evidenceURI The URI reference to the Unibase validation record
    /// @custom:requirement agent must not be the zero address
    /// @custom:requirement evidenceURI must not be empty
    function validateAgent(address agent, string calldata evidenceURI) external onlyOwner {
        _validateAgent(agent, evidenceURI);
    }

    /// @dev Internal function to validate an agent
    /// @param agent The address of the agent to validate
    /// @param evidenceURI The URI reference to the Unibase validation record
    function _validateAgent(address agent, string calldata evidenceURI) internal {
        require(agent != address(0), "AgentValidationRegistry: invalid agent address");
        require(bytes(evidenceURI).length > 0, "AgentValidationRegistry: evidenceURI cannot be empty");

        isValidAgent[agent] = true;
        validationEvidenceURI[agent] = evidenceURI;

        emit AgentValidated(agent, evidenceURI);
    }

    /// @notice Revokes an agent's validation status
    /// @dev Only the contract owner (admin) can revoke agent validations
    /// @param agent The address of the agent whose validation should be revoked
    /// @custom:requirement agent must not be the zero address
    function revokeAgent(address agent) external onlyOwner {
        _revokeAgent(agent);
    }

    /// @dev Internal function to revoke an agent's validation
    /// @param agent The address of the agent whose validation should be revoked
    function _revokeAgent(address agent) internal {
        require(agent != address(0), "AgentValidationRegistry: invalid agent address");
        require(isValidAgent[agent], "AgentValidationRegistry: agent not validated");

        isValidAgent[agent] = false;
        // Clear the evidence URI when revoking
        delete validationEvidenceURI[agent];

        emit AgentRevoked(agent);
    }

    /// @notice Retrieves the validation status and evidence URI for an agent
    /// @param agent The address of the agent to query
    /// @return valid True if the agent is currently validated, false otherwise
    /// @return evidenceURI The URI reference to the Unibase validation record (empty if not validated)
    function getValidation(address agent) external view returns (bool valid, string memory evidenceURI) {
        return (isValidAgent[agent], validationEvidenceURI[agent]);
    }

    /// @notice Batch validate multiple agents
    /// @dev Only the contract owner can perform batch validations
    /// @param agents Array of agent addresses to validate
    /// @param evidenceURIs Array of evidence URIs (must match agents array length)
    /// @custom:requirement All arrays must have the same length
    function batchValidateAgents(
        address[] calldata agents,
        string[] calldata evidenceURIs
    ) external onlyOwner {
        require(
            agents.length == evidenceURIs.length,
            "AgentValidationRegistry: array length mismatch"
        );

        for (uint256 i = 0; i < agents.length; i++) {
            _validateAgent(agents[i], evidenceURIs[i]);
        }
    }

    /// @notice Batch revoke multiple agents
    /// @dev Only the contract owner can perform batch revocations
    /// @param agents Array of agent addresses to revoke
    function batchRevokeAgents(address[] calldata agents) external onlyOwner {
        for (uint256 i = 0; i < agents.length; i++) {
            if (isValidAgent[agents[i]]) {
                _revokeAgent(agents[i]);
            }
        }
    }
}

