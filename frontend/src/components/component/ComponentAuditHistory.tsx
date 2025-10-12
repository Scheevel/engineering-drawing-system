import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import { getComponentAuditHistory } from '../../services/api';

interface AuditRecord {
  id: string;
  component_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  session_id: string | null;
  timestamp: string;
  change_reason: string | null;
}

interface GroupedAuditRecords {
  [sessionId: string]: AuditRecord[];
}

interface ComponentAuditHistoryProps {
  componentId: string;
}

const ComponentAuditHistory: React.FC<ComponentAuditHistoryProps> = ({ componentId }) => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await getComponentAuditHistory(componentId);
        setAuditRecords(records);
      } catch (err: any) {
        setError(err.message || 'Failed to load audit history');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditHistory();
  }, [componentId]);

  // Group records by session_id for schema changes
  const groupRecordsBySession = (): GroupedAuditRecords => {
    const grouped: GroupedAuditRecords = {};
    const ungrouped: AuditRecord[] = [];

    auditRecords.forEach((record) => {
      if (record.session_id) {
        if (!grouped[record.session_id]) {
          grouped[record.session_id] = [];
        }
        grouped[record.session_id].push(record);
      } else {
        ungrouped.push(record);
      }
    });

    // Add ungrouped records as individual "sessions"
    ungrouped.forEach((record) => {
      grouped[record.id] = [record];
    });

    return grouped;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatJsonValue = (value: string | null): string => {
    if (!value) return '-';

    try {
      // Try to parse as JSON and pretty-print
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, return as-is
      return value;
    }
  };

  const truncateValue = (value: string | null, maxLength: number = 100): string => {
    if (!value) return '-';
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  const isSchemaChange = (records: AuditRecord[]): boolean => {
    return records.some(r => r.field_name === 'schema_id' || r.field_name === 'dynamic_data');
  };

  const getSessionTitle = (records: AuditRecord[]): string => {
    if (isSchemaChange(records)) {
      return 'Schema Change';
    }
    return records[0]?.action || 'Change';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (auditRecords.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No History Available
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Changes to this component will appear here
        </Typography>
      </Box>
    );
  }

  const groupedRecords = groupRecordsBySession();

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Component History
      </Typography>

      <Box mt={2}>
        {Object.entries(groupedRecords).map(([sessionId, records]) => (
          <Accordion key={sessionId} defaultExpanded={records.length > 1}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Chip
                  label={getSessionTitle(records)}
                  color={isSchemaChange(records) ? 'primary' : 'default'}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {formatTimestamp(records[0].timestamp)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                  {records.length} change{records.length > 1 ? 's' : ''}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Old Value</TableCell>
                      <TableCell>New Value</TableCell>
                      <TableCell>Changed By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {record.field_name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxWidth: '300px',
                            }}
                          >
                            {record.field_name === 'dynamic_data'
                              ? formatJsonValue(record.old_value)
                              : truncateValue(record.old_value)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxWidth: '300px',
                            }}
                          >
                            {record.field_name === 'dynamic_data'
                              ? formatJsonValue(record.new_value)
                              : truncateValue(record.new_value)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.changed_by || '(system)'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default ComponentAuditHistory;
