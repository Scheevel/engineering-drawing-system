# Multiple Piece Mark Instances - Product Requirements Document (PRD)

## Goals and Background Context

### Goals

**Desired outcomes for the Multiple Piece Mark Instances feature:**

• **Enable multiple instances of same piece mark per drawing** - Allow "G1" to appear multiple times with different dimensional relationships
• **Provide clear differentiation system** - Users can distinguish between G1.A, G1.B, G1.C instances  
• **Maintain unified search experience** - Searching "G1" returns all instances grouped together
• **Preserve existing functionality** - Current single piece mark workflows continue to work seamlessly
• **Support engineering measurement workflows** - Multiple distance measurements from same piece mark to different drawing elements

### Background Context

The current Engineering Drawing Index System enforces unique piece marks per drawing, which creates limitations for real-world engineering scenarios. In practice, the same structural component (like beam "G1") often appears multiple times on a single drawing, with engineers needing to measure different distances from each instance to various other components. This constraint forces engineers to create workaround naming conventions or limits their ability to accurately capture dimensional relationships.

This feature addresses a fundamental data modeling gap between the software's current constraints and actual engineering drawing analysis workflows, enabling more accurate component tracking and dimensional data capture while maintaining the system's core search and editing capabilities.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-21 | 1.0 | Initial PRD creation for Multiple Piece Mark Instances | John (PM) |

## Requirements

### Functional Requirements

**FR1:** The system shall allow multiple instances of the same piece mark within a single drawing (e.g., "G1", "G1", "G1" can all exist)

**FR2:** The system shall support both automatic instance generation (.A, .B, .C) and manual instance naming (user-defined suffixes like -North, -Detail-A) when multiple instances are created

**FR3:** The system shall maintain the base piece mark as the primary search term, returning all instances when users search for "G1" (showing G1.A, G1.B, G1.C, or G1-North, G1-South in results)

**FR4:** The system shall allow individual editing of instance-specific properties (location coordinates, dimensions, specifications) while providing options to apply common properties (material type, basic component info) across all instances of the same base piece mark

**FR5:** The system shall preserve existing single piece mark functionality for drawings with unique piece marks, with no impact on current workflows

**FR6:** The system shall display instance notation clearly in search results, component lists, and editing interfaces to differentiate between multiple instances

**FR7:** The system shall allow users to create dimensional measurements from any specific piece mark instance to other drawing elements

**FR8:** The system shall provide clear UI feedback when creating instances and include confirmation workflows to prevent accidental duplicate creation

### Non-Functional Requirements

**NFR1:** Database migration shall include rollback procedures, data validation scripts, and staged deployment strategy to preserve existing piece mark data integrity during the transition to support multiple instances

**NFR2:** Search performance shall not degrade by more than 200ms when returning results with multiple piece mark instances, with performance testing scenarios for 100+ instances per piece mark

**NFR3:** The system shall maintain API backward compatibility through versioning, with clear migration paths documented for existing API clients that expect unique piece marks per drawing

**NFR4:** Instance identifier generation shall follow deterministic business rules with collision handling and provide stable identifiers across system restarts and data migrations

**NFR5:** The system shall handle edge cases gracefully, including large numbers of instances (100+) per piece mark and mixed automatic/manual naming within the same drawing

## User Interface Design Goals

### Overall UX Vision

The multiple piece mark instances feature should seamlessly integrate into the existing Component Detail Modal and search interfaces, maintaining the current sophisticated editing workflows while adding clear visual differentiation for instances. Users should feel that instance management is a natural extension of the existing system rather than a separate feature bolted on.

### Key Interaction Paradigms

- **Explicit Instance Creation (MVP Approach)**: Users create instances through dedicated "Add Instance" action rather than duplicate detection, providing clear user control and simpler implementation path
- **Hierarchical Search Results**: Search results use indentation with badges to show base piece marks and their instances, balancing visual clarity with technical simplicity
- **Prominent Instance Navigation**: The Component Detail Modal features discoverable instance navigation with usage analytics tracking for future optimization
- **Smart Defaults with User Override**: The system suggests logical instance names (.A, .B, .C sequence) while allowing full manual override

