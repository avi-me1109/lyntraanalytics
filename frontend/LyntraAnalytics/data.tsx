//Mock Types
export type CourseID = 'global' | 'CS571' | 'ME101' | 'CS472';

export interface weeklyMetrics {
  activationRate: number;
  weeklyActiveUsersPercentage: number;
  aiBreakdownCoverageRate: number;
  averageSessionsPerStudentPerWeek: number;
  assignmentBreakdownUsageRate: number;
  studentNPS: number;
  professorNPS: number;
  retentionRate: number;
  criticalIssues: number;
  canvasLmsSyncErrors: number;
  week: number;
  date: string;
}

export const MOCK_DATA: Record<CourseID, weeklyMetrics | weeklyMetrics[]> = {
  global: [
    {week: 1, date: '2024-01-01', activationRate: 75, weeklyActiveUsersPercentage: 60, aiBreakdownCoverageRate: 80, averageSessionsPerStudentPerWeek: 4.5, assignmentBreakdownUsageRate: 65, studentNPS: 7.5, professorNPS: 8.0, retentionRate: 70, criticalIssues: 5, canvasLmsSyncErrors: 2},
    {week: 2, date: '2024-01-08', activationRate: 78, weeklyActiveUsersPercentage: 62, aiBreakdownCoverageRate: 82, averageSessionsPerStudentPerWeek: 4.8, assignmentBreakdownUsageRate: 68, studentNPS: 7.8, professorNPS: 8.2, retentionRate: 72, criticalIssues: 3, canvasLmsSyncErrors: 1},
    {week: 3, date: '2024-01-15', activationRate: 72, weeklyActiveUsersPercentage: 58, aiBreakdownCoverageRate: 78, averageSessionsPerStudentPerWeek: 4.2, assignmentBreakdownUsageRate: 62, studentNPS: 7.2, professorNPS: 7.8, retentionRate: 68, criticalIssues: 7, canvasLmsSyncErrors: 3},
    {week: 4, date: '2024-01-22', activationRate: 80, weeklyActiveUsersPercentage: 65, aiBreakdownCoverageRate: 85, averageSessionsPerStudentPerWeek: 5.0, assignmentBreakdownUsageRate: 70, studentNPS: 8.0, professorNPS: 8.5, retentionRate: 75, criticalIssues: 2, canvasLmsSyncErrors: 1},
    {week: 5, date: '2024-01-29', activationRate: 82, weeklyActiveUsersPercentage: 68, aiBreakdownCoverageRate: 88, averageSessionsPerStudentPerWeek: 5.2, assignmentBreakdownUsageRate: 72, studentNPS: 8.2, professorNPS: 8.7, retentionRate: 78, criticalIssues: 1, canvasLmsSyncErrors: 0},
    {week: 6, date: '2024-02-05', activationRate: 85, weeklyActiveUsersPercentage: 70, aiBreakdownCoverageRate: 90, averageSessionsPerStudentPerWeek: 5.5, assignmentBreakdownUsageRate: 75, studentNPS: 8.5, professorNPS: 9.0, retentionRate: 80, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 7, date: '2024-02-12', activationRate: 88, weeklyActiveUsersPercentage: 72, aiBreakdownCoverageRate: 92, averageSessionsPerStudentPerWeek: 5.8, assignmentBreakdownUsageRate: 78, studentNPS: 8.8, professorNPS: 9.2, retentionRate: 82, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 8, date: '2024-02-19', activationRate: 90, weeklyActiveUsersPercentage: 75, aiBreakdownCoverageRate: 95, averageSessionsPerStudentPerWeek: 6.0, assignmentBreakdownUsageRate: 80, studentNPS: 9.0, professorNPS: 9.5, retentionRate: 85, criticalIssues: 0, canvasLmsSyncErrors: 0},
  ],
  CS571: [
    {week: 1, date: '2024-01-01', activationRate: 78, weeklyActiveUsersPercentage: 62, aiBreakdownCoverageRate: 82, averageSessionsPerStudentPerWeek: 4.8, assignmentBreakdownUsageRate: 68, studentNPS: 7.8, professorNPS: 8.2, retentionRate: 72, criticalIssues: 3, canvasLmsSyncErrors: 1},
    {week: 2, date: '2024-01-08', activationRate: 80, weeklyActiveUsersPercentage: 65, aiBreakdownCoverageRate: 85, averageSessionsPerStudentPerWeek: 5.0, assignmentBreakdownUsageRate: 70, studentNPS: 8.0, professorNPS: 8.5, retentionRate: 75, criticalIssues: 2, canvasLmsSyncErrors: 1},
    {week: 3, date: '2024-01-15', activationRate: 82, weeklyActiveUsersPercentage: 68, aiBreakdownCoverageRate: 88, averageSessionsPerStudentPerWeek: 5.2, assignmentBreakdownUsageRate: 72, studentNPS: 8.2, professorNPS: 8.7, retentionRate: 78, criticalIssues: 1, canvasLmsSyncErrors: 0},
    {week: 4, date: '2024-01-22', activationRate: 85, weeklyActiveUsersPercentage: 70, aiBreakdownCoverageRate: 90, averageSessionsPerStudentPerWeek: 5.5, assignmentBreakdownUsageRate: 75, studentNPS: 8.5, professorNPS: 9.0, retentionRate: 80, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 5, date: '2024-01-29', activationRate: 88, weeklyActiveUsersPercentage: 72, aiBreakdownCoverageRate: 92, averageSessionsPerStudentPerWeek: 5.8, assignmentBreakdownUsageRate: 78, studentNPS: 8.8, professorNPS: 9.2, retentionRate: 82, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 6, date: '2024-02-05', activationRate: 90, weeklyActiveUsersPercentage: 75, aiBreakdownCoverageRate: 95, averageSessionsPerStudentPerWeek: 6.0, assignmentBreakdownUsageRate: 80, studentNPS: 9.0, professorNPS: 9.5, retentionRate: 85, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 7, date: '2024-02-12', activationRate: 92, weeklyActiveUsersPercentage: 78, aiBreakdownCoverageRate: 98, averageSessionsPerStudentPerWeek: 6.2, assignmentBreakdownUsageRate: 82, studentNPS: 9.2, professorNPS: 9.7, retentionRate: 88, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 8, date: '2024-02-19', activationRate: 95, weeklyActiveUsersPercentage: 80, aiBreakdownCoverageRate: 100, averageSessionsPerStudentPerWeek: 6.5, assignmentBreakdownUsageRate: 85, studentNPS: 9.5, professorNPS: 10.0, retentionRate: 90, criticalIssues: 0, canvasLmsSyncErrors: 0},   
  ],
  ME101: [
    {week: 1, date: '2024-01-01', activationRate: 72, weeklyActiveUsersPercentage: 58, aiBreakdownCoverageRate: 78, averageSessionsPerStudentPerWeek: 4.2, assignmentBreakdownUsageRate: 62, studentNPS: 7.2, professorNPS: 7.8, retentionRate: 68, criticalIssues: 7, canvasLmsSyncErrors: 3},
    {week: 2, date: '2024-01-08', activationRate: 75, weeklyActiveUsersPercentage: 60, aiBreakdownCoverageRate: 80, averageSessionsPerStudentPerWeek: 4.5, assignmentBreakdownUsageRate: 65, studentNPS: 7.5, professorNPS: 8.0, retentionRate: 70, criticalIssues: 5, canvasLmsSyncErrors: 2},
    {week: 3, date: '2024-01-15', activationRate: 78, weeklyActiveUsersPercentage: 62, aiBreakdownCoverageRate: 82, averageSessionsPerStudentPerWeek: 4.8, assignmentBreakdownUsageRate: 68, studentNPS: 7.8, professorNPS: 8.2, retentionRate: 72, criticalIssues: 3, canvasLmsSyncErrors: 1},
    {week: 4, date: '2024-01-22', activationRate: 80, weeklyActiveUsersPercentage: 65, aiBreakdownCoverageRate: 85, averageSessionsPerStudentPerWeek: 5.0, assignmentBreakdownUsageRate: 70, studentNPS: 8.0, professorNPS: 8.5, retentionRate: 75, criticalIssues: 2, canvasLmsSyncErrors: 1},
    {week: 5, date: '2024-01-29', activationRate: 82, weeklyActiveUsersPercentage: 68, aiBreakdownCoverageRate: 88, averageSessionsPerStudentPerWeek: 5.2, assignmentBreakdownUsageRate: 72, studentNPS: 8.2, professorNPS: 8.7, retentionRate: 78, criticalIssues: 1, canvasLmsSyncErrors: 0}, 
    {week: 6, date: '2024-02-05', activationRate: 85, weeklyActiveUsersPercentage: 70, aiBreakdownCoverageRate: 90, averageSessionsPerStudentPerWeek: 5.5, assignmentBreakdownUsageRate: 75, studentNPS: 8.5, professorNPS: 9.0, retentionRate: 80, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 7, date: '2024-02-12', activationRate: 88, weeklyActiveUsersPercentage: 72, aiBreakdownCoverageRate: 92, averageSessionsPerStudentPerWeek: 5.8, assignmentBreakdownUsageRate: 78, studentNPS: 8.8, professorNPS: 9.2, retentionRate: 82, criticalIssues: 0, canvasLmsSyncErrors: 0},
    {week: 8, date: '2024-02-19', activationRate: 90, weeklyActiveUsersPercentage: 75, aiBreakdownCoverageRate: 95, averageSessionsPerStudentPerWeek: 6.0, assignmentBreakdownUsageRate: 80, studentNPS: 9.0, professorNPS: 9.5, retentionRate: 85, criticalIssues: 0, canvasLmsSyncErrors: 0},
  ],
  CS472: [
    {week: 1, date: '2024-01-01', activationRate: 80, weeklyActiveUsersPercentage: 65, aiBreakdownCoverageRate: 85, averageSessionsPerStudentPerWeek: 5.0, assignmentBreakdownUsageRate: 70, studentNPS: 8.0, professorNPS: 8.5, retentionRate: 75, criticalIssues: 2, canvasLmsSyncErrors: 1}, 
    {week: 2, date: '2024-01-08', activationRate: 82, weeklyActiveUsersPercentage: 68, aiBreakdownCoverageRate: 88, averageSessionsPerStudentPerWeek: 5.2, assignmentBreakdownUsageRate: 72, studentNPS: 8.2, professorNPS: 8.7, retentionRate: 78, criticalIssues: 1, canvasLmsSyncErrors: 0}, 
    {week: 3, date: '2024-01-15', activationRate: 85, weeklyActiveUsersPercentage: 70, aiBreakdownCoverageRate: 90, averageSessionsPerStudentPerWeek: 5.5, assignmentBreakdownUsageRate: 75, studentNPS: 8.5, professorNPS: 9.0, retentionRate: 80, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 4, date: '2024-01-22', activationRate: 88, weeklyActiveUsersPercentage: 72, aiBreakdownCoverageRate: 92, averageSessionsPerStudentPerWeek: 5.8, assignmentBreakdownUsageRate: 78, studentNPS: 8.8, professorNPS: 9.2, retentionRate: 82, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 5, date: '2024-01-29', activationRate: 90, weeklyActiveUsersPercentage: 75, aiBreakdownCoverageRate: 95, averageSessionsPerStudentPerWeek: 6.0, assignmentBreakdownUsageRate: 80, studentNPS: 9.0, professorNPS: 9.5, retentionRate: 85, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 6, date: '2024-02-05', activationRate: 92, weeklyActiveUsersPercentage: 78, aiBreakdownCoverageRate: 98, averageSessionsPerStudentPerWeek: 6.2, assignmentBreakdownUsageRate: 82, studentNPS: 9.2, professorNPS: 9.7, retentionRate: 88, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 7, date: '2024-02-12', activationRate: 95, weeklyActiveUsersPercentage: 80, aiBreakdownCoverageRate: 100, averageSessionsPerStudentPerWeek: 6.5, assignmentBreakdownUsageRate: 85, studentNPS: 9.5, professorNPS: 10.0, retentionRate: 90, criticalIssues: 0, canvasLmsSyncErrors: 0}, 
    {week: 8, date: '2024-02-19', activationRate: 98, weeklyActiveUsersPercentage: 85, aiBreakdownCoverageRate: 100, averageSessionsPerStudentPerWeek: 7.0, assignmentBreakdownUsageRate: 90, studentNPS: 9.8, professorNPS: 10.0, retentionRate: 95, criticalIssues: 0, canvasLmsSyncErrors: 0},
  ]
}

export default MOCK_DATA;