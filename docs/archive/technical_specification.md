# Technical Specification for engineering-drawing-system

## System Architecture

### Microservices
1. **Drawing Processing Service**
   - Handles PDF/image upload and processing
   - OCR and component detection
   - Async processing with Celery

2. **Search Service**
   - Elasticsearch integration for fast text search
   - Component indexing and retrieval
   - Query optimization

3. **Data Extraction Service**
   - Dimensional data extraction
   - Specification parsing
   - Validation and quality scoring

4. **API Gateway**
   - FastAPI-based REST API
   - Authentication and authorization
   - Rate limiting and caching

5. **Frontend Application**
   - React SPA with TypeScript
   - Real-time updates via WebSocket
   - Progressive Web App capabilities

## API Specification

### Endpoints

#### Drawing Management
- `POST /api/v1/drawings/upload` - Upload drawing files
- `GET /api/v1/drawings/<built-in function id>` - Get drawing details
- `GET /api/v1/drawings` - List drawings with pagination

#### Component Search
- `GET /api/v1/search/components` - Search for piece marks
- `GET /api/v1/components/<built-in function id>` - Get component details
- `GET /api/v1/components/<built-in function id>/dimensions` - Get dimensional data

#### Data Export
- `POST /api/v1/export/excel` - Export to Excel format
- `POST /api/v1/export/csv` - Export to CSV format

## Database Schema

```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Drawings table
CREATE TABLE drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    file_name VARCHAR(255) NOT NULL,
    drawing_type VARCHAR(50),
    sheet_number VARCHAR(50),
    upload_date TIMESTAMP DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT,
    metadata JSONB
);

-- Components table
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID REFERENCES drawings(id),
    piece_mark VARCHAR(100) NOT NULL,
    component_type VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    location_x FLOAT,
    location_y FLOAT,
    confidence_score FLOAT,
    extracted_data JSONB
);

-- Dimensions table
CREATE TABLE dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES components(id),
    dimension_type VARCHAR(50),
    value FLOAT,
    unit VARCHAR(20),
    tolerance VARCHAR(50)
);
```

## Security Requirements
- JWT-based authentication
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- Audit logging for all data access

## Performance Requirements
- Drawing processing: < 1 minute per drawing
- Search response time: < 2 seconds
- Support for 100+ concurrent users
- 99.9% uptime SLA