### Core Screens and Views

- **Enhanced Search Results Page**: Modified to display hierarchical indentation (base piece mark → indented instances) with instance count badges
- **Instance Creation Interface**: "Add Instance" button/action within existing component workflows rather than separate modal
- **Updated Component Detail Modal**: Enhanced with prominent instance selector/navigator and clear instance identification header
- **Instance Analytics Dashboard**: (Future iteration) Usage tracking to optimize navigation prominence based on real user behavior

### Accessibility: WCAG AA

The instance differentiation features must meet WCAG AA standards, with particular attention to:
- Hierarchical indentation that works with screen readers
- Instance navigation keyboard shortcuts and focus management
- Badge text that provides clear context without relying solely on visual indicators
- High contrast for instance identifiers and navigation elements

### Branding

Maintain consistency with existing Material-UI component library and engineering-focused design patterns. Instance indicators use subtle hierarchical typography and small badges rather than bold colors. Navigation elements integrate with existing modal patterns.

### Target Device and Platforms: Web Responsive

Primary focus on desktop/laptop engineering workstations with secondary consideration for tablet use in field situations. Hierarchical indentation and prominent navigation designed to work effectively on both large engineering monitors and tablet-sized screens.

## Technical Assumptions

### Repository Structure: Monorepo

**Rationale**: The existing system uses a monorepo structure with frontend and backend services in the same repository, managed through Docker Compose. The multiple piece mark instances feature will extend existing components rather than create new services.

### Service Architecture

**Constraint**: Existing service-oriented monolith architecture with FastAPI + Python backend and React + TypeScript frontend  
**Decision**: The multiple piece mark feature will extend existing ComponentService and SearchService rather than creating new microservices  
**Rationale**: This feature primarily involves data model changes and UI enhancements that fit naturally into existing service boundaries. Creating new services would add unnecessary complexity for what is essentially a data modeling evolution.

### Testing Requirements

**Existing Pattern**: Unit tests with pytest (backend) and Jest + React Testing Library (frontend)  
**Enhancement**: Integration testing for database migration scenarios and component instance workflows  
**Rationale**: The database schema changes require thorough migration testing, and the UI changes need comprehensive component interaction testing

### Additional Technical Assumptions and Requests

**Database Schema Changes:**
- Modify existing `components` table unique constraint from `(drawing_id, piece_mark)` to support multiple instances
- Add `instance_identifier` field to differentiate between instances (e.g., ".A", ".B", ".C", "-North")
- Implement database migration scripts with rollback capability

**API Versioning Strategy:**
- Maintain v1 API backward compatibility through response structure preservation
- Introduce optional `include_instances` parameter for endpoints that need instance data
- Version any new endpoints as v2 if breaking changes are unavoidable

**Frontend State Management:**
- Extend existing React Query patterns for component data with instance-aware caching
- Enhance React Hook Form validation to handle instance-specific vs. shared property editing
- Leverage existing Material-UI component library for instance navigation elements

**Search Index Changes:**
- Modify Elasticsearch index mapping to include instance_identifier field
- Update search algorithms to group instances under base piece marks in results
- Implement index migration strategy for existing component data

**Background Processing:**
- Extend existing Celery workers to handle batch instance operations if needed
- Maintain existing OCR processing patterns - no changes required for instance support

**Infrastructure Constraints:**
- Continue using Docker Compose for development environment
- Maintain existing PostgreSQL + PostGIS spatial capabilities
- No additional infrastructure services required

## Epic List

### Epic 1: Multiple Piece Mark Data Foundation & Core API
Establish database schema changes, migration procedures, and core backend API modifications to support multiple piece mark instances with proper validation and backward compatibility.

### Epic 2: Instance Creation & Management User Interface
Implement frontend workflows for creating, editing, and navigating between piece mark instances through enhanced Component Detail Modal and instance management interfaces.

### Epic 3: Advanced Instance Search & Production Optimization
Complete the feature with sophisticated search result grouping, hierarchical display, performance optimization, and advanced instance management capabilities for production deployment.

