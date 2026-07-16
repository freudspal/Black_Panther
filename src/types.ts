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
  revisionSessions?: RevisionSession[];
  examAttempts?: ExamAttempt[];
  revisionServices?: RevisionService[];
  revisionServiceLogs?: RevisionServiceLog[];
}

export interface RevisionSession {
  id: string;
  studentUsername: string;
  date: string;
  duration: number;
  topic: string;
  rag: "red" | "amber" | "green";
  comment: string;
}

export interface ExamAttempt {
  id: string;
  studentUsername: string;
  component: string;
  topic: string;
  questionWording: string;
  marksAvailable: number;
  marksScored: number;
  selfMarkingScore: number;
  date: string;
  rag?: "red" | "amber" | "green";
}

export interface RevisionService {
  id: string;
  studentUsername: string;
  name: string;
  url: string;
}

export interface RevisionServiceLog {
  id: string;
  studentUsername: string;
  serviceId: string;
  serviceName: string;
  duration: number;
  date: string;
}
