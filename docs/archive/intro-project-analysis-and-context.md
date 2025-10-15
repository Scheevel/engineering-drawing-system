---
**ARCHIVE PRESERVATION NOTE**

**Date Archived:** October 14, 2025 (moved from [docs/prd/](../prd/) during PRD cleanup)
**Reason for Preservation:** Historical brownfield analysis and project context for search enhancement PRD
**Why Kept:** Captures the original "IDE-based fresh analysis" methodology and available documentation assessment that informed the advanced search enhancement PRD. Provides context about the project's state when brownfield enhancement planning began, including which documentation existed vs. gaps identified. This historical snapshot helps understand the evolution of project documentation and decision-making context for the search feature. Contains valuable insights about enhancement scope definition and impact assessment methodology.

**Status:** HISTORICAL REFERENCE - Documents project state at time of brownfield PRD creation
**Original Context:** Part of the brownfield enhancement PRD for advanced search capabilities
**Related Active Docs:**
- [Current PRD Files](../prd/) - Active sharded PRD structure
- [Architecture Docs](../architecture/) - Current technical documentation

**Note:** This was redundant as part of the active PRD (duplicated context) but valuable as archived historical reference showing how brownfield enhancements were analyzed and scoped.

---

# Intro Project Analysis and Context

## Analysis Source
**IDE-based fresh analysis** using available project documentation and FEATURE-REQUESTS.md specification

## Current Project State
The Engineering Drawing Index System is an AI-powered tool for railroad bridge engineers that automates the indexing and analysis of engineering drawings. The system solves the critical problem of searching for specific components (piece marks) across hundreds of historical drawing sheets and automates dimensional data extraction.

**Key Value Proposition:** Reduces component search time from hours to seconds and eliminates manual data transcription errors.

**Current Architecture:**
- **Frontend**: React 18 + TypeScript + Material-UI (port 3000)
- **Backend API**: FastAPI + Python 3.11 with async support (port 8000 internally, exposed as 8001)
- **Database**: PostgreSQL 14 with PostGIS for spatial data
- **Search Engine**: Elasticsearch 8.11 for fast component search
- **Cache/Queue**: Redis 7 for caching and Celery message broker
- **Background Processing**: Celery 5.3 workers for OCR and analysis

## Available Documentation Analysis

**Available Documentation:**
- ✅ Tech Stack Documentation (CLAUDE.md)
- ✅ Source Tree/Architecture (detailed in CLAUDE.md)
- ✅ Coding Standards (noted in CLAUDE.md)
- ✅ API Documentation (OpenAPI at /docs endpoint)
- ✅ External API Documentation (detailed service architecture)
- ⚠️ UX/UI Guidelines (limited)
- ✅ Technical Debt Documentation (noted in CLAUDE.md)

## Enhancement Scope Definition

**Enhancement Type:**
- ✅ New Feature Addition
- ✅ Major Feature Modification

**Enhancement Description:**
Enhance the existing search functionality with scoped field selection, boolean operators (AND/OR/NOT), wildcard patterns, and project-based saved searches to improve search precision and workflow efficiency for railroad bridge engineers.

**Impact Assessment:**
- ✅ Moderate Impact (some existing code changes)

## Goals and Background Context

**Goals:**
• Provide precise piece mark searching with field scope control
• Enable complex queries using boolean operators and wildcard patterns  
• Reduce repetitive search work through project-based saved searches
• Maintain simple interface while adding power user capabilities
• Eliminate false positives through targeted field searching

**Background Context:**
The current search system provides basic text search across piece_mark, component_type, and description fields simultaneously, which can generate false positives. Engineers frequently perform repetitive searches for component verification and quality control workflows. The enhancement will add precision controls and workflow optimization while maintaining the existing simple search experience for basic users.

---