## Epic 1: Multiple Piece Mark Data Foundation & Core API

**Epic Goal:** Establish the core database schema changes and backend API modifications necessary to support multiple instances of the same piece mark within a drawing, ensuring data integrity, backward compatibility, and proper migration procedures. This epic delivers a complete backend foundation that can be tested via API endpoints and supports future frontend development.

### Story 1.1: Database Schema Migration for Multiple Piece Mark Instances

As a **system administrator**,
I want **the database schema to support multiple instances of the same piece mark per drawing**,
so that **engineers can store multiple occurrences of components like "G1" without unique constraint violations**.

**Acceptance Criteria:**
1. Remove unique constraint on (drawing_id, piece_mark) from components table
2. Add instance_identifier field (VARCHAR(10)) to components table with default NULL for existing records
3. Create new composite unique constraint on (drawing_id, piece_mark, instance_identifier)
4. Migration script preserves all existing component data without data loss
5. Migration includes rollback script for reverting changes if needed
6. Database performance tests show no regression in component query times

### Story 1.2: Core Component API - Multiple Instance Support

As a **frontend developer**,
I want **backend APIs that can create and manage multiple piece mark instances**,
so that **I can build UI workflows for instance creation and editing**.

**Acceptance Criteria:**
1. POST /api/v1/components endpoint accepts instance_identifier in request body
2. GET /api/v1/components/{id} returns instance_identifier in response
3. PUT /api/v1/components/{id} allows updating instance_identifier with validation
4. API automatically generates instance_identifier (.A, .B, .C) when not provided and piece mark already exists
5. Validation prevents duplicate (piece_mark + instance_identifier) combinations within same drawing
6. All existing API clients continue to work without modification (backward compatibility)

### Story 1.3: Component Service Business Logic for Instance Management

As a **backend developer**,
I want **business logic that handles instance creation, validation, and naming rules**,
so that **the system can intelligently manage multiple piece mark instances according to engineering requirements**.

