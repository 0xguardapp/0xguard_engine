// State management
let lastLogCount = 0;
let knownAttacks = new Set();
let knownProofs = new Set();
let followLogs = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const followToggle = document.getElementById('follow-toggle');
    followToggle.addEventListener('change', (e) => {
        followLogs = e.target.checked;
    });

    // Start polling
    pollLogs();
    setInterval(pollLogs, 1000);
});

// Poll logs.json for updates
async function pollLogs() {
    try {
        const response = await fetch('/logs.json');
        if (!response.ok) {
            return;
        }
        const logs = await response.json();
        
        if (logs.length > lastLogCount) {
            const newLogs = logs.slice(lastLogCount);
            newLogs.forEach(log => {
                appendLogToTerminal(log);
                updateAgentStatus(log);
                updateHivemind(log);
                updateZKProofs(log);
            });
            lastLogCount = logs.length;
            
            if (followLogs) {
                scrollToBottom();
            }
        }
    } catch (error) {
        // Silently fail if logs.json doesn't exist yet
        console.debug('Logs not available yet');
    }
}

// Append log entry to terminal
function appendLogToTerminal(log) {
    const terminal = document.getElementById('terminal');
    
    // Remove "Waiting for agent activity..." if it exists
    if (terminal.children.length === 1 && terminal.children[0].textContent.includes('Waiting')) {
        terminal.innerHTML = '';
    }
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    if (log.is_vulnerability) {
        line.classList.add('vulnerability-line');
    }
    
    const timestamp = document.createElement('span');
    timestamp.className = 'terminal-timestamp';
    timestamp.textContent = `[${log.timestamp}]`;
    
    const icon = document.createElement('span');
    icon.className = 'terminal-icon';
    icon.textContent = log.icon;
    
    const actor = document.createElement('span');
    actor.className = 'terminal-actor';
    actor.textContent = log.actor + ':';
    
    const message = document.createElement('span');
    message.className = 'terminal-message';
    message.textContent = ' ' + log.message;
    
    line.appendChild(timestamp);
    line.appendChild(icon);
    line.appendChild(actor);
    line.appendChild(message);
    
    terminal.appendChild(line);
}

// Update agent status cards
function updateAgentStatus(log) {
    const actor = log.actor.toLowerCase();
    
    if (actor.includes('red') || actor.includes('redteam')) {
        const statusEl = document.getElementById('red-team-status');
        if (log.type === 'attack') {
            statusEl.textContent = `Attacking -> Target`;
        } else if (log.type === 'vulnerability') {
            statusEl.textContent = `Vulnerability Found!`;
        } else {
            statusEl.textContent = `Thinking...`;
        }
    } else if (actor.includes('target')) {
        const statusEl = document.getElementById('target-status');
        if (log.type === 'vulnerability') {
            statusEl.textContent = `Vulnerability Triggered!`;
        } else if (log.message.includes('Listening')) {
            statusEl.textContent = `Listening on port 8000`;
        } else {
            statusEl.textContent = `Processing...`;
        }
    } else if (actor.includes('judge')) {
        const statusEl = document.getElementById('judge-status');
        if (log.type === 'vulnerability') {
            statusEl.textContent = `Verifying output...`;
        } else {
            statusEl.textContent = `Standby`;
        }
    }
}

// Update Hivemind dictionary
function updateHivemind(log) {
    if (log.type === 'attack' && log.message.includes("Executing vector:")) {
        // Extract the attack vector from the message
        const match = log.message.match(/'([^']+)'/);
        if (match && match[1]) {
            const attackVector = match[1];
            if (!knownAttacks.has(attackVector)) {
                knownAttacks.add(attackVector);
                addToHivemind(attackVector);
            }
        }
    }
}

function addToHivemind(attackVector) {
    const hivemindList = document.getElementById('hivemind-list');
    
    // Remove "No attacks learned yet..." if it exists
    if (hivemindList.children.length === 1 && hivemindList.children[0].textContent.includes('No attacks')) {
        hivemindList.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between py-1 border-b border-gray-800 last:border-0';
    
    const vector = document.createElement('span');
    vector.className = 'mono text-sm';
    vector.textContent = attackVector;
    
    const time = document.createElement('span');
    time.className = 'mono text-xs text-gray-600';
    time.textContent = 'Added just now';
    
    item.appendChild(vector);
    item.appendChild(time);
    
    // Insert at the top
    hivemindList.insertBefore(item, hivemindList.firstChild);
    
    // Keep only last 10 entries
    while (hivemindList.children.length > 10) {
        hivemindList.removeChild(hivemindList.lastChild);
    }
}

// Update ZK Proofs
function updateZKProofs(log) {
    if (log.type === 'proof' || (log.message.includes('Proof') && log.message.includes('Hash'))) {
        // Extract proof hash from message
        const match = log.message.match(/Hash:\s*([a-zA-Z0-9_]+)/);
        if (match && match[1]) {
            const proofHash = match[1];
            if (!knownProofs.has(proofHash)) {
                knownProofs.add(proofHash);
                addToZKProofs(proofHash);
            }
        }
    }
}

function addToZKProofs(proofHash) {
    const proofsList = document.getElementById('zk-proofs-list');
    
    // Remove "No proofs generated yet..." if it exists
    if (proofsList.children.length === 1 && proofsList.children[0].textContent.includes('No proofs')) {
        proofsList.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 py-2 border-b border-gray-800 last:border-0';
    
    const shield = document.createElement('span');
    shield.textContent = '🛡️';
    
    const hash = document.createElement('a');
    hash.href = '#';
    hash.className = 'mono text-sm text-blue-400 hover:text-blue-300';
    hash.textContent = proofHash.length > 20 ? proofHash.substring(0, 20) + '...' : proofHash;
    hash.onclick = (e) => {
        e.preventDefault();
        // In a real implementation, this would open Midnight explorer
        alert(`Would open Midnight explorer for: ${proofHash}`);
    };
    
    const verified = document.createElement('span');
    verified.className = 'ml-auto text-xs text-green-500 mono';
    verified.textContent = 'Verified';
    
    item.appendChild(shield);
    item.appendChild(hash);
    item.appendChild(verified);
    
    // Insert at the top
    proofsList.insertBefore(item, proofsList.firstChild);
    
    // Keep only last 10 entries
    while (proofsList.children.length > 10) {
        proofsList.removeChild(proofsList.lastChild);
    }
}

// Scroll terminal to bottom
function scrollToBottom() {
    const terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

