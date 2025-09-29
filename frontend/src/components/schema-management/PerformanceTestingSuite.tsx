/**
 * Performance Testing Suite for Schema Management
 *
 * Comprehensive testing component for measuring baseline performance
 * of schema validation, field operations, and form rendering.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import { performanceTester, PERFORMANCE_THRESHOLDS, usePerformanceTesting } from '../../utils/performanceTesting';
import {
  createSchema,
  validateDataAgainstSchema,
  addSchemaField,
  updateSchemaField,
  ComponentSchemaCreate,
  ComponentSchemaFieldCreate,
  SchemaFieldType
} from '../../services/api';

interface TestResults {
  [key: string]: {
    duration: number;
    passed: boolean;
    threshold: number;
    metadata?: Record<string, any>;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`performance-tabpanel-${index}`}
    aria-labelledby={`performance-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const PerformanceTestingSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults>({});
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');

  const { measureAsync, benchmark, getReport } = usePerformanceTesting();

  // Generate test schema with configurable complexity
  const generateTestSchema = useCallback((fieldCount: number, complexity: 'simple' | 'complex' = 'simple'): ComponentSchemaCreate => {
    const fields: ComponentSchemaFieldCreate[] = [];

    for (let i = 0; i < fieldCount; i++) {
      const fieldTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];
      const fieldType = fieldTypes[i % fieldTypes.length];

      let fieldConfig: Record<string, any> = {};

      if (complexity === 'complex') {
        switch (fieldType) {
          case 'select':
            fieldConfig = {
              options: Array.from({ length: 20 }, (_, idx) => `Option ${idx + 1}`),
              multiple: i % 3 === 0
            };
            break;
          case 'text':
            fieldConfig = {
              minLength: 5,
              maxLength: 100,
              pattern: '^[A-Za-z0-9\\s\\-_\\.]+$',
              validation_rules: ['required', 'unique', 'format_check']
            };
            break;
          case 'number':
            fieldConfig = {
              min: 0,
              max: 10000,
              step: 0.01,
              validation_rules: ['required', 'range_check', 'precision_check']
            };
            break;
          default:
            fieldConfig = {
              validation_rules: ['required', 'format_check']
            };
        }
      }

      fields.push({
        field_name: `test_field_${i + 1}`,
        field_type: fieldType,
        field_config: fieldConfig,
        help_text: complexity === 'complex' ? `Complex validation help for field ${i + 1}` : `Help text ${i + 1}`,
        display_order: i,
        is_required: i % 3 === 0 // Every 3rd field is required
      });
    }

    return {
      name: `Performance Test Schema ${fieldCount} Fields`,
      description: `Test schema with ${fieldCount} fields for performance benchmarking`,
      fields,
      is_default: false
    };
  }, []);

  // Generate complex test data
  const generateTestData = useCallback((schema: any, complexity: 'valid' | 'invalid' | 'mixed' = 'valid') => {
    const data: Record<string, any> = {};

    schema.fields?.forEach((field: any, index: number) => {
      const fieldName = field.field_name;

      switch (complexity) {
        case 'valid':
          switch (field.field_type) {
            case 'text':
              data[fieldName] = `Valid text value ${index}`;
              break;
            case 'number':
              data[fieldName] = Math.random() * 1000;
              break;
            case 'select':
              data[fieldName] = field.field_config?.options?.[0] || 'Option 1';
              break;
            case 'checkbox':
              data[fieldName] = index % 2 === 0;
              break;
            case 'date':
              data[fieldName] = new Date().toISOString().split('T')[0];
              break;
            default:
              data[fieldName] = `Value ${index}`;
          }
          break;
        case 'invalid':
          // Intentionally invalid data
          switch (field.field_type) {
            case 'number':
              data[fieldName] = 'not a number';
              break;
            case 'select':
              data[fieldName] = 'invalid option';
              break;
            default:
              data[fieldName] = field.is_required ? '' : `Invalid ${index}`;
          }
          break;
        case 'mixed':
          // Mix of valid and invalid
          if (index % 3 === 0) {
            data[fieldName] = field.is_required ? '' : null; // Invalid
          } else {
            // Valid data
            switch (field.field_type) {
              case 'number':
                data[fieldName] = Math.random() * 1000;
                break;
              default:
                data[fieldName] = `Valid ${index}`;
            }
          }
          break;
      }
    });

    return data;
  }, []);

  // Test schema validation performance
  const testSchemaValidation = useCallback(async () => {
    const results: TestResults = {};

    try {
      // Test 1: Simple schema validation (10 fields)
      setCurrentTest('Creating simple test schema...');
      const simpleSchema = generateTestSchema(10, 'simple');
      const { result: createdSimpleSchema } = await measureAsync(
        'create_simple_schema',
        () => createSchema(simpleSchema)
      );

      const simpleData = generateTestData(createdSimpleSchema, 'valid');
      const { duration: simpleValidationTime } = await measureAsync(
        'validate_simple_schema',
        () => validateDataAgainstSchema(createdSimpleSchema.id, simpleData),
        { fieldCount: 10, complexity: 'simple' }
      );

      results['simple_validation'] = {
        duration: simpleValidationTime,
        passed: simpleValidationTime < PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        threshold: PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        metadata: { fieldCount: 10, complexity: 'simple' }
      };

      // Test 2: Complex schema validation (50+ fields)
      setCurrentTest('Creating complex test schema...');
      const complexSchema = generateTestSchema(55, 'complex');
      const { result: createdComplexSchema } = await measureAsync(
        'create_complex_schema',
        () => createSchema(complexSchema)
      );

      const complexData = generateTestData(createdComplexSchema, 'valid');
      const { duration: complexValidationTime } = await measureAsync(
        'validate_complex_schema',
        () => validateDataAgainstSchema(createdComplexSchema.id, complexData),
        { fieldCount: 55, complexity: 'complex' }
      );

      results['complex_validation'] = {
        duration: complexValidationTime,
        passed: complexValidationTime < PERFORMANCE_THRESHOLDS.COMPLEX_VALIDATION,
        threshold: PERFORMANCE_THRESHOLDS.COMPLEX_VALIDATION,
        metadata: { fieldCount: 55, complexity: 'complex' }
      };

      // Test 3: Mixed validation data
      setCurrentTest('Testing mixed validation scenarios...');
      const mixedData = generateTestData(createdComplexSchema, 'mixed');
      const { duration: mixedValidationTime } = await measureAsync(
        'validate_mixed_data',
        () => validateDataAgainstSchema(createdComplexSchema.id, mixedData),
        { fieldCount: 55, complexity: 'mixed', dataQuality: 'mixed' }
      );

      results['mixed_validation'] = {
        duration: mixedValidationTime,
        passed: mixedValidationTime < PERFORMANCE_THRESHOLDS.COMPLEX_VALIDATION,
        threshold: PERFORMANCE_THRESHOLDS.COMPLEX_VALIDATION,
        metadata: { fieldCount: 55, complexity: 'mixed' }
      };

      // Test 4: Field operations performance
      setCurrentTest('Testing field operations...');
      const newField: ComponentSchemaFieldCreate = {
        field_name: 'performance_test_field',
        field_type: 'text',
        field_config: {},
        help_text: 'Performance test field',
        display_order: 999,
        is_required: false
      };

      const { duration: addFieldTime } = await measureAsync(
        'add_schema_field',
        () => addSchemaField(createdComplexSchema.id, newField)
      );

      results['add_field_operation'] = {
        duration: addFieldTime,
        passed: addFieldTime < PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        threshold: PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        metadata: { operation: 'add_field' }
      };

    } catch (error) {
      console.error('Performance testing error:', error);
      throw new Error(`Performance test failed: ${(error as Error).message}`);
    }

    return results;
  }, [generateTestSchema, generateTestData, measureAsync]);

  // Benchmark repeated operations
  const benchmarkOperations = useCallback(async () => {
    setCurrentTest('Running benchmark iterations...');

    const simpleSchema = generateTestSchema(5, 'simple');
    const { result: createdSchema } = await measureAsync(
      'create_benchmark_schema',
      () => createSchema(simpleSchema)
    );

    const testData = generateTestData(createdSchema, 'valid');

    // Benchmark validation with multiple iterations
    const validationBenchmark = await benchmark(
      'validation_benchmark',
      () => validateDataAgainstSchema(createdSchema.id, testData),
      10, // 10 iterations
      { fieldCount: 5, complexity: 'simple' }
    );

    return {
      'benchmark_validation': {
        duration: validationBenchmark.averageDuration,
        passed: validationBenchmark.averageDuration < PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        threshold: PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATES,
        metadata: {
          iterations: validationBenchmark.iterations,
          minDuration: validationBenchmark.minDuration,
          maxDuration: validationBenchmark.maxDuration,
          standardDeviation: Math.sqrt(
            validationBenchmark.metrics.reduce((sum, m) =>
              sum + Math.pow(m.duration - validationBenchmark.averageDuration, 2), 0
            ) / validationBenchmark.iterations
          )
        }
      }
    };
  }, [generateTestSchema, generateTestData, measureAsync, benchmark]);

  // Run comprehensive performance tests
  const runPerformanceTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults({});
    setCurrentTest('Initializing performance tests...');

    try {
      performanceTester.clearMetrics();

      // Run validation tests
      setProgress(25);
      const validationResults = await testSchemaValidation();

      // Run benchmark tests
      setProgress(75);
      const benchmarkResults = await benchmarkOperations();

      // Combine results
      const allResults = { ...validationResults, ...benchmarkResults };
      setTestResults(allResults);

      setProgress(100);
      setCurrentTest('Performance tests completed');

    } catch (error) {
      console.error('Performance test suite failed:', error);
      setCurrentTest(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  }, [testSchemaValidation, benchmarkOperations]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    Object.entries(testResults).forEach(([testName, result]) => {
      if (!result.passed) {
        recommendations.push(
          `${testName}: ${result.duration.toFixed(2)}ms exceeds ${result.threshold}ms threshold`
        );
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All performance tests passed! System meets performance requirements.');
    }

    return recommendations;
  }, [testResults]);

  const formatDuration = (duration: number) => `${duration.toFixed(2)}ms`;

  const getStatusColor = (passed: boolean) => passed ? 'success' : 'error';
  const getStatusIcon = (passed: boolean) => passed ? <CheckIcon /> : <WarningIcon />;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <SpeedIcon color="primary" />
        <Typography variant="h4" component="h1">
          Schema Management Performance Testing Suite
        </Typography>
      </Box>

      <Typography variant="body1" color="text.secondary" mb={3}>
        Comprehensive performance baseline testing for schema validation, field operations, and form rendering.
        Tests are designed to measure against the performance targets defined in Story 3.4-deps.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Test Controls
          </Typography>
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <LoadingButton
              variant="contained"
              loading={isRunning}
              onClick={runPerformanceTests}
              startIcon={<PlayIcon />}
              disabled={isRunning}
            >
              Run Performance Tests
            </LoadingButton>
            {isRunning && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={() => setIsRunning(false)}
              >
                Cancel Tests
              </Button>
            )}
          </Box>

          {isRunning && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {currentTest}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Test Results" />
        <Tab label="Performance Report" />
        <Tab label="Recommendations" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Test Results
            </Typography>
            {Object.keys(testResults).length === 0 ? (
              <Alert severity="info">
                No test results available. Run the performance tests to see baseline measurements.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Test Name</TableCell>
                      <TableCell align="right">Duration</TableCell>
                      <TableCell align="right">Threshold</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell>Metadata</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(testResults).map(([testName, result]) => (
                      <TableRow key={testName}>
                        <TableCell component="th" scope="row">
                          {testName.replace(/_/g, ' ').toUpperCase()}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={result.passed ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {formatDuration(result.duration)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatDuration(result.threshold)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(result.passed)}
                            label={result.passed ? 'PASS' : 'FAIL'}
                            color={getStatusColor(result.passed)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {result.metadata ? JSON.stringify(result.metadata, null, 2) : 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed Performance Report
            </Typography>
            {Object.keys(testResults).length === 0 ? (
              <Alert severity="info">
                Run performance tests to generate a detailed report.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Performance Thresholds
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" size="small">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Operation</TableCell>
                          <TableCell align="right">Threshold</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(PERFORMANCE_THRESHOLDS).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right">{value}ms</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Test Summary
                  </Typography>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Tests: {Object.keys(testResults).length}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Passed: {Object.values(testResults).filter(r => r.passed).length}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      Failed: {Object.values(testResults).filter(r => !r.passed).length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Recommendations
            </Typography>
            {Object.keys(testResults).length === 0 ? (
              <Alert severity="info">
                Run performance tests to receive optimization recommendations.
              </Alert>
            ) : (
              <Box>
                {getRecommendations().map((recommendation, index) => (
                  <Alert
                    key={index}
                    severity={recommendation.includes('passed') ? 'success' : 'warning'}
                    sx={{ mb: 2 }}
                  >
                    {recommendation}
                  </Alert>
                ))}

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      Optimization Strategies
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      <strong>For Schema Validation:</strong>
                    </Typography>
                    <ul>
                      <li>Consider debouncing real-time validation for fields with complex rules</li>
                      <li>Implement client-side caching for schema definitions</li>
                      <li>Use incremental validation for large forms</li>
                      <li>Optimize validation rule evaluation order</li>
                    </ul>

                    <Typography variant="body2" paragraph>
                      <strong>For Field Operations:</strong>
                    </Typography>
                    <ul>
                      <li>Implement optimistic updates for immediate UI feedback</li>
                      <li>Batch multiple field operations when possible</li>
                      <li>Use virtualization for forms with many fields</li>
                      <li>Consider lazy loading for complex field configurations</li>
                    </ul>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default PerformanceTestingSuite;