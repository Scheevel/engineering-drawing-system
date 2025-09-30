#!/usr/bin/env node

/**
 * PM2 Health Monitor Script
 * Monitors Docker container health and reports to PM2
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Health check configuration
const HEALTH_CONFIG = {
  checkInterval: 30000, // 30 seconds
  logFile: './logs/health-monitor.log',
  containers: [
    {
      name: 'postgres',
      container: 'drawing_postgres',
      healthCommand: 'docker exec drawing_postgres pg_isready -U user -d drawing_index'
    },
    {
      name: 'redis',
      container: 'drawing_redis',
      healthCommand: 'docker exec drawing_redis redis-cli ping'
    },
    {
      name: 'elasticsearch',
      container: 'drawing_elasticsearch',
      healthCommand: 'curl -f http://localhost:9200/_cluster/health -s'
    },
    {
      name: 'backend',
      container: 'drawing_backend',
      healthCommand: 'curl -f http://localhost:8001/health -s'
    },
    {
      name: 'celery-worker',
      container: 'drawing_celery_worker',
      healthCommand: 'docker exec drawing_celery_worker celery -A app.core.celery_app inspect ping'
    }
  ]
};

class HealthMonitor {
  constructor() {
    this.healthStatus = {};
    this.logFile = HEALTH_CONFIG.logFile;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Log to console for PM2 to capture
    console.log(logMessage.trim());

    // Also log to file
    fs.appendFileSync(this.logFile, logMessage);
  }

  async checkContainerHealth(container) {
    return new Promise((resolve) => {
      exec(container.healthCommand, { timeout: 10000 }, (error, stdout, stderr) => {
        const status = {
          name: container.name,
          container: container.container,
          healthy: !error,
          lastCheck: new Date().toISOString(),
          output: stdout ? stdout.trim() : null,
          error: error ? error.message : null
        };

        if (error) {
          this.log(`❌ ${container.name}: UNHEALTHY - ${error.message}`);
        } else {
          this.log(`✅ ${container.name}: HEALTHY - ${stdout.trim()}`);
        }

        resolve(status);
      });
    });
  }

  async checkAllContainers() {
    this.log('🔍 Starting health check cycle...');

    const healthPromises = HEALTH_CONFIG.containers.map(container =>
      this.checkContainerHealth(container)
    );

    try {
      const results = await Promise.all(healthPromises);

      // Update health status
      results.forEach(result => {
        this.healthStatus[result.name] = result;
      });

      // Summary
      const healthyCount = results.filter(r => r.healthy).length;
      const totalCount = results.length;

      this.log(`📊 Health Summary: ${healthyCount}/${totalCount} services healthy`);

      // Write status to file for PM2 monitoring integration
      const statusFile = './logs/container-health-status.json';
      fs.writeFileSync(statusFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { healthy: healthyCount, total: totalCount },
        services: this.healthStatus
      }, null, 2));

    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`);
    }
  }

  start() {
    this.log('🚀 PM2 Health Monitor started');

    // Initial health check
    this.checkAllContainers();

    // Set up periodic health checks
    setInterval(() => {
      this.checkAllContainers();
    }, HEALTH_CONFIG.checkInterval);
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new HealthMonitor();
  monitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    monitor.log('🛑 PM2 Health Monitor shutting down');
    process.exit(0);
  });
}

module.exports = HealthMonitor;