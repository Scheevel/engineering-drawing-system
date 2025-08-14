# Engineering Drawing Index System

An AI-powered system for indexing and analyzing engineering drawings for railroad bridge engineers.

## Features

- 🔍 **Automated Drawing Indexing**: OCR and component detection across PDF/image drawings
- 🚀 **Fast Component Search**: Find piece marks and components instantly across thousands of drawings
- 📊 **Data Extraction**: Automated extraction of dimensions and specifications
- 📁 **Excel/CSV/PDF Export**: Export search results, component data, and reports
- 🔄 **Component Management**: History tracking, validation, and duplicate detection
- 📏 **Dimension & Specification Management**: CRUD operations for component properties
- 📈 **Real-time Monitoring**: Celery Flower for task monitoring and debugging
- 🔒 **Secure Access**: Multi-user system with role-based access control (prepared)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

1. **Start the services**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs
   - Celery Task Monitor: http://localhost:5555

## Architecture

### Services

- **Frontend**: React TypeScript application with Material-UI
- **Backend**: FastAPI with async processing (port 8001)
- **Database**: PostgreSQL with PostGIS for spatial data
- **Search**: Elasticsearch for fast component search
- **Cache**: Redis for session management and caching
- **Queue**: Celery with Redis for background processing
- **Task Monitor**: Celery Flower for real-time task monitoring
- **OCR**: Tesseract for text extraction from drawings
- **Nginx**: Reverse proxy (optional, production profile)

## API Endpoints

The system provides comprehensive REST APIs for all operations:

- **Drawings API**: Upload, retrieve, status tracking, component listing
- **Components API**: CRUD operations, history tracking, validation, duplicate detection
- **Search API**: Component search, advanced queries, suggestions, recent searches
- **Export API**: Excel, CSV, PDF reports with customizable templates
- **System API**: Health checks, statistics, monitoring

Full API documentation available at http://localhost:8001/docs when running.

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## License

MIT License