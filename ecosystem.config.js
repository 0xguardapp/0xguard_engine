/**
 * PM2 Ecosystem Configuration for 0xGuard
 * 
 * Non-Docker deployment configuration for all services.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 * 
 * Monitor:
 *   pm2 status
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    // Agent API Server
    {
      name: '0xguard-agent-api',
      script: 'agent/api_server.py',
      interpreter: 'python3',
      cwd: './agent',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        AGENT_API_PORT: 8003,
        AGENT_API_URL: 'http://localhost:8003',
        PYTHONUNBUFFERED: '1',
      },
      env_file: './agent/.env',
      error_file: './logs/agent-api-error.log',
      out_file: './logs/agent-api-out.log',
      log_file: './logs/agent-api-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', '__pycache__'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // Judge Agent
    {
      name: '0xguard-judge',
      script: 'agent/run_judge.py',
      interpreter: 'python3',
      cwd: './agent',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        JUDGE_PORT: 8002,
        JUDGE_IP: '0.0.0.0',
        AGENT_API_URL: 'http://localhost:8003',
        PYTHONUNBUFFERED: '1',
      },
      env_file: './agent/.env',
      error_file: './logs/judge-error.log',
      out_file: './logs/judge-out.log',
      log_file: './logs/judge-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', '__pycache__'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // Target Agent
    {
      name: '0xguard-target',
      script: 'agent/run_target.py',
      interpreter: 'python3',
      cwd: './agent',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        TARGET_PORT: 8000,
        TARGET_IP: '0.0.0.0',
        AGENT_API_URL: 'http://localhost:8003',
        PYTHONUNBUFFERED: '1',
      },
      env_file: './agent/.env',
      error_file: './logs/target-error.log',
      out_file: './logs/target-out.log',
      log_file: './logs/target-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', '__pycache__'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // Red Team Agent
    {
      name: '0xguard-red-team',
      script: 'agent/run_red_team.py',
      interpreter: 'python3',
      cwd: './agent',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        RED_TEAM_PORT: 8001,
        RED_TEAM_IP: '0.0.0.0',
        AGENT_API_URL: 'http://localhost:8003',
        PYTHONUNBUFFERED: '1',
      },
      env_file: './agent/.env',
      error_file: './logs/red-team-error.log',
      out_file: './logs/red-team-out.log',
      log_file: './logs/red-team-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', '__pycache__'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // Midnight FastAPI (Optional - comment out if not needed)
    {
      name: '0xguard-midnight-api',
      script: 'contracts/midnight/api/python/main.py',
      interpreter: 'python3',
      cwd: './contracts/midnight/api',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8100,
        MIDNIGHT_ENVIRONMENT: 'testnet',
        PYTHONUNBUFFERED: '1',
      },
      error_file: './logs/midnight-api-error.log',
      out_file: './logs/midnight-api-out.log',
      log_file: './logs/midnight-api-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', '__pycache__'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Uncomment to enable:
      // enabled: true,
    },

    // Frontend Next.js
    {
      name: '0xguard-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        AGENT_API_URL: 'http://localhost:8003',
        NEXT_PUBLIC_AGENT_API_URL: 'http://localhost:8003',
        PORT: 3000,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs', '*.log'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 30000,
    },
  ],
};

