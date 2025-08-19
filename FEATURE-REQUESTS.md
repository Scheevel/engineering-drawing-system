## Practical Claude Code Approach to feature implementation
* Start with clear requirements - What exactly needs to be built?  
* Break it into logical chunks - Features, components, utilities  
* Build incrementally - One piece at a time, test as you go  
* Review and refine - Look for edge cases, improve code quality  
*  Document key decisions - Why you chose certain approaches  

---

## 📋 PLANNED: Advanced Search Feature Improvements

**Feature**: Enhance search functionality with scoped field selection, boolean operators, wildcard patterns, and project-based saved searches for improved precision and workflow efficiency.

### **Current Search Analysis:**
✅ **Basic Text Search**: Searches piece_mark, component_type, and description simultaneously  
✅ **Filter Support**: Component type filtering via dropdown  
✅ **Database Fallback**: PostgreSQL-based search when Elasticsearch unavailable  
❌ **Search Scope Control**: Cannot limit search to specific fields  
❌ **Boolean Operators**: No AND/OR/NOT support for complex queries  
❌ **Wildcard Patterns**: No pattern matching (* or ?)  
❌ **Saved Searches**: No ability to save and reuse searches  

### **Implementation Plan:**

#### **1. Scoped Search Control**
**Requirement**: Start with piece_mark only, expandable to other fields

**Backend Changes:**
- **File**: `backend/app/models/search.py`
  - Add `search_scope: List[str]` field to SearchRequest (default: ["piece_mark"])
  - Add validation for allowed scope values
- **File**: `backend/app/services/search_service.py`
  - Modify search logic to only query specified fields
  - Implement dynamic SQL filter building based on scope
  - Maintain backward compatibility

**Frontend Changes:**
- **File**: `frontend/src/pages/SearchPage.tsx`
  - Add checkbox group: "Search in: [✓] Piece Marks [ ] Types [ ] Descriptions"  
  - Default to piece_mark only for precision
  - Show active search scope in results header

#### **2. Boolean Operators & Wildcards**
**Requirement**: Support AND/OR/NOT operators and wildcard patterns

**Backend Implementation:**
- **File**: `backend/app/services/search_service.py`
  - Add `parse_search_query()` function to handle operator parsing
  - Support syntax: "C63 AND girder", "plate NOT steel", "C6*"
  - Convert to appropriate SQL with proper escaping
  - Maintain simple search compatibility

**Query Parser Features:**
```python
# Examples of supported queries:
"C63 AND girder"        → must contain both terms
"plate OR angle"        → contains either term  
"steel NOT aluminum"    → contains first, excludes second
"C6*"                  → wildcard pattern matching
"(beam OR girder) AND W21"  → grouped boolean logic
```

**Frontend Help Integration:**
- Add (?) help tooltip next to search box
- Show syntax examples and quick reference
- Real-time query validation feedback

#### **3. Saved Searches (Project-Based)**
**Requirement**: Save searches on a project basis for workflow efficiency

**Database Schema:**
```sql
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id),
    search_query VARCHAR(500),
    search_scope JSONB,  -- ["piece_mark", "component_type"] 
    filters JSONB,       -- {"component_type": "girder"}
    created_by VARCHAR(100),
    created_at TIMESTAMP
);
```

**Backend API Endpoints:**
- **File**: `backend/app/api/search.py`
  - `POST /api/search/saved` - Save a search
  - `GET /api/search/saved/{project_id}` - List saved searches for project
  - `GET /api/search/saved/execute/{saved_search_id}` - Execute saved search
  - `DELETE /api/search/saved/{saved_search_id}` - Delete saved search

**Frontend Integration:**
- **File**: `frontend/src/pages/SearchPage.tsx`
  - "Save Search" button when search has results
  - Project selection dialog for save operation
  - Saved searches sidebar/dropdown for current project
  - One-click execution of saved searches

#### **4. Enhanced UI/UX Design**
**Requirement**: Simple, straightforward interface improvements

**Search Interface Enhancements:**
```typescript
// Search scope selection
<FormGroup row>
  <FormLabel>Search in:</FormLabel>
  <FormControlLabel 
    control={<Checkbox checked={scope.includes("piece_mark")} />}
    label="Piece Marks" 
  />
  <FormControlLabel 
    control={<Checkbox checked={scope.includes("component_type")} />}
    label="Component Types" 
  />
  <FormControlLabel 
    control={<Checkbox checked={scope.includes("description")} />}
    label="Descriptions" 
  />
</FormGroup>
```

