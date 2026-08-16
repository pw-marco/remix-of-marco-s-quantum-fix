module.exports = {
  apps: [
    {
      name: 'studymeta-app',
      script: 'npm',
      args: 'start',
      cwd: '/home/StudyMeta',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      // PM2 configuration
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Auto restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Health check
      health_check_grace_period: 3000,
      kill_timeout: 5000
    }
  ]
};