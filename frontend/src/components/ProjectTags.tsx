import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import { removeDrawingFromProject, type ProjectSummary } from '../services/api.ts';
import { useSnackbar } from '../contexts/SnackbarContext.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';

interface ProjectTagsProps {
  drawingId: string;
  projects?: ProjectSummary[];
  onAssignClick: () => void;
  compact?: boolean;
}

const ProjectTags: React.FC<ProjectTagsProps> = ({
  drawingId,
  projects = [],
  onAssignClick,
  compact = false,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [confirmRemove, setConfirmRemove] = useState<{projectId: string; projectName: string} | null>(null);

  // Remove project mutation
  const removeMutation = useMutation(
    ({ projectId }: { projectId: string }) => removeDrawingFromProject(drawingId, projectId),
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries('drawings');
        queryClient.invalidateQueries('projects');
        const projectName = confirmRemove?.projectName || 'project';
        showSuccess(`Drawing removed from ${projectName}`);
        setConfirmRemove(null);
      },
      onError: (error: any) => {
        showError(error?.message || 'Failed to remove drawing from project');
      },
    }
  );

  const handleRemoveClick = (projectId: string, projectName: string) => {
    setConfirmRemove({ projectId, projectName });
  };

  const handleConfirmRemove = () => {
    if (confirmRemove) {
      removeMutation.mutate({ projectId: confirmRemove.projectId });
    }
  };

  // Story 8.1b: Display unassigned badge if no projects
  if (projects.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={<FolderOpenIcon />}
          label="Unassigned"
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          sx={{ color: 'text.secondary', borderColor: 'text.secondary' }}
        />
        <Tooltip title="Assign to projects">
          <IconButton size="small" onClick={onAssignClick}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // Story 8.1b: Display project chips with delete capability
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {projects.map((project) => (
          <Chip
            key={project.id}
            icon={<FolderIcon />}
            label={project.name}
            size={compact ? 'small' : 'medium'}
            color="primary"
            variant="outlined"
            onDelete={() => handleRemoveClick(project.id, project.name)}
            deleteIcon={
              <Tooltip title="Remove from project">
                <CloseIcon />
              </Tooltip>
            }
          />
        ))}
        <Tooltip title="Assign to more projects">
          <IconButton size="small" onClick={onAssignClick}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove from Project?"
        message={`Are you sure you want to remove this drawing from project "${confirmRemove?.projectName}"?`}
        confirmText="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(null)}
        loading={removeMutation.isLoading}
        severity="error"
      />
    </Box>
  );
};

export default ProjectTags;
