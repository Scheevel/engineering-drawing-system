import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Toolbar,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Drawer,
  Divider,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as FitToScreenIcon,
  Fullscreen as FullscreenIcon,
  List as ComponentListIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  EditOff as EditOffIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { getDrawing, getDrawingFile, getDrawingComponents, ComponentMarker, deleteComponent } from '../services/api.ts';
import FlexibleComponentCard from '../components/flexible/FlexibleComponentCard.tsx';
import DrawingContextMenu from '../components/drawing/DrawingContextMenu.tsx';
import ComponentCreationDialog from '../components/drawing/ComponentCreationDialog.tsx';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ViewerState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isFullscreen: boolean;
  showComponents: boolean;
  highlightedComponent: string | null;
}

interface ContextMenuState {
  open: boolean;
  anchorPosition: { left: number; top: number } | null;
  clickedComponent: {
    id: string;
    piece_mark: string;
    manual_creation?: boolean;
  } | null;
  position: { x: number; y: number } | null;
}

const DrawingViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const queryClient = useQueryClient();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewerState, setViewerState] = useState<ViewerState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isFullscreen: false,
    showComponents: true,
    highlightedComponent: highlightParam,
  });
  
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [componentListOpen, setComponentListOpen] = useState(false);
  const [enableTransition, setEnableTransition] = useState(true);
  const [overlayRefreshKey, setOverlayRefreshKey] = useState(0);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  
  // Edit mode and context menu state
  const [editMode, setEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    anchorPosition: null,
    clickedComponent: null,
    position: null,
  });
  const [componentCreationOpen, setComponentCreationOpen] = useState(false);
  const [creationPosition, setCreationPosition] = useState<{ x: number; y: number } | null>(null);

  // Fetch drawing data
  const { data: drawing, isLoading: drawingLoading, error: drawingError } = useQuery(
    ['drawing', id],
    () => getDrawing(id!),
    { enabled: !!id }
  );

  // Fetch components data
  const { data: componentsData, isLoading: componentsLoading } = useQuery(
    ['drawing-components', id],
    () => getDrawingComponents(id!),
    { enabled: !!id }
  );

  const components = useMemo(() => componentsData?.components || [], [componentsData?.components]);

  const fitToScreen = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const containerWidth = container.clientWidth - 40; // padding
    const containerHeight = container.clientHeight - 100; // toolbar space
    
    const scaleX = containerWidth / canvas.width;
    const scaleY = containerHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    
    setViewerState(prev => ({
      ...prev,
      scale,
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  const renderPDFPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // High DPI

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Fit to screen initially
      fitToScreen();
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  }, [fitToScreen]);

  const loadPDF = useCallback(async (url: string) => {
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      setPdfDocument(pdf);
      renderPDFPage(pdf, 1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }, [renderPDFPage]);

  const loadImage = useCallback((url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Fit to screen initially
      fitToScreen();
    };
    img.onerror = () => {
      console.error('Error loading image');
    };
    img.src = url;
  }, [fitToScreen]);

  const handleComponentClick = useCallback((componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component || !component.location_x || !component.location_y) return;

    // Calculate appropriate zoom level based on component and viewport
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set a zoom level that gives good detail
    // If component has bounding box, calculate zoom to fit it nicely
    let targetScale = 2.0; // Default zoom
    
    if (component.bounding_box) {
      const { width, height } = component.bounding_box;
      const viewportWidth = container.clientWidth * 0.6; // Use 60% of viewport
      const viewportHeight = container.clientHeight * 0.6;
      
      // Calculate scale to fit bounding box in viewport
      const scaleX = viewportWidth / width;
      const scaleY = viewportHeight / height;
      targetScale = Math.min(scaleX, scaleY, 3.0); // Max 3x zoom
      targetScale = Math.max(targetScale, 1.5); // Min 1.5x zoom
    }
    
    // Center on component with zoom
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    
    const targetX = component.location_x * targetScale;
    const targetY = component.location_y * targetScale;
    
    // If component has bounding box, center on its middle
    if (component.bounding_box) {
      const centerOffsetX = (component.bounding_box.width / 2) * targetScale;
      const centerOffsetY = (component.bounding_box.height / 2) * targetScale;
      
      setViewerState(prev => ({
        ...prev,
        highlightedComponent: componentId,
        scale: targetScale,
        offsetX: centerX - targetX - centerOffsetX,
        offsetY: centerY - targetY - centerOffsetY,
      }));
    } else {
      setViewerState(prev => ({
        ...prev,
        highlightedComponent: componentId,
        scale: targetScale,
        offsetX: centerX - targetX,
        offsetY: centerY - targetY,
      }));
    }
    
    // Close the drawer after selection for better viewing
    setComponentListOpen(false);
    
    // Force overlay refresh after component state change
    setTimeout(() => {
      setOverlayRefreshKey(prev => prev + 1);
    }, 50);
  }, [components]);

  // Handle canvas clicks to detect component label clicks
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only handle component clicks when not in edit mode
    if (editMode) return;
    
    console.log('Canvas clicked!', e);
    
    if (!canvasRef.current || !overlayRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const container = containerRef.current;
    
    // Get the container rect since the canvas transform is applied to the container
    const containerRect = container.getBoundingClientRect();
    
    // Get click position relative to container
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    
    console.log('Click position (container-relative):', { clickX, clickY });
    console.log('Container rect:', containerRect);
    console.log('Viewer state:', viewerState);
    
    // Convert to drawing coordinates accounting for scale and offset
    const drawingX = (clickX - viewerState.offsetX) / viewerState.scale;
    const drawingY = (clickY - viewerState.offsetY) / viewerState.scale;
    
    console.log('Drawing coordinates:', { drawingX, drawingY });
    console.log('Components to check:', components.length);

    // Check if click is on any component label
    for (const component of components) {
      if (!component.location_x || !component.location_y) continue;

      // Calculate text dimensions (matching the rendering logic)
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.font = 'bold 16px Arial';
      const textMetrics = ctx.measureText(component.piece_mark);
      const textWidth = textMetrics.width;
      const textHeight = 18;
      
      // Calculate text position and background area
      const textX = component.location_x;
      const textY = component.location_y - 15;
      const padding = 4;
      
      // Define clickable area (text background with padding)
      const bgX = textX - (textWidth / 2) - padding;
      const bgY = textY - textHeight + 2;
      const bgWidth = textWidth + (padding * 2);
      const bgHeight = textHeight + 2;
      
      console.log(`Checking component ${component.piece_mark}:`, {
        componentLocation: { x: component.location_x, y: component.location_y },
        textDims: { width: textWidth, height: textHeight },
        clickableArea: { bgX, bgY, bgWidth, bgHeight },
        isInside: drawingX >= bgX && drawingX <= bgX + bgWidth && drawingY >= bgY && drawingY <= bgY + bgHeight
      });
      
      // Check if click is within the component label area
      if (drawingX >= bgX && drawingX <= bgX + bgWidth &&
          drawingY >= bgY && drawingY <= bgY + bgHeight) {
        console.log('MATCH! Opening modal for component:', component.piece_mark);
        // Open component detail modal
        setSelectedComponentId(component.id);
        setComponentModalOpen(true);
        return; // Exit after first match
      }
    }
  }, [components, viewerState, editMode]);

  // Load drawing file
  useEffect(() => {
    if (!drawing || !id) return;

    const fileUrl = getDrawingFile(id);
    const fileExt = drawing.file_name.toLowerCase();

    if (fileExt.includes('.pdf')) {
      loadPDF(fileUrl);
    } else if (fileExt.includes('.jpg') || fileExt.includes('.jpeg') || fileExt.includes('.png')) {
      loadImage(fileUrl);
    }
  }, [drawing, id, loadPDF, loadImage]);

  // Auto-zoom to highlighted component when page loads
  useEffect(() => {
    if (!highlightParam || !components.length || !canvasRef.current || !containerRef.current) return;
    
    // Small delay to ensure canvas is fully rendered
    const timer = setTimeout(() => {
      handleComponentClick(highlightParam);
    }, 500);

    return () => clearTimeout(timer);
  }, [highlightParam, components, handleComponentClick]);

  // Ensure highlighted component from URL is properly set
  useEffect(() => {
    if (highlightParam && !viewerState.highlightedComponent) {
      setViewerState(prev => ({
        ...prev,
        highlightedComponent: highlightParam
      }));
    }
  }, [highlightParam, viewerState.highlightedComponent]);

  // Component highlighting overlay
  useEffect(() => {
    if (!overlayRef.current || !canvasRef.current) return;
    
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Match overlay size to canvas
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    
    // Clear overlay
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    if (!viewerState.showComponents || components.length === 0) return;

    // Draw component markers
    components.forEach((component) => {
      if (!component.location_x || !component.location_y) return;

      const isHighlighted = component.id === viewerState.highlightedComponent;
      const isPending = component.review_status === 'pending';
      const isManualCreation = component.manual_creation === true;
      
      // Draw bounding box if available
      if (component.bounding_box) {
        const { x, y, width, height } = component.bounding_box;
        
        // Different colors for different component states
        if (isHighlighted) {
          ctx.strokeStyle = '#ff4444';
        } else if (isPending) {
          ctx.strokeStyle = '#ff9800'; // Orange for pending review
        } else {
          ctx.strokeStyle = '#44ff44'; // Green for verified
        }
        
        ctx.lineWidth = isHighlighted ? 3 : 2;
        
        // Use dashed line for pending components
        if (isPending && !isHighlighted) {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.strokeRect(x, y, width, height);
        
        if (isHighlighted) {
          ctx.fillStyle = 'rgba(255, 68, 68, 0.1)';
          ctx.fillRect(x, y, width, height);
        }
      }

      // Prepare text styling
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const textMetrics = ctx.measureText(component.piece_mark);
      const textWidth = textMetrics.width;
      const textHeight = 18; // Approximate height for 16px font
      
      // Calculate text position
      const textX = component.location_x;
      const textY = component.location_y - 15;
      
      // Draw background highlight behind text
      const padding = 4;
      const bgX = textX - (textWidth / 2) - padding;
      const bgY = textY - textHeight + 2; // Adjust for text baseline
      const bgWidth = textWidth + (padding * 2);
      const bgHeight = textHeight + 2;
      
      // Background color with transparency based on component state
      if (isHighlighted) {
        ctx.fillStyle = 'rgba(255, 68, 68, 0.8)'; // Red highlight for selected
      } else if (isPending) {
        ctx.fillStyle = 'rgba(255, 152, 0, 0.8)'; // Orange for pending review
      } else {
        ctx.fillStyle = 'rgba(68, 255, 68, 0.8)'; // Green for verified
      }
      
      // Draw rounded rectangle background
      ctx.beginPath();
      const radius = 3;
      
      // Manual rounded rectangle drawing for better browser compatibility
      ctx.moveTo(bgX + radius, bgY);
      ctx.lineTo(bgX + bgWidth - radius, bgY);
      ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
      ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
      ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
      ctx.lineTo(bgX + radius, bgY + bgHeight);
      ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
      ctx.lineTo(bgX, bgY + radius);
      ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
      ctx.closePath();
      ctx.fill();
      
      // Add subtle border to background with state-based colors
      if (isHighlighted) {
        ctx.strokeStyle = '#cc0000'; // Red for highlighted
      } else if (isPending) {
        ctx.strokeStyle = '#f57c00'; // Darker orange for pending
      } else {
        ctx.strokeStyle = '#00cc00'; // Green for verified
      }
      
      ctx.lineWidth = 1;
      
      // Use dashed border for pending markers
      if (isPending && !isHighlighted) {
        ctx.setLineDash([3, 3]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.stroke();
      
      // Reset line dash for text
      ctx.setLineDash([]);

      // Draw piece mark label with white text for contrast
      ctx.fillStyle = '#ffffff';
      ctx.fillText(component.piece_mark, textX, textY);
      
      // Add pending indicator for markers that need review
      if (isPending && !isHighlighted) {
        const badgeRadius = 8;
        const badgeX = textX + (textWidth / 2) + padding + badgeRadius;
        const badgeY = textY - textHeight + badgeRadius + 2;
        
        // Draw small orange circle
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff9800';
        ctx.fill();
        ctx.strokeStyle = '#f57c00';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw "P" for pending
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('P', badgeX, badgeY + 3);
        
        // Reset font for next component
        ctx.font = 'bold 16px Arial';
      }
    });
  }, [components, viewerState.showComponents, viewerState.highlightedComponent, overlayRefreshKey]);

  const handleZoomIn = () => {
    zoomToCenter(1.5);
  };

  const handleZoomOut = () => {
    zoomToCenter(1 / 1.5);
  };

  const zoomToCenter = (zoomFactor: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Get the center point of the viewport
    const viewportCenterX = container.clientWidth / 2;
    const viewportCenterY = container.clientHeight / 2;

    setViewerState(prev => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale * zoomFactor));
      
      // Calculate the point in the drawing that's currently at viewport center
      const drawingPointX = (viewportCenterX - prev.offsetX) / prev.scale;
      const drawingPointY = (viewportCenterY - prev.offsetY) / prev.scale;
      
      // Calculate new offset to keep that point at viewport center
      const newOffsetX = viewportCenterX - (drawingPointX * newScale);
      const newOffsetY = viewportCenterY - (drawingPointY * newScale);
      
      return {
        ...prev,
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  };

  // Mouse handlers for pan/zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging on right-click
    if (e.button === 2) return;
    
    setDragging(true);
    setEnableTransition(false); // Disable transitions during drag
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setViewerState(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY,
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    setEnableTransition(true); // Re-enable transitions after drag
  };

  // Handle right-click for context menu
  const handleCanvasRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    console.log('Right-click detected! Edit mode:', editMode);
    
    // Remove edit mode requirement - allow right-click in any mode
    if (!canvasRef.current || !containerRef.current) {
      console.log('Context menu blocked: missing canvas refs');
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get click position relative to container
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    
    // Convert to drawing coordinates
    const drawingX = (clickX - viewerState.offsetX) / viewerState.scale;
    const drawingY = (clickY - viewerState.offsetY) / viewerState.scale;
    
    // Check if right-click is on a component
    let clickedComponent = null;
    for (const component of components) {
      if (!component.location_x || !component.location_y) continue;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.font = 'bold 16px Arial';
      const textMetrics = ctx.measureText(component.piece_mark);
      const textWidth = textMetrics.width;
      const textHeight = 18;
      
      const textX = component.location_x;
      const textY = component.location_y - 15;
      const padding = 4;
      
      const bgX = textX - (textWidth / 2) - padding;
      const bgY = textY - textHeight + 2;
      const bgWidth = textWidth + (padding * 2);
      const bgHeight = textHeight + 2;
      
      if (drawingX >= bgX && drawingX <= bgX + bgWidth &&
          drawingY >= bgY && drawingY <= bgY + bgHeight) {
        clickedComponent = {
          id: component.id,
          piece_mark: component.piece_mark,
          manual_creation: false, // Will be determined by actual data
        };
        break;
      }
    }
    
    console.log('Showing context menu at:', { x: e.clientX, y: e.clientY });
    console.log('Drawing position:', { drawingX, drawingY });
    console.log('Clicked component:', clickedComponent);
    console.log('Current edit mode:', editMode);
    
    // Show context menu
    setContextMenu({
      open: true,
      anchorPosition: { left: e.clientX, top: e.clientY },
      clickedComponent,
      position: { x: drawingX, y: drawingY },
    });
  }, [editMode, viewerState, components]);

  // Context menu handlers
  const handleContextMenuClose = () => {
    setContextMenu({
      open: false,
      anchorPosition: null,
      clickedComponent: null,
      position: null,
    });
  };

  const handleCreateComponent = () => {
    if (contextMenu.position) {
      setCreationPosition(contextMenu.position);
      setComponentCreationOpen(true);
    }
    handleContextMenuClose();
  };

  const handleEditComponent = (componentId: string) => {
    // Navigate to component editor
    window.open(`/component-editor/${componentId}`, '_blank');
    handleContextMenuClose();
  };

  const handleDeleteComponent = async (componentId: string) => {
    try {
      // Show confirmation dialog
      if (!window.confirm('Are you sure you want to delete this component? This action cannot be undone.')) {
        handleContextMenuClose();
        return;
      }

      console.log('Deleting component:', componentId);
      
      // Delete the component
      await deleteComponent(componentId);
      
      // Refresh the components data
      queryClient.invalidateQueries(['drawing-components', id]);
      queryClient.invalidateQueries(['search']);
      
      console.log('Component deleted successfully');
    } catch (error) {
      console.error('Failed to delete component:', error);
      alert('Failed to delete component. Please try again.');
    }
    
    handleContextMenuClose();
  };

  const handleDuplicateComponent = (componentId: string) => {
    // TODO: Implement component duplication
    console.log('Duplicate component:', componentId);
    handleContextMenuClose();
  };

  const handleVerifyComponent = (componentId: string) => {
    // TODO: Implement component verification
    console.log('Verify component:', componentId);
    handleContextMenuClose();
  };

  const handleComponentCreated = (newComponent: any) => {
    // Refresh components data
    queryClient.invalidateQueries(['drawing-components', id]);
    setComponentCreationOpen(false);
    setCreationPosition(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    const container = containerRef.current;
    if (!container) return;

    // Disable smooth transition for wheel zoom for immediate response
    setEnableTransition(false);

    // Get mouse position relative to the container
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewerState(prev => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale * delta));
      
      // Calculate the point in the drawing that's currently under the mouse
      const drawingPointX = (mouseX - prev.offsetX) / prev.scale;
      const drawingPointY = (mouseY - prev.offsetY) / prev.scale;
      
      // Calculate new offset to keep that point under the mouse
      const newOffsetX = mouseX - (drawingPointX * newScale);
      const newOffsetY = mouseY - (drawingPointY * newScale);
      
      return {
        ...prev,
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });

    // Re-enable transitions after a short delay
    setTimeout(() => setEnableTransition(true), 100);
  };

  if (drawingLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (drawingError || !drawing) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load drawing. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ 
        mb: 1, 
        position: 'sticky', 
        top: 64, 
        zIndex: (theme) => theme.zIndex.appBar + 1,
        backgroundColor: 'background.paper'
      }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {drawing.file_name}
            {drawing.sheet_number && ` - Sheet ${drawing.sheet_number}`}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {`${components.length} components`}
                  <ComponentListIcon sx={{ fontSize: 16 }} />
                </Box>
              }
              size="small" 
              color="primary"
              onClick={() => setComponentListOpen(true)}
              sx={{ cursor: 'pointer' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={viewerState.showComponents}
                  onChange={(e) => setViewerState(prev => ({ 
                    ...prev, 
                    showComponents: e.target.checked 
                  }))}
                  size="small"
                />
              }
              label="Show Components"
              sx={{ ml: 2 }}
            />
            
            <Tooltip title={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}>
              <IconButton 
                onClick={() => setEditMode(!editMode)}
                color={editMode ? "primary" : "default"}
              >
                {editMode ? <EditOffIcon /> : <EditIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Fit to Screen">
              <IconButton onClick={fitToScreen}>
                <FitToScreenIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Paper>

      {/* Drawing Canvas */}
      <Box 
        ref={containerRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          position: 'relative',
          bgcolor: 'grey.100',
          cursor: dragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Box
          sx={{
            position: 'absolute',
            transform: `translate(${viewerState.offsetX}px, ${viewerState.offsetY}px) scale(${viewerState.scale})`,
            transformOrigin: '0 0',
            transition: enableTransition ? 'transform 0.3s ease-in-out' : 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ 
              display: 'block',
              border: '1px solid #ccc',
              backgroundColor: 'white'
            }}
          />
          <canvas
            ref={overlayRef}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasRightClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              cursor: editMode ? 'crosshair' : 'pointer',
            }}
          />
        </Box>
      </Box>

      {/* Component List Drawer */}
      <Drawer
        anchor="right"
        open={componentListOpen}
        onClose={() => setComponentListOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 350 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Components ({components.length})
          </Typography>
          <Divider />
          
          <List dense>
            {components.map((component) => (
              <ListItem key={component.id} disablePadding>
                <ListItemButton
                  onClick={() => handleComponentClick(component.id)}
                  selected={component.id === viewerState.highlightedComponent}
                  sx={{
                    borderLeft: component.id === viewerState.highlightedComponent 
                      ? '4px solid #ff4444' 
                      : '4px solid transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body1" 
                        fontWeight={component.id === viewerState.highlightedComponent ? 'bold' : 'normal'}
                      >
                        {component.piece_mark}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {component.component_type || 'Unknown Type'}
                        </Typography>
                        {component.confidence_score !== null && component.confidence_score !== undefined && (
                          <Chip
                            label={`${Math.round(component.confidence_score * 100)}%`}
                            size="small"
                            color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                        {component.location_x && component.location_y && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Location: ({Math.round(component.location_x)}, {Math.round(component.location_y)})
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Component Detail Modal */}
      {selectedComponentId && (
        <FlexibleComponentCard
          componentId={selectedComponentId}
          open={componentModalOpen}
          onClose={() => {
            setComponentModalOpen(false);
            setSelectedComponentId(null);
          }}
          mode="view"
        />
      )}
      
      {/* Context Menu */}
      <DrawingContextMenu
        open={contextMenu.open}
        anchorPosition={contextMenu.anchorPosition}
        onClose={handleContextMenuClose}
        clickedComponent={contextMenu.clickedComponent}
        onCreateComponent={handleCreateComponent}
        onEditComponent={handleEditComponent}
        onDeleteComponent={handleDeleteComponent}
        onDuplicateComponent={handleDuplicateComponent}
        onVerifyComponent={handleVerifyComponent}
        editMode={editMode}
      />
      
      {/* Component Creation Dialog */}
      <ComponentCreationDialog
        open={componentCreationOpen}
        onClose={() => {
          setComponentCreationOpen(false);
          setCreationPosition(null);
        }}
        drawingId={id!}
        position={creationPosition}
        onComponentCreated={handleComponentCreated}
        quickMode={!editMode} // Use quick mode when not in edit mode
      />
    </Box>
  );
};

export default DrawingViewer;