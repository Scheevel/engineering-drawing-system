# System Architecture for Engineering Drawing Index System

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │     │   Mobile App    │     │   API Client    │
│   (Frontend)    │     │   (Future)      │     │   (External)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    API Gateway         │
                    │    (FastAPI)           │
                    │  - Authentication      │
                    │  - Rate Limiting       │
                    │  - Request Routing     │
                    └────────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Drawing Service │    │ Search Service  │    │ Export Service  │
│  - Upload       │    │  - Component    │    │  - Excel        │
│  - Processing   │    │    Search       │    │  - CSV          │
│  - OCR          │    │  - Filtering    │    │  - PDF          │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                       │
         └──────────────────────┴───────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
        ┌─────────────────┐           ┌─────────────────┐
        │   PostgreSQL    │           │  Elasticsearch  │
        │   + PostGIS     │           │  (Search Index) │
        └─────────────────┘           └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   Redis Cache   │
        │  (Performance)  │
        └─────────────────┘
```

## Service Definitions

### 1. API Gateway Service
- **Technology**: FastAPI
- **Responsibilities**:
  - Request routing and load balancing
  - JWT authentication and authorization
  - API rate limiting and throttling
  - Request/response logging
  - API documentation (OpenAPI/Swagger)

### 2. Drawing Processing Service
- **Technology**: Python + Celery
- **Responsibilities**:
  - File upload handling
  - Async drawing processing
  - OCR text extraction
  - Component detection
  - Dimension extraction
  - Quality scoring

### 3. Search Service
- **Technology**: Python + Elasticsearch
- **Responsibilities**:
  - Component indexing
  - Full-text search
  - Fuzzy matching
  - Filter application
  - Result ranking

### 4. Export Service
- **Technology**: Python + openpyxl
- **Responsibilities**:
  - Excel generation
  - CSV export
  - PDF report generation
  - Template management

## Infrastructure Components

### Container Orchestration
```yaml
# docker-compose.yml
version: '3.8'

services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - elasticsearch

  drawing-service:
    build: ./services/drawing-service
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - CELERY_BROKER_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  celery-worker:
    build: ./services/drawing-service
    command: celery -A app.celery worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - CELERY_BROKER_URL=redis://redis:6379

  postgres:
    image: postgis/postgis:14-3.2
    environment:
      - POSTGRES_DB=drawings
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  elasticsearch_data:
```

## Deployment Architecture

### Production Environment
- **Cloud Provider**: AWS/Azure/GCP
- **Container Registry**: ECR/ACR/GCR
- **Orchestration**: Kubernetes (EKS/AKS/GKE)
- **Load Balancer**: ALB/Application Gateway
- **CDN**: CloudFront/Azure CDN
- **Storage**: S3/Blob Storage for drawings

### Monitoring Stack
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger
- **Alerting**: AlertManager

## Security Architecture

### Authentication Flow
```
Client → API Gateway → Auth Service → JWT Token
                ↓
        Validate Token
                ↓
        Route to Service
```

### Data Security
- TLS 1.3 for all communications
- Encryption at rest for database
- Encrypted file storage
- API key rotation
- Audit logging
