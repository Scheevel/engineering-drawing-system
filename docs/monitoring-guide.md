# Engineering Drawing System - Monitoring Guide

**Author**: Claude (AI-generated documentation, Epic 5 deliverable)
**Created**: September 2025

## Overview

The Engineering Drawing System includes a comprehensive monitoring stack for development environment observability. This guide provides developers with everything needed to effectively use the monitoring tools during development.

## Monitoring Stack Components

| Component | Purpose | Access URL | Credentials |
|-----------|---------|------------|-------------|
| **Prometheus** | Metrics collection and storage | http://localhost:9090 | None |
| **Grafana** | Visualization and dashboards | http://localhost:3001 | admin/admin123 |
| **Loki** | Log aggregation and storage | http://localhost:3100 | None |

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start the monitoring stack alongside your development environment
make monitoring-up

# Or start everything together
make dev-up && make monitoring-up
```

### 2. Access Dashboards

```bash
# Open monitoring dashboards in your browser (cross-platform)
make monitoring-dashboards

# Or manually navigate to:
# - Grafana: http://localhost:3001 (admin/admin123)
# - Prometheus: http://localhost:9090
```

### 3. Monitor Your Application

The monitoring stack automatically collects:
- ✅ System metrics (CPU, memory, disk, network)
- ✅ Container metrics (Docker resource usage)
- ✅ Application metrics (API requests, response times, errors)
- ✅ Service health status
- ✅ Centralized logs with correlation IDs

## Available Dashboards

### 1. Service Health Overview
**Purpose**: Real-time overview of all services health and status
- Service availability indicators (UP/DOWN)
- Basic resource usage trends
- Container status overview

### 2. Resource Usage Overview
**Purpose**: Detailed system and container resource monitoring
- System-level CPU, memory, disk usage
- Network I/O statistics
- Container-specific resource consumption
- Resource trends over time

### 3. Application Metrics
**Purpose**: FastAPI application performance monitoring
- API request rates and response times
- Error rates (4xx/5xx responses)
- Active request counts
- Process-level metrics (memory, file descriptors)

### 4. Logs Overview
**Purpose**: Centralized log search and analysis
- Real-time log streaming
- Log filtering by service and level
- Correlation ID tracking
- Error log highlighting

## Development Commands

### Monitoring Stack Management

```bash
# Start monitoring stack
make monitoring-up

# Stop monitoring stack
make monitoring-down

# Restart monitoring stack
make monitoring-restart

# Check monitoring services status
make monitoring-status

# Stream monitoring logs
make monitoring-logs

# Open dashboards in browser
make monitoring-dashboards

# Clean monitoring data and containers
make monitoring-clean
```

### Integration with Development Workflow

```bash
# Start development environment with monitoring
make dev-up && make monitoring-up

# Debug with monitoring active
make dev-debug && make monitoring-up

# Run tests with monitoring
make dev-test  # monitoring can run independently

# Complete environment reset (including monitoring)
make dev-reset && make monitoring-clean
```

## Monitoring Features

### Correlation ID Tracking

Every API request automatically gets a unique correlation ID that allows you to trace logs across all services:

```bash
# In your logs, look for entries like:
2024-09-29 15:30:45 - uvicorn - INFO - [a1b2c3d4-e5f6-7890-abcd-ef1234567890] - Request received

# Use correlation IDs to track request flows across services
```

**For API clients**, include the correlation ID header:
```bash
curl -H "X-Correlation-ID: my-custom-id" http://localhost:8001/api/v1/health
```

### Automatic Metrics Collection

The FastAPI backend automatically exposes metrics at `/metrics`:
- Request counts by endpoint and status code
- Response time histograms
- Active request counts
- Process-level metrics

### Log Aggregation

All service logs are automatically collected and centralized:
- **Backend**: FastAPI/uvicorn logs with structured formatting
- **Frontend**: React development server logs
- **Database**: PostgreSQL query and error logs
- **Cache**: Redis operations and connection logs
- **Search**: Elasticsearch cluster and query logs
- **Workers**: Celery task execution logs

### Alerting Rules

The monitoring stack includes alert rules for critical conditions:
- **System**: High CPU (>80%), memory (>85%), disk usage (>90%)
- **Application**: High API error rate (>5%), slow response times (>2s)
- **Services**: Service availability, database connections
- **Resources**: File descriptor limits, container memory limits

## Troubleshooting

### Common Issues

#### 1. Monitoring Stack Won't Start
```bash
# Check Docker resources
docker system df

