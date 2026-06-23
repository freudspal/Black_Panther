export interface TestTemplate {
  id: string;
  name: string;
  maxScore: number;
  dateCreated: string;
}

export interface Student {
  username: string;
  nickname: string;
  classGroup: string;
  academicYear: string;
}

export interface ScoreEntry {
  id: string;
  studentUsername: string;
  studentNickname: string;
  testId: string;
  testName: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  date: string;
  classGroup: string;
  academicYear: string;
}

export interface TeacherDashboardMetrics {
  tests: TestTemplate[];
  students: Student[];
  scores: ScoreEntry[];
}