**Saved Search Widget:**
- Collapsible panel: "Saved Searches (Project: Bridge 2024-A)"
- Quick execute buttons with search preview
- Edit/delete options for search management
- Search usage analytics (most used searches)

### **User Experience Flows:**

#### **Flow 1: Precise Piece Mark Search**
1. **Default state**: Only "Piece Marks" checkbox selected
2. **Enter query**: "C6*" (wildcard pattern)  
3. **Results**: All components with piece marks starting with C6
4. **Save search**: Name it "C6 Series Components" for project
5. **Future use**: One-click execution from saved searches

#### **Flow 2: Complex Boolean Search**  
1. **Expand scope**: Enable "Component Types" and "Descriptions"
2. **Enter query**: "(beam OR girder) AND NOT aluminum"
3. **Results**: All beam/girder components excluding aluminum materials
4. **Refine**: Use filters for additional precision
5. **Save**: "Steel Beam Inventory" for project

#### **Flow 3: Saved Search Workflow**
1. **Project context**: Select active project in dashboard
2. **Search page**: Shows saved searches for selected project
3. **Quick execute**: Click "Daily QC Check" saved search
4. **Review results**: Standard search results with saved parameters
5. **Modify**: Edit search parameters and update saved search

### **Technical Implementation Details:**

#### **Search Query Parser:**
```python
class SearchQueryParser:
    def parse(self, query: str) -> SearchAST:
        """Parse search query into Abstract Syntax Tree"""
        # Handle quoted phrases: "wide flange beam"
        # Process boolean operators: AND, OR, NOT
        # Expand wildcards: C6* → C6%, C?3 → C_3  
        # Validate syntax and build SQL fragments
        
    def to_sql(self, ast: SearchAST, scope: List[str]) -> SQLFilter:
        """Convert AST to parameterized SQL WHERE clause"""
```

#### **Scope-Based Search Logic:**
```python
def build_search_filters(query_ast: SearchAST, scope: List[str]):
    filters = []
    for field in scope:
        if field == "piece_mark":
            filters.append(Component.piece_mark.match(query_ast))
        elif field == "component_type": 
            filters.append(Component.component_type.match(query_ast))
        elif field == "description":
            filters.append(Component.description.match(query_ast))
    return or_(*filters)  # Combine with OR logic
```

#### **Saved Search Model:**
```python
class SavedSearch(Base):
    __tablename__ = "saved_searches"
    
    id = Column(UUID, primary_key=True)
    name = Column(String(255), nullable=False) 
    project_id = Column(UUID, ForeignKey("projects.id"))
    search_query = Column(String(500))
    search_scope = Column(JSON)    # ["piece_mark", "component_type"]
    filters = Column(JSON)         # {"component_type": "girder"}
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project")
```

### **Performance Considerations:**

#### **Database Optimization:**
- **Indexes**: Add GIN indexes for text search fields
- **Query Planning**: Profile complex boolean queries  
- **Caching**: Redis cache for frequent saved searches
- **Pagination**: Maintain existing pagination for large result sets

#### **UI Performance:**
- **Debounced Search**: 300ms delay for live search
- **Lazy Loading**: Load saved searches only when needed
- **Search History**: Local storage for recent searches
- **Progressive Enhancement**: Graceful fallback for unsupported features

### **Migration Strategy:**
- **Backward Compatibility**: All existing searches continue working
- **Opt-in Features**: New functionality available via UI controls  
- **Data Migration**: Only new tables added, no existing data changes
- **Feature Flags**: Gradual rollout of advanced features
- **Documentation**: Updated API docs and user guides

### **Success Criteria:**
- **Precision**: Reduced false positives with scoped search
- **Power Users**: Complex queries via boolean operators  
- **Efficiency**: Saved searches eliminate repetitive typing
- **Organization**: Project-based search organization
- **Adoption**: Intuitive UI maintains ease of use for basic searches

### **Implementation Scope:**
**New Files**: 3 files (database migration, saved search models/services)  
**Modified Files**: 4 files (search service, search API, search page, API client)  
**Database Changes**: 1 new table with indexes  
**Estimated Time**: 6-8 hours for complete implementation  
**Dependencies**: Existing project system, database migration tools

### **Future Enhancements:**
- **Search Templates**: Pre-built searches for common workflows
- **Search Analytics**: Track search patterns and optimize
- **Export Search Results**: Direct export functionality from search
- **Advanced Filters**: Date ranges, dimension-based filters
- **Search Suggestions**: AI-powered query suggestions based on usage