# Clean up if needed
make monitoring-clean
docker system prune

# Restart monitoring
make monitoring-up
```

#### 2. No Metrics in Grafana
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify backend metrics endpoint
curl http://localhost:8001/metrics

# Check service discovery
make monitoring-status
```

#### 3. Missing Logs in Loki
```bash
# Check Promtail configuration
docker logs drawing_promtail

# Verify log collection
curl http://localhost:3100/ready

# Check container labels for log discovery
docker inspect drawing_backend | grep -i label
```

#### 4. Dashboard Access Issues
```bash
# Reset Grafana admin password
docker exec drawing_grafana grafana-cli admin reset-admin-password admin123

# Check Grafana logs
docker logs drawing_grafana

# Verify port availability
lsof -i :3001
```

### Port Conflicts

The monitoring stack uses these ports:
- **9090**: Prometheus
- **3001**: Grafana
- **3100**: Loki
- **9080**: Promtail
- **9100**: Node Exporter
- **8080**: cAdvisor

If you encounter port conflicts:
```bash
# Check port usage
make status-ports

# Stop conflicting services
make monitoring-down

# Clean port conflicts
make clean-ports
```

## Best Practices

### 1. Development Workflow

1. **Start monitoring early**: Launch monitoring stack when starting development
2. **Use correlation IDs**: Include correlation ID headers in API testing
3. **Monitor during development**: Keep dashboards open during active development
4. **Check alerts**: Review any triggered alerts before committing code

### 2. Performance Testing

```bash
# Start environment with monitoring
make dev-up && make monitoring-up

# Run your performance tests
# Monitor in real-time via dashboards

# Check resource usage trends
# Review API performance metrics
```

### 3. Debugging Issues

1. **Check service health** in the Service Health Overview dashboard
2. **Review error logs** in the Logs Overview dashboard
3. **Monitor resource usage** during problematic operations
4. **Use correlation IDs** to trace specific request flows

### 4. Alert Acknowledgment

When alerts fire:
1. Check the **Application Metrics** dashboard for API issues
2. Review **Resource Usage** for system bottlenecks
3. Examine **logs** for error patterns
4. Address root cause before dismissing alerts

## Advanced Usage

### Custom Metrics

To add custom metrics to your application:
```python
from prometheus_client import Counter, Histogram

# Define custom metrics
request_count = Counter('app_requests_total', 'Total requests', ['endpoint'])
processing_time = Histogram('app_processing_seconds', 'Processing time')

# Use in your code
request_count.labels(endpoint='/api/v1/upload').inc()
```

### Log Correlation

To leverage correlation IDs in your application code:
```python
from app.middleware.correlation import get_correlation_id
import logging

logger = logging.getLogger(__name__)

def my_function():
    correlation_id = get_correlation_id()
    logger.info(f"Processing request: {correlation_id}")
```

### Dashboard Customization

1. Access Grafana at http://localhost:3001
2. Login with admin/admin123
3. Navigate to existing dashboards
4. Use "Save As" to create custom versions
5. Customize panels, queries, and layouts as needed

## Monitoring Data Retention

- **Prometheus**: 200 hours (configurable in prometheus.yml)
- **Loki**: Based on disk space (no time-based retention configured)
- **Grafana**: Persistent dashboards and configurations

To clean monitoring data:
```bash
# Clean all monitoring data
make monitoring-clean

# Selective cleanup
docker volume rm prometheus_data grafana_data loki_data
```

## Support and Resources

- **Prometheus Documentation**: https://prometheus.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **Loki Documentation**: https://grafana.com/docs/loki/
- **FastAPI Monitoring**: https://github.com/trallnag/prometheus-fastapi-instrumentator

For project-specific issues, check the troubleshooting section above or review the monitoring stack logs:
```bash
make monitoring-logs
```