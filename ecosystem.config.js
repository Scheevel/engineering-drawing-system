module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        REACT_APP_API_URL: 'http://localhost:8001',
        NODE_ENV: 'development',
        // HMR Configuration for PM2 compatibility
        CHOKIDAR_USEPOLLING: 'true',
        FAST_REFRESH: 'true',
        WDS_SOCKET_HOST: 'localhost',
        WDS_SOCKET_PORT: '3000'
      },
      watch: false, // Let React handle file watching for HMR
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      // PM2 memory limit to stay under 50MB overhead (AC2)
      max_memory_restart: '512M',
      log_file: './logs/frontend.log',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log'
    },
    {
      name: 'backend-services',
      script: 'docker-compose',
      args: 'up --remove-orphans',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 5000, // 5-second startup delay for dependencies (AC1)
      max_restarts: 3,
      kill_timeout: 30000, // 30s graceful shutdown for Docker (AC3)
      min_uptime: '30s',
      env: {
        COMPOSE_PROJECT_NAME: 'engineering_drawing_dev'
      },
      log_file: './logs/backend-services.log',
      error_file: './logs/backend-services-error.log',
      out_file: './logs/backend-services-out.log'
    },
    {
      name: 'health-monitor',
      script: './scripts/pm2-health-monitor.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 10000, // 10-second delay before restart
      max_restarts: 5,
      min_uptime: '30s',
      env: {
        NODE_ENV: 'development'
      },
      log_file: './logs/health-monitor.log',
      error_file: './logs/health-monitor-error.log',
      out_file: './logs/health-monitor-out.log'
    }
  ],

  deploy: {
    development: {
      // Basic development deployment configuration
      // Can be extended for advanced deployment scenarios
      key: '~/.ssh/dev_key.pem',
      user: 'developer',
      host: ['localhost'],
      ref: 'origin/develop',
      repo: 'https://github.com/company/engineering-drawing-system.git',
      path: '/var/www/development',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development'
    }
  }
};