**Acceptance Criteria:**
1. ComponentService automatically detects when creating duplicate piece mark and generates instance identifier
2. Instance naming supports both automatic (.A, .B, .C) and manual (-North, -Detail-A) formats
3. Business validation prevents orphaned instances (can't delete last instance of a piece mark)
4. Bulk operations support creating multiple instances from template data
5. Audit logging tracks all instance creation, modification, and deletion operations
6. Error handling provides clear messages for instance-related validation failures

### Story 1.4: Database Migration Deployment and Validation

As a **DevOps engineer**,
I want **reliable deployment procedures for the database schema changes**,
so that **the migration can be executed safely in production with minimal downtime**.

**Acceptance Criteria:**
1. Migration script runs successfully in staging environment with production data copy
2. Performance benchmarks show component queries maintain sub-200ms response times
3. Data validation script confirms all existing components preserved with correct instance_identifier values
4. Rollback procedure tested and verified to restore original schema and data
5. Migration documentation includes step-by-step deployment instructions
6. Zero-downtime deployment strategy documented for production rollout

## Epic 2: Instance Creation & Management User Interface

**Epic Goal:** Implement comprehensive frontend workflows that enable engineers to create, edit, and navigate between piece mark instances through intuitive user interfaces. This epic delivers complete user functionality for instance management, building on the backend foundation from Epic 1 to provide immediate value to engineering teams.

### Story 2.1: Instance Creation UI Workflow

As an **engineer**,
I want **a clear interface for creating multiple instances of the same piece mark**,
so that **I can add "G1" multiple times to a drawing without confusion or errors**.

**Acceptance Criteria:**
1. "Add Instance" button appears when user attempts to create piece mark that already exists in drawing
2. Instance creation dialog allows choice between automatic naming (.A, .B, .C) and manual naming
3. Manual naming field validates against existing instance identifiers and provides real-time feedback
4. Preview shows how the new instance will appear in lists and search results
5. Creation process provides clear success confirmation with new instance identifier
6. Error handling guides users through naming conflicts and validation issues

### Story 2.2: Enhanced Component Detail Modal with Instance Navigation

As an **engineer**,
I want **the Component Detail Modal to clearly show which instance I'm editing and allow navigation between instances**,
so that **I can efficiently manage multiple instances of the same piece mark**.

**Acceptance Criteria:**
1. Modal header prominently displays piece mark with instance identifier (e.g., "G1.A")
2. Instance navigation dropdown/selector shows all instances of same base piece mark
3. Switching between instances preserves unsaved changes with user confirmation
4. Instance-specific properties (location, dimensions) clearly differentiated from shared properties
5. Navigation maintains modal state and doesn't force full reload
6. Keyboard shortcuts (Ctrl+Left/Right) navigate between instances of same piece mark

### Story 2.3: Instance-Aware Component Lists and Tables

As an **engineer**,
I want **component lists to clearly display instance identifiers and group related instances**,
so that **I can quickly identify and work with specific instances of piece marks**.

**Acceptance Criteria:**
1. Component tables display piece mark with instance identifier in dedicated column
2. Sorting options include "by base piece mark" and "by full identifier" modes
3. Filtering allows showing all instances of specific piece mark (e.g., all "G1" variants)
4. Instance count badges show total instances per base piece mark
5. Bulk selection supports selecting all instances of same base piece mark
6. Export functions include instance identifiers in output data

### Story 2.4: Instance Property Management - Individual vs Shared

As an **engineer**,
I want **control over which properties apply to individual instances vs all instances of a piece mark**,
so that **I can efficiently manage common specifications while maintaining instance-specific details**.

**Acceptance Criteria:**
1. Component editing form clearly indicates instance-specific fields (location, dimensions) vs shared fields (material type, basic description)
2. "Apply to all instances" option available for shared property changes
3. Bulk edit dialog allows updating common properties across multiple instances
4. Change confirmation shows which instances will be affected before applying updates
5. Undo functionality works correctly for both individual and bulk instance changes
6. Audit trail clearly indicates whether changes affected single instance or multiple instances

## Epic 3: Advanced Instance Search & Production Optimization

**Epic Goal:** Complete the multiple piece mark instances feature with sophisticated search result grouping, hierarchical display capabilities, performance optimization for large datasets, and production-ready monitoring. This epic transforms the feature from functional to production-excellent, enabling engineers to efficiently find and manage instances at enterprise scale.

### Story 3.1: Hierarchical Search Results with Instance Grouping

As an **engineer**,
I want **search results to group all instances under their base piece mark with expandable hierarchy**,
so that **I can quickly find either specific instances or all variants of a piece mark**.

**Acceptance Criteria:**
1. Search results display base piece marks with instance count badges (e.g., "G1 (3 instances)")
2. Expandable/collapsible groups show individual instances with full identifiers (G1.A, G1.B, G1.C)
3. Search for "G1" returns grouped results; search for "G1.A" highlights specific instance within group
4. Keyboard navigation works through grouped results with arrow keys and expand/collapse
5. Instance groups persist expand/collapse state during session
6. Mobile/tablet view maintains hierarchy with touch-friendly expand/collapse controls

### Story 3.2: Advanced Instance Search Capabilities

As an **engineer**,
I want **advanced search options specifically designed for instance management**,
so that **I can efficiently locate instances based on various criteria and relationships**.

**Acceptance Criteria:**
1. Search filters include "Show only instances" vs "Show all components" toggle
2. "Find duplicates" search mode identifies potential duplicate instances across drawings
3. Instance-specific filters: search by instance naming pattern (.A/.B vs -North/-South)
4. Relationship search: find all instances that have dimensional measurements to specific target
5. Search suggestions include both base piece marks and specific instances in dropdown
6. Search history tracks instance-specific queries separately from general component searches

### Story 3.3: Search Performance Optimization for Instance Datasets

As a **system administrator**,
I want **search performance to remain fast even with large numbers of piece mark instances**,
so that **engineers can work efficiently with complex drawings containing many component variants**.

**Acceptance Criteria:**
1. Search response times remain under 500ms for drawings with 1000+ component instances
2. Elasticsearch index optimization handles instance grouping efficiently
3. Pagination works correctly with grouped results (maintains group boundaries)
4. Search result caching handles instance-specific queries appropriately
5. Database query optimization prevents N+1 problems when loading instance relationships
6. Performance monitoring alerts when search response times exceed thresholds

### Story 3.4: Instance Analytics and Production Monitoring

As a **product manager**,
I want **analytics and monitoring for instance feature usage and performance**,
so that **we can optimize the feature based on real engineering workflows and ensure production stability**.

**Acceptance Criteria:**
1. Usage analytics track instance creation patterns (auto vs manual naming preferences)
2. Search analytics measure grouped vs individual instance query frequencies
3. Performance dashboards monitor instance-related database query times and search latency
4. Error tracking captures instance-specific validation failures and user confusion points
5. User behavior analysis shows instance navigation patterns in Component Detail Modal
6. A/B testing framework ready for future instance UX optimization experiments

## Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 92%  
**MVP Scope Appropriateness:** Just Right  
**Readiness for Architecture Phase:** Ready  
**Most Critical Gap:** Limited user research validation

### Category Analysis Table

| Category                         | Status  | Critical Issues |
| -------------------------------- | ------- | --------------- |
| 1. Problem Definition & Context  | PASS    | Missing competitive analysis |
| 2. MVP Scope Definition          | PASS    | None |
| 3. User Experience Requirements  | PASS    | None |
| 4. Functional Requirements       | PASS    | None |
| 5. Non-Functional Requirements   | PASS    | None |
| 6. Epic & Story Structure        | PASS    | None |
| 7. Technical Guidance            | PASS    | Database migration complexity needs architect attention |
| 8. Cross-Functional Requirements | PARTIAL | Testing strategy could be more detailed |
| 9. Clarity & Communication       | PASS    | None |

### Recommendations

1. **Proceed to Architecture Phase**: PRD is comprehensive and ready for detailed technical design
2. **User Validation**: Consider brief user interview validation before implementation begins
3. **Architect Focus Areas**: Database migration strategy and search performance optimization
4. **Testing Strategy**: Collaborate with architect to define detailed testing approach for migration scenarios

### Final Decision

**✅ READY FOR ARCHITECT**: The PRD and epics are comprehensive, properly structured, and ready for architectural design with minor recommendations for user validation.

## Next Steps

### UX Expert Prompt

Please create detailed wireframes and interaction designs for the Multiple Piece Mark Instances feature based on this PRD. Focus on:

1. **Instance Creation UI Workflow** - Design the "Add Instance" interface with automatic vs manual naming options
2. **Enhanced Component Detail Modal** - Create instance navigation controls and clear instance identification
3. **Hierarchical Search Results** - Design grouped search results with expandable instance lists and badges
4. **Instance-Aware Component Lists** - Design table layouts that clearly show instance identifiers and grouping

Key UX considerations from the PRD:
- Maintain Material-UI design consistency with existing engineering-focused interface
- Ensure WCAG AA accessibility compliance for instance navigation
- Design for both desktop engineering workstations and tablet field use
- Balance discoverability of new instance features with simplicity for existing users

### Architect Prompt

Please create detailed technical architecture and implementation specifications for the Multiple Piece Mark Instances feature using this PRD as your foundation. Focus on:

1. **Database Schema Migration Strategy** - Design safe migration procedures for removing unique constraints and adding instance_identifier fields
2. **API Design and Versioning** - Specify endpoint modifications and backward compatibility approach
3. **Search Index Architecture** - Plan Elasticsearch mapping changes and instance grouping algorithms
4. **Frontend State Management** - Design React Query patterns for instance-aware component caching and editing workflows

Key technical priorities from the PRD:
- Ensure zero-downtime migration strategy for production deployment
- Maintain sub-200ms search performance with large instance datasets
- Preserve all existing API functionality while adding instance capabilities
- Leverage existing PostgreSQL + PostGIS and React + TypeScript technology stack