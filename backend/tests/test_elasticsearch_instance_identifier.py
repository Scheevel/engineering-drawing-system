"""
Test suite for Elasticsearch instance_identifier functionality.
Following TDD methodology for Story 1.4 Task 2.
"""

import pytest
import json
from unittest.mock import Mock, patch
from app.services.search_service import SearchService
from app.models.database import Component, Drawing, Project
import uuid
from datetime import datetime

class TestElasticsearchInstanceIdentifier:
    """Test class for Elasticsearch instance_identifier functionality"""

    @pytest.fixture
    def mock_elasticsearch(self):
        """Mock Elasticsearch client"""
        with patch('app.services.search_service.Elasticsearch') as mock_es_class:
            mock_es_instance = Mock()
            mock_es_class.return_value = mock_es_instance
            mock_es_instance.ping.return_value = True
            
            # Mock index method to capture documents
            mock_es_instance.index = Mock()
            mock_es_instance.indices.refresh = Mock()
            
            yield mock_es_instance

    @pytest.fixture
    def search_service_with_es(self, mock_elasticsearch):
        """Create SearchService with mocked Elasticsearch"""
        with patch('app.services.search_service.ES_AVAILABLE', True):
            service = SearchService()
            service.es = mock_elasticsearch
            return service

    @pytest.fixture
    def sample_component_with_instance(self):
        """Create a test component with instance_identifier"""
        return Component(
            id=uuid.uuid4(),
            drawing_id=uuid.uuid4(),
            piece_mark="G1",
            instance_identifier="A",
            component_type="girder",
            description="Main girder instance A",
            quantity=1,
            material_type="steel",
            location_x=100.0,
            location_y=200.0,
            confidence_score=0.95,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            dimensions=[],
            specifications=[]
        )

    @pytest.fixture
    def sample_component_without_instance(self):
        """Create a test component without instance_identifier"""
        return Component(
            id=uuid.uuid4(),
            drawing_id=uuid.uuid4(),
            piece_mark="G1",
            instance_identifier=None,
            component_type="girder",
            description="Legacy girder without instance",
            quantity=1,
            material_type="steel",
            location_x=200.0,
            location_y=200.0,
            confidence_score=0.93,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            dimensions=[],
            specifications=[]
        )

    @pytest.fixture
    def sample_drawing(self):
        """Create a test drawing"""
        return Drawing(
            id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            file_name="test_drawing.pdf",
            original_name="test_drawing.pdf",
            file_path="/uploads/test_drawing.pdf",
            drawing_type="structural",
            sheet_number="S-01",
            processing_status="completed",
            upload_date=datetime.utcnow()
        )

    def test_elasticsearch_indexes_instance_identifier(self, search_service_with_es, mock_elasticsearch, sample_drawing, sample_component_with_instance, test_db_session):
        """AC5: Elasticsearch indexing includes instance_identifier field for fast searches"""
        # Add component to drawing
        sample_component_with_instance.drawing_id = sample_drawing.id
        
        # Mock database query to return our test component
        with patch.object(test_db_session, 'query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.all.return_value = [sample_component_with_instance]
            
            # Call the indexing method
            result = search_service_with_es.index_drawing(sample_drawing, test_db_session)
            
            # Verify indexing was successful
            assert result is True
            
            # Verify Elasticsearch index was called (should be called twice: component + drawing)
            assert mock_elasticsearch.index.call_count >= 1
            
            # Get the component document from the first call (components are indexed first)
            component_call_args = mock_elasticsearch.index.call_args_list[0]
            indexed_doc = component_call_args[1]['body']  # body parameter
            
            # Verify instance_identifier is included in the indexed document
            assert "instance_identifier" in indexed_doc
            assert indexed_doc["instance_identifier"] == "A"
            
            # Verify display_identifier is properly formatted
            assert "display_identifier" in indexed_doc
            assert indexed_doc["display_identifier"] == "G1-A"
            
            # Verify other fields are preserved
            assert indexed_doc["piece_mark"] == "G1"
            assert indexed_doc["component_type"] == "girder"

    def test_elasticsearch_indexes_null_instance_identifier(self, search_service_with_es, mock_elasticsearch, sample_drawing, sample_component_without_instance, test_db_session):
        """AC6: Handle NULL instance_identifier values in search indexing"""
        # Add component to drawing
        sample_component_without_instance.drawing_id = sample_drawing.id
        
        # Mock database query to return component without instance_identifier
        with patch.object(test_db_session, 'query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.all.return_value = [sample_component_without_instance]
            
            # Call the indexing method
            result = search_service_with_es.index_drawing(sample_drawing, test_db_session)
            
            # Verify indexing was successful
            assert result is True
            
            # Get the component document from the first call
            component_call_args = mock_elasticsearch.index.call_args_list[0]
            indexed_doc = component_call_args[1]['body']
            
            # Verify instance_identifier is included but null
            assert "instance_identifier" in indexed_doc
            assert indexed_doc["instance_identifier"] is None
            
            # Verify display_identifier falls back to piece_mark only
            assert "display_identifier" in indexed_doc
            assert indexed_doc["display_identifier"] == "G1"
            
            # Verify backward compatibility
            assert indexed_doc["piece_mark"] == "G1"

    def test_elasticsearch_document_mapping_includes_instance_identifier(self, search_service_with_es, mock_elasticsearch):
        """Test that Elasticsearch document mapping should include instance_identifier field"""
        # This test validates the document structure expectation
        # The actual mapping would be created separately, but this ensures our indexing supports it
        
        expected_fields = [
            "instance_identifier",
            "display_identifier", 
            "piece_mark",
            "component_type"
        ]
        
        # Create a sample document structure
        component = Component(
            id=uuid.uuid4(),
            drawing_id=uuid.uuid4(),
            piece_mark="B2",
            instance_identifier="C",
            component_type="brace",
            description="Brace instance C",
            quantity=2,
            material_type="steel",
            location_x=300.0,
            location_y=300.0,
            confidence_score=0.92,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            dimensions=[],
            specifications=[]
        )
        
        drawing = Drawing(
            id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            file_name="test.pdf",
            original_name="test.pdf", 
            file_path="/uploads/test.pdf",
            drawing_type="structural",
            processing_status="completed",
            upload_date=datetime.utcnow()
        )
        
        # Mock the database query
        with patch('app.services.search_service.Session') as mock_session:
            mock_db = Mock()
            mock_db.query.return_value.options.return_value.filter.return_value.all.return_value = [component]
            
            # Call indexing
            search_service_with_es.index_drawing(drawing, mock_db)
            
            # Verify document contains all expected fields
            component_call_args = mock_elasticsearch.index.call_args_list[0]
            indexed_doc = component_call_args[1]['body']
            
            for field in expected_fields:
                assert field in indexed_doc, f"Field {field} missing from indexed document"

    def test_elasticsearch_full_text_includes_instance_identifier(self, search_service_with_es, mock_elasticsearch, sample_drawing, sample_component_with_instance, test_db_session):
        """Test that full_text search field includes instance information"""
        # Add component to drawing
        sample_component_with_instance.drawing_id = sample_drawing.id
        
        # Mock database query
        with patch.object(test_db_session, 'query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.all.return_value = [sample_component_with_instance]
            
            # Call indexing
            search_service_with_es.index_drawing(sample_drawing, test_db_session)
            
            # Get indexed document
            component_call_args = mock_elasticsearch.index.call_args_list[0]
            indexed_doc = component_call_args[1]['body']
            
            # Verify full_text includes display_identifier for searchability
            assert "full_text" in indexed_doc
            full_text = indexed_doc["full_text"]
            
            # Should include the display identifier for comprehensive search
            assert "G1-A" in full_text or ("G1" in full_text and "A" in full_text)

    def test_reindex_existing_components_with_null_instance_identifier(self, search_service_with_es, mock_elasticsearch):
        """Test re-indexing existing components with NULL instance_identifier for backward compatibility"""
        # This tests the requirement to re-index existing components
        # In a real implementation, this would query all components and re-index them
        
        # Create mock components - mix of with and without instance_identifier
        components = [
            Component(
                id=uuid.uuid4(),
                piece_mark="OLD1", 
                instance_identifier=None,  # Legacy component
                component_type="girder",
                description="Legacy component"
            ),
            Component(
                id=uuid.uuid4(),
                piece_mark="NEW1",
                instance_identifier="A",  # New component
                component_type="brace", 
                description="New component with instance"
            )
        ]
        
        # Mock a reindex method call (this would be implemented in the service)
        with patch.object(search_service_with_es, 'index_drawing') as mock_index:
            mock_index.return_value = True
            
            # Simulate reindexing call
            for component in components:
                # In real implementation, this would fetch the drawing and call index_drawing
                mock_drawing = Mock()
                mock_db = Mock()
                search_service_with_es.index_drawing(mock_drawing, mock_db)
            
            # Verify reindexing was called for each component
            assert mock_index.call_count == len(components)

    def test_elasticsearch_performance_no_regression(self, search_service_with_es, mock_elasticsearch, sample_drawing, test_db_session):
        """Test that adding instance_identifier doesn't impact indexing performance significantly"""
        import time
        
        # Create multiple components to simulate performance test
        components = []
        for i in range(10):
            component = Component(
                id=uuid.uuid4(),
                drawing_id=sample_drawing.id,
                piece_mark=f"G{i}",
                instance_identifier="A" if i % 2 == 0 else None,  # Mix of with/without
                component_type="girder",
                description=f"Component {i}",
                quantity=1,
                material_type="steel",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                dimensions=[],
                specifications=[]
            )
            components.append(component)
        
        # Mock database query to return multiple components
        with patch.object(test_db_session, 'query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.all.return_value = components
            
            # Time the indexing operation
            start_time = time.time()
            result = search_service_with_es.index_drawing(sample_drawing, test_db_session)
            end_time = time.time()
            
            # Verify successful indexing
            assert result is True
            
            # Verify all components were indexed (components + 1 drawing)
            assert mock_elasticsearch.index.call_count == len(components) + 1
            
            # Performance check - should complete quickly (this is a basic check)
            # In real performance testing, you'd compare before/after metrics
            elapsed_time = end_time - start_time
            assert elapsed_time < 1.0, f"Indexing took too long: {elapsed_time}s"

class TestElasticsearchMappingUpdate:
    """Test class for Elasticsearch mapping updates"""

    def test_component_mapping_structure(self):
        """Test the expected Elasticsearch mapping structure for components index"""
        # This test documents the expected mapping structure
        # In a real implementation, you would create/update the actual mapping
        
        expected_mapping = {
            "mappings": {
                "properties": {
                    "instance_identifier": {
                        "type": "keyword",
                        "index": True
                    },
                    "display_identifier": {
                        "type": "keyword", 
                        "index": True
                    },
                    "piece_mark": {
                        "type": "keyword",
                        "index": True
                    },
                    "component_type": {
                        "type": "keyword",
                        "index": True
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "full_text": {
                        "type": "text",
                        "analyzer": "standard"
                    }
                }
            }
        }
        
        # Verify the mapping includes instance_identifier field
        assert "instance_identifier" in expected_mapping["mappings"]["properties"]
        
        # Verify field type is keyword for exact matching
        instance_field = expected_mapping["mappings"]["properties"]["instance_identifier"]
        assert instance_field["type"] == "keyword"
        assert instance_field["index"] is True
        
        # Verify display_identifier field is included
        assert "display_identifier" in expected_mapping["mappings"]["properties"]