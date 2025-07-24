# Engineering Drawing Index System

An AI-powered system for indexing and analyzing engineering drawings for railroad bridge engineers.

## Features

- 🔍 **Automated Drawing Indexing**: OCR and component detection across PDF/image drawings
- 🚀 **Fast Component Search**: Find piece marks and components instantly across thousands of drawings
- 📊 **Data Extraction**: Automated extraction of dimensions and specifications
- 📁 **Excel/CSV Export**: Export search results and component data
- 🔒 **Secure Access**: Multi-user system with role-based access control

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
   - API Documentation: http://localhost:8001/api/v1/docs

## Architecture

### Services

- **Frontend**: React TypeScript application with Material-UI
- **Backend**: FastAPI with async processing
- **Database**: PostgreSQL with PostGIS for spatial data
- **Search**: Elasticsearch for fast component search
- **Cache**: Redis for session management and caching
- **Queue**: Celery with Redis for background processing
- **OCR**: Tesseract for text extraction from drawings

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## License

MIT License