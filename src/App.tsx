import React, { useState, useEffect } from "react";
import {
  Cat,
  User,
  Shield,
  Award,
  LogOut,
  Calendar,
  FileText,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  BookOpen,
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  Hash,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import Header from "./components/Header";
import { TestTemplate, Student, ScoreEntry, TeacherDashboardMetrics } from "./types";

interface Message {
  text: string;
  type: "success" | "error" | "info";
}

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    nickname: string;
    classGroup?: string;
    academicYear?: string;
    role: "student" | "teacher";
  } | null>(null);

  // General App states
  const [currentPage, setCurrentPage] = useState<string>("landing"); // landing, student-dashboard, teacher-dashboard, leaderboard
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);
  
  // Configuration fetched from backend
  const [config, setConfig] = useState<{
    hasJsonBin: boolean;
    binId: string | null;
    defaultTeacherUsername: string;
    defaultTeacherPassword: string;
    jsonBinError: string | null;
  }>({
    hasJsonBin: false,
    binId: null,
    defaultTeacherUsername: "admin",
    defaultTeacherPassword: "panther2026",
    jsonBinError: null,
  });

  // Authentic input states
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  // Core Data loaded from APIs
  const [tests, setTests] = useState<TestTemplate[]>([]);
  const [studentScores, setStudentScores] = useState<ScoreEntry[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherDashboardMetrics>({
    tests: [],
    students: [],
    scores: []
  });

  // Student specific scoring inputs
  const [newScoreDate, setNewScoreDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [studentScoreRaw, setStudentScoreRaw] = useState<string>("");

  // Teacher dynamic inputs
  const [newTestName, setNewTestName] = useState<string>("");
  const [newTestMaxScore, setNewTestMaxScore] = useState<string>("50");
  const [assessmentMode, setAssessmentMode] = useState<"manual" | "bulk">("manual");
  const [bulkAssessmentText, setBulkAssessmentText] = useState<string>("");
  const [teacherFilterClass, setTeacherFilterClass] = useState<string>("ALL");
  const [teacherFilterYear, setTeacherFilterYear] = useState<string>("ALL");
  const [selectedStudentDrilldown, setSelectedStudentDrilldown] = useState<string | null>(null);
  const [rosterViewMode, setRosterViewMode] = useState<"list" | "by-group">("list");
  const [schoolYearSearch, setSchoolYearSearch] = useState<string>("");

  // Analytical graph and security states
  const [teacherChartTab, setTeacherChartTab] = useState<"whole" | "groups" | "student">("whole");
  const [selectedChartStudent, setSelectedChartStudent] = useState<string>("");
  const [studentNeedsPasswordChange, setStudentNeedsPasswordChange] = useState<boolean>(false);
  const [currentPasswordForChange, setCurrentPasswordForChange] = useState<string>("");
  const [newPasswordForChange, setNewPasswordForChange] = useState<string>("");
  const [confirmPasswordForChange, setConfirmPasswordForChange] = useState<string>("");

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Teacher bulk & manual score entry details
  const [ingestMode, setIngestMode] = useState<"bulk_grades" | "bulk_assessments" | "bulk_students" | "manual">("bulk_grades");
  const [manualStudentUsername, setManualStudentUsername] = useState<string>("");
  const [manualTestId, setManualTestId] = useState<string>("");
  const [manualScoreRaw, setManualScoreRaw] = useState<string>("");
  const [manualScoreDate, setManualScoreDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bulkTextInput, setBulkTextInput] = useState<string>("");

  // Excel / CSV spreadsheet parsing engine
  const processExcelCSVData = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Detect TSV vs CSV
    const sample = lines[0];
    const delimiter = sample.includes("\t") ? "\t" : ",";

    const splitRow = (row: string) => {
      return row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
    };

    const headers = splitRow(lines[0]).map(h => h.trim().toLowerCase());

    const usernameIdx = headers.findIndex(h => 
      h.includes("student email") || h.includes("students email") || h.includes("address") || h.includes("email") || h.includes("student") || h.includes("username") || h.includes("alias") || h.includes("user")
    );
    const testNameIdx = headers.findIndex(h => 
      h.includes("assessment name") || h.includes("assessemnt name") || h.includes("assessment") || h.includes("assessemnt") || h.includes("test") || h.includes("name") || h.includes("title")
    );
    const maxScoreIdx = headers.findIndex(h => 
      h.includes("max marks") || h.includes("max score") || h.includes("max") || h.includes("limit") || h.includes("total") || h.includes("marks")
    );
    const scoreIdx = headers.findIndex(h => 
      h.includes("actual marks") || h.includes("marks secured") || h.includes("actual") || h.includes("score") || h.includes("secured") || h.includes("mark") || h === "grade"
    );
    const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("day") || h.includes("assess") || h.includes("created"));

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      if (cols.length < 2) continue;

      const studentUsername = usernameIdx !== -1 ? cols[usernameIdx] : cols[0];
      const testName = testNameIdx !== -1 ? cols[testNameIdx] : cols[1];
      const maxScore = maxScoreIdx !== -1 ? Number(cols[maxScoreIdx]) : 100;
      const score = scoreIdx !== -1 ? Number(cols[scoreIdx]) : Number(cols[2]);
      const date = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().split("T")[0];

      if (studentUsername && testName && !isNaN(score)) {
        records.push({
          studentUsername,
          testName,
          maxScore: isNaN(maxScore) ? 100 : maxScore,
          score,
          date
        });
      }
    }
    return records;
  };

  const handleAssessmentImport = async (textToParse: string) => {
    const lines = textToParse.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      showNotification("Provide headers and at least one assessment template row.", "error");
      return;
    }
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const nameIdx = headers.findIndex(h => h.includes("assessment name") || h.includes("assessemnt name") || h.includes("assessment") || h.includes("name") || h.includes("title"));
    const maxIdx = headers.findIndex(h => h.includes("max marks") || h.includes("max score") || h.includes("max_marks") || h.includes("max") || h.includes("marks") || h.includes("limit"));

    if (nameIdx === -1 || maxIdx === -1) {
      showNotification("Headers must contain 'assessment name' and 'max marks'.", "error");
      return;
    }

    const testTemplatesParsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length <= Math.max(nameIdx, maxIdx)) continue;
      const name = cols[nameIdx];
      const maxScore = Number(cols[maxIdx]);
      if (name && !isNaN(maxScore) && maxScore > 0) {
        testTemplatesParsed.push({ name, maxScore });
      }
    }

    if (testTemplatesParsed.length === 0) {
      showNotification("No valid assessment rows found.", "error");
      return;
    }

    try {
      showNotification("Uploading assessment templates...", "info");
      const r = await fetch("/api/teacher/import-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tests: testTemplatesParsed })
      });
      const data = await r.json();
      if (r.ok && data.success) {
        showNotification(data.message, "success");
        setBulkTextInput("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to import assessment templates.", "error");
      }
    } catch (_) {
      showNotification("Network delay during template import.", "error");
    }
  };

  const handleStudentsImport = async (textToParse: string) => {
    const lines = textToParse.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      showNotification("Provide headers and at least one student row.", "error");
      return;
    }
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("address") || h.includes("student email") || h.includes("username"));
    const classIdx = headers.findIndex(h => h.includes("class") || h.includes("group"));
    const yearIdx = headers.findIndex(h => h.includes("year") || h.includes("cycle") || h.includes("academic"));
    const nickIdx = headers.findIndex(h => h.includes("nickname") || h.includes("alias") || h.includes("name"));

    if (emailIdx === -1) {
      showNotification("Headers must include student email address or username.", "error");
      return;
    }

    const studentsParsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length <= emailIdx) continue;
      const email = cols[emailIdx];
      const classGroup = classIdx !== -1 && cols[classIdx] ? cols[classIdx] : "A";
      const academicYear = yearIdx !== -1 && cols[yearIdx] ? cols[yearIdx] : "26-27";
      const nickname = nickIdx !== -1 && cols[nickIdx] ? cols[nickIdx] : "";
      if (email) {
        studentsParsed.push({ email, classGroup, academicYear, nickname });
      }
    }

    if (studentsParsed.length === 0) {
      showNotification("No valid student rows found.", "error");
      return;
    }

    try {
      showNotification("Uploading student roster preloads...", "info");
      const r = await fetch("/api/teacher/import-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsParsed })
      });
      const data = await r.json();
      if (r.ok && data.success) {
        showNotification(data.message, "success");
        setBulkTextInput("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to preload students list.", "error");
      }
    } catch (_) {
      showNotification("Network delay during student preload.", "error");
    }
  };

  const handleBulkImport = async (textToParse: string) => {
    const records = processExcelCSVData(textToParse);
    if (records.length === 0) {
      showNotification("No valid student score rows detected in columns formatting.", "error");
      return;
    }

    try {
      showNotification("Uploading bulk spreadsheet data records...", "info");
      const response = await fetch("/api/teacher/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: records })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, "success");
        setBulkTextInput("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to process database bulk ingestion.", "error");
      }
    } catch (_) {
      showNotification("Network delay during bulk ingest process.", "error");
    }
  };

  const handleTeacherManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentUsername || !manualTestId || !manualScoreRaw || !manualScoreDate) {
      showNotification("Please supply student name, template, date and secured score.", "error");
      return;
    }

    try {
      showNotification("Logging manual score registry...", "info");
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUsername: manualStudentUsername,
          testId: manualTestId,
          score: manualScoreRaw,
          date: manualScoreDate
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(`Successfully logged manual database registry score for "${manualStudentUsername}".`, "success");
        setManualStudentUsername("");
        setManualScoreRaw("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to record manually entered marks.", "error");
      }
    } catch (_) {
      showNotification("Server offline during score filing.", "error");
    }
  };

  // Grade Boundaries Map
  const gradeBoundaries = [
    { name: "A*", min: 76.00, color: "text-purple-400 bg-purple-900/40 border-purple-500/50" },
    { name: "A", min: 66.67, color: "text-indigo-400 bg-indigo-900/40 border-indigo-500/50" },
    { name: "B", min: 56.00, color: "text-violet-400 bg-violet-900/40 border-violet-500/50" },
    { name: "C", min: 45.33, color: "text-amber-400 bg-amber-900/40 border-amber-500/50" },
    { name: "D", min: 34.67, color: "text-orange-400 bg-orange-950/40 border-orange-500/30" },
    { name: "E", min: 24.00, color: "text-rose-400 bg-rose-950/40 border-rose-500/30" },
    { name: "U", min: 0.00, color: "text-neutral-500 bg-neutral-900/50 border-neutral-800" }
  ];

  function getGradeSticker(percentage: number) {
    for (const b of gradeBoundaries) {
      if (percentage >= b.min) {
        return b;
      }
    }
    return gradeBoundaries[gradeBoundaries.length - 1];
  }

  function determineGrade(percentage: number): string {
    return getGradeSticker(percentage).name;
  }

  // Load config on mount
  useEffect(() => {
    fetch(`/api/config-status?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConfig({
            hasJsonBin: data.hasJsonBin,
            binId: data.binId,
            defaultTeacherUsername: data.defaultTeacherUsername,
            defaultTeacherPassword: data.defaultTeacherPassword,
            jsonBinError: data.jsonBinError || null
          });
        }
      })
      .catch(err => console.error("Error loading API config", err));
  }, []);

  // Sync / Refresh helper
  const syncApplicationData = async () => {
    setIsRefreshing(true);
    showNotification("Syncing live panthers vault with JSONBin cloud store...", "info");
    try {
      if (currentUser) {
        const timestamp = Date.now();
        if (currentUser.role === "student") {
          // Load tests and student specific scores
          const [testsRes, scoresRes] = await Promise.all([
            fetch(`/api/tests?t=${timestamp}`),
            fetch(`/api/scores?studentUsername=${encodeURIComponent(currentUser.username)}&t=${timestamp}`)
          ]);
          const testsData = await testsRes.json();
          const scoresData = await scoresRes.json();

          if (testsData.success) {
            setTests(testsData.tests);
            if (!selectedTestId && testsData.tests.length > 0) {
              setSelectedTestId(testsData.tests[0].id);
            }
          }
          if (scoresData.success) {
            setStudentScores(scoresData.scores);
          }
        } else if (currentUser.role === "teacher") {
          // Load teacher panel summary metrics
          const res = await fetch(`/api/teacher/dashboard?t=${timestamp}`);
          const data = await res.json();
          if (data.success) {
            setTeacherData(data);
          }
        }
      }
      showNotification("Stealth systems synchronized successfully.", "success");
    } catch (err) {
      showNotification("Connection delay during sync. Retrying over local caches.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger auto refresh when user state transitions
  useEffect(() => {
    if (currentUser) {
      syncApplicationData();
    }
  }, [currentUser]);

  const showNotification = (text: string, type: "success" | "error" | "info") => {
    setSystemMessage({ text, type });
    setTimeout(() => {
      setSystemMessage(null);
    }, 5000);
  };

  // Standard Authorisations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showNotification("Please provide both stealth credentials.", "error");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentUser({
          username: data.user.username,
          nickname: data.user.nickname,
          classGroup: data.user.classGroup,
          academicYear: data.user.academicYear,
          role: data.role
        });
        if (data.role === "student" && data.user.needsPasswordChange) {
          setStudentNeedsPasswordChange(true);
        }
        setCurrentPage(data.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
        showNotification(`Welcome back, Agent ${data.user.nickname}! Secure connection established.`, "success");
        // Clear login form
        setLoginUsername("");
        setLoginPassword("");
      } else {
        showNotification(data.error || "Access denied. Credentials do not match.", "error");
      }
    } catch (err) {
      showNotification("Network failed during authorization pipeline.", "error");
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setCurrentPage("landing");
    showNotification("Stealth session terminated. Security protocols restored.", "info");
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!currentPasswordForChange || !newPasswordForChange || !confirmPasswordForChange) {
      showNotification("Please fill in all security parameter credentials.", "error");
      return;
    }
    if (newPasswordForChange !== confirmPasswordForChange) {
      showNotification("New password confirming parameters do not match.", "error");
      return;
    }
    if (newPasswordForChange.length < 4) {
      showNotification("New security credential must be at least 4 characters long.", "error");
      return;
    }

    try {
      showNotification("Transmitting secure credential synchronization...", "info");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          currentPassword: currentPasswordForChange,
          newPassword: newPasswordForChange
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showNotification("Security credentials upgraded successfully. Secure connection intact.", "success");
        setStudentNeedsPasswordChange(false);
        // Clear state fields
        setCurrentPasswordForChange("");
        setNewPasswordForChange("");
        setConfirmPasswordForChange("");
      } else {
        showNotification(data.error || "Password update refused by server encryption guards.", "error");
      }
    } catch (_) {
      showNotification("Network delay during key rotation protocol.", "error");
    }
  };

  // Submit Score Entry
  const handleScoreSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!selectedTestId || !studentScoreRaw) {
      showNotification("Choose a test and enter your score.", "error");
      return;
    }

    const testTemplate = tests.find(t => t.id === selectedTestId);
    if (!testTemplate) return;

    const rawVal = parseFloat(studentScoreRaw);
    if (isNaN(rawVal) || rawVal < 0 || rawVal > testTemplate.maxScore) {
      showNotification(`Score must be a positive number up to the maximum parameter (${testTemplate.maxScore}).`, "error");
      return;
    }

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUsername: currentUser.username,
          testId: selectedTestId,
          score: rawVal,
          date: newScoreDate
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(`Logged ${data.score.percentage}% successfully: Grade ${data.score.grade}!`, "success");
        setStudentScoreRaw("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Submission rejected by central databases.", "error");
      }
    } catch (err) {
      showNotification("Data pipeline stalled. Please check connections.", "error");
    }
  };

  // Handle Score Deletion (Student side)
  const handleScoreDelete = (scoreId: string) => {
    requestConfirm(
      "Retract Score Submission",
      "Are you sure you want to retract this grade score? This changes your statistics!",
      async () => {
        try {
          const response = await fetch(`/api/scores/${scoreId}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Test score revoked.", "success");
            syncApplicationData();
          }
        } catch (err) {
          showNotification("Failed to revoke score. Connection issue.", "error");
        }
      }
    );
  };

  // Create Test Template (Teacher action)
  const handleCreateTestTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName || !newTestMaxScore) {
      showNotification("Provide assessment label and max possible marks.", "error");
      return;
    }

    const testMaxScoreNumber = parseFloat(newTestMaxScore);
    if (isNaN(testMaxScoreNumber) || testMaxScoreNumber <= 1) {
      showNotification("Max score must be a positive integer greater than 1.", "error");
      return;
    }

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTestName,
          maxScore: testMaxScoreNumber
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(`Assessment "${data.test.name}" released to databases.`, "success");
        setNewTestName("");
        setNewTestMaxScore("50");
        syncApplicationData();
      } else {
        showNotification(data.error || "Database declined new test declaration.", "error");
      }
    } catch (err) {
      showNotification("Connection lost. Test templating failed.", "error");
    }
  };

  // Delete Test Template (Teacher action)
  const handleDeleteTestTemplate = (id: string, name: string) => {
    requestConfirm(
      "Purge Assessment Template",
      `WARNING: Deleting test template "${name}" will permanently erase ALL student grades submitted under this assessment. Proceed?`,
      async () => {
        try {
          const response = await fetch(`/api/tests/${id}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Assessment template and dependent grades purged.", "success");
            syncApplicationData();
          }
        } catch (e) {
          showNotification("Purging failure. Central system issues.", "error");
        }
      }
    );
  };

  // Delete Student (Teacher action)
  const handleDeleteStudent = (username: string, nickname: string) => {
    requestConfirm(
      "Purge Student Profile",
      `WARNING: Deleting student "${nickname}" (${username}) will permanently erase their profile and ALL logged score records. Proceed?`,
      async () => {
        try {
          const response = await fetch("/api/teacher/delete-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            showNotification(`Student "${nickname}" and matching records purged successfully.`, "success");
            if (selectedStudentDrilldown === username) {
              setSelectedStudentDrilldown(null);
            }
            syncApplicationData();
          } else {
            showNotification(data.error || "Failed to purge student profile.", "error");
          }
        } catch (_) {
          showNotification("Purging failure. Central connection issues.", "error");
        }
      }
    );
  };

  // Reassign student group (Teacher action)
  const handleReassignStudentGroup = async (username: string, classGroup: string, nickname: string) => {
    try {
      const response = await fetch("/api/teacher/reassign-student-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, classGroup })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification(`Reassigned "${nickname}" to Group ${classGroup}.`, "success");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to reassign student group.", "error");
      }
    } catch (_) {
      showNotification("Reassignment offline connection error.", "error");
    }
  };

  // Math metrics for Student
  const studentAveragePercentage = studentScores.length > 0
    ? studentScores.reduce((sum, s) => sum + s.percentage, 0) / studentScores.length
    : 0;

  const currentOverallGrade = studentScores.length > 0
    ? getGradeSticker(studentAveragePercentage)
    : { name: "N/A", color: "text-neutral-500 bg-neutral-900" };

  // Calculate Line Graph Data sorted by Date
  const chartData = [...studentScores]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(score => ({
      date: new Date(score.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      percentage: score.percentage,
      testName: score.testName,
      grade: score.grade
    }));

  // Filtering student scores for Leaderboard & Rankings
  const rankingsData = () => {
    const list = currentUser?.role === "teacher" ? teacherData.scores : studentScores; // We want cross student rankings if loaded, wait - the leaderboard uses all scores from database! Correct.
    // However, if we are student, we get all database rankings by looking up anonymous nicknames
    // Let's compute comprehensive leaderboard from all scores inside the dashboard or from teacher's state.
  };

  // Construct Leaderboard records from accessible scores (all scores are anonymised with private high shadow nicknames!)
  const constructLeaderboard = () => {
    // We should pool student scores from teacher data (if logged in) or from all students
    // What if we don't have teacherData? Teacher retrieves all scores. For students, when they retrieve scores, they get everyone's scores mapped to studentNickname, so yes, they can see everyone on the global arena.
    // Wait! Let's verify, `GET /api/scores` without a query param returns all recorded scores in the database for students too! Let's check `server.ts` line 489:
    // `if (studentUsername) { ... } else { res.json({ success: true, scores: db.scores }); }`
    // YES! Anyone calling `GET /api/scores` without `studentUsername` can see all scored entries, allowing students to access the dynamic "Wild Cat Arena" ranking and compare their stealth aliases accurately!
    // Let's implement global arena view.
    const sourceScores = currentUser?.role === "teacher" ? teacherData.scores : studentScores;
    // Wait, student scores state contains only current student scores if fetched with query, but they can easily retrieve everyone on mount or when loading Arena page! Let's ensure students can query all scores to draw the Arena ranking accurately.
  };

  // Active call to load leaderboard across all groups
  const [globalScores, setGlobalScores] = useState<ScoreEntry[]>([]);
  const loadGlobalScoresForArena = async () => {
    try {
      const res = await fetch(`/api/scores?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setGlobalScores(data.scores);
      }
    } catch (err) {
      console.error("Failed to query overall scores", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadGlobalScoresForArena();
    }
  }, [currentUser, currentPage]);

  const getArenaRanking = () => {
    // Group records by unique studentNickname
    const studentsSummary: {
      [nickname: string]: {
        nickname: string;
        classGroup: string;
        averagePercentage: number;
        testsCount: number;
        academicYear: string;
      };
    } = {};

    const validScores = Array.isArray(globalScores) ? globalScores : [];
    validScores.forEach(s => {
      if (!s || !s.studentNickname) return;
      if (!studentsSummary[s.studentNickname]) {
        studentsSummary[s.studentNickname] = {
          nickname: s.studentNickname,
          classGroup: s.classGroup || "A",
          averagePercentage: 0,
          testsCount: 0,
          academicYear: s.academicYear || "26-27"
        };
      }
      studentsSummary[s.studentNickname].averagePercentage += s.percentage;
      studentsSummary[s.studentNickname].testsCount += 1;
    });

    const list = Object.values(studentsSummary).map(student => ({
      ...student,
      averagePercentage: parseFloat((student.averagePercentage / student.testsCount).toFixed(2))
    }));

    // Sort descending by performance average
    return list.sort((a, b) => b.averagePercentage - a.averagePercentage);
  };

  const arenaList = getArenaRanking();
  const myRankIndex = currentUser
    ? arenaList.findIndex(x => x.nickname === currentUser.nickname)
    : -1;
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

  // Let's calculate group values for Teacher overview
  const getTeacherMetrics = () => {
    const list = teacherData.scores.filter(s => {
      const matchClass = teacherFilterClass === "ALL" || s.classGroup === teacherFilterClass;
      const matchYear = teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear;
      return matchClass && matchYear;
    });

    const averagePercent = list.length > 0
      ? list.reduce((sum, s) => sum + s.percentage, 0) / list.length
      : 0;

    const outstandingGrades = list.filter(s => ["A*", "A", "B"].includes(s.grade)).length;
    const statsPercentage = list.length > 0
      ? parseFloat(((outstandingGrades / list.length) * 100).toFixed(1))
      : 0;

    return {
      scoresFiltered: list,
      averagePercent: parseFloat(averagePercent.toFixed(1)),
      successRate: statsPercentage,
      totalAssessmentsLogged: list.length
    };
  };

  const teacherMetrics = getTeacherMetrics();

  // Sorted tests in ascending chronological order of creation
  const sortedTestsForTeacherChart = teacherData?.tests ? [...teacherData.tests]
    .sort((a,b) => (a.dateCreated || "").localeCompare(b.dateCreated || "")) : [];

  // 1. Whole group data
  const wholeGroupLineData = sortedTestsForTeacherChart.map(test => {
    const scoresForTest = (teacherData?.scores || []).filter(s => s.testId === test.id);
    const average = scoresForTest.length > 0
      ? parseFloat((scoresForTest.reduce((sum, curr) => sum + curr.percentage, 0) / scoresForTest.length).toFixed(1))
      : null;
    return {
      testName: test.name,
      "Cohort Average %": average,
    };
  }).filter(item => item["Cohort Average %"] !== null);

  // 2. Class groups overlay data
  const overlayLineData = sortedTestsForTeacherChart.map(test => {
    const dataNode: any = { testName: test.name };
    let hasAnyGroupData = false;
    ["A", "B", "C", "D", "E"].forEach(g => {
      const groupScores = (teacherData?.scores || []).filter(s => s.testId === test.id && s.classGroup === g);
      if (groupScores.length > 0) {
        dataNode[`Group ${g} Average %`] = parseFloat((groupScores.reduce((sum, curr) => sum + curr.percentage, 0) / groupScores.length).toFixed(1));
        hasAnyGroupData = true;
      }
    });
    return hasAnyGroupData ? dataNode : null;
  }).filter(Boolean);

  // 3. Individual student data
  const currentMetricStudentNickname = (teacherData?.students || []).find(x => x.username === selectedChartStudent)?.nickname || "Selected Student";
  const individualStudentLineData = sortedTestsForTeacherChart.map(test => {
    const scoreNode = (teacherData?.scores || []).find(s => s.testId === test.id && s.studentUsername === selectedChartStudent);
    return {
      testName: test.name,
      "Student Performance %": scoreNode ? scoreNode.percentage : null,
    };
  }).filter(item => item["Student Performance %"] !== null);

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-200 flex flex-col font-sans transition-all selection:bg-purple-600/30 selection:text-purple-300">
      
      {/* Dynamic Alert Banner */}
      {systemMessage && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
          systemMessage.type === "success"
            ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
            : systemMessage.type === "error"
            ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
            : "bg-purple-950/90 text-purple-200 border-purple-500/40"
        }`}>
          {systemMessage.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
          {systemMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
          {systemMessage.type === "info" && <Cat className="w-5 h-5 text-purple-400 animate-bounce" />}
          <span className="text-sm font-medium">{systemMessage.text}</span>
        </div>
      )}

      {studentNeedsPasswordChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-xl animate-fade-in text-neutral-100">
          <div className="w-full max-w-md bg-neutral-900 border border-purple-950 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-[#030304] border border-purple-900/60 items-center justify-center text-purple-400 mb-2">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Security Credentials Refresh</h2>
              <p className="text-xs text-neutral-400">
                You must change your default temporary password on your first sign-in to secure your account data.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Standard Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter temporary password, e.g. 1234"
                  value={currentPasswordForChange}
                  onChange={(e) => setCurrentPasswordForChange(e.target.value)}
                  className="w-full bg-[#030304] border border-purple-950 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-650 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">New Security Password / PIN</label>
                <input
                  type="password"
                  required
                  placeholder="Select new password/PIN"
                  value={newPasswordForChange}
                  onChange={(e) => setNewPasswordForChange(e.target.value)}
                  className="w-full bg-[#030304] border border-purple-950 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-650 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Confirm New Security Credentials</label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPasswordForChange}
                  onChange={(e) => setConfirmPasswordForChange(e.target.value)}
                  className="w-full bg-[#030304] border border-purple-950 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-650 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wider font-mono transition"
                >
                  Authorize Changes & Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled App Header */}
      <Header
        user={currentUser}
        onLogout={logoutUser}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        config={config}
        onRefresh={syncApplicationData}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Offline or Error Warning Banner for Stateless Production Vercel Deployments */}
        {(!config.hasJsonBin || config.jsonBinError) && (
          <div className="mb-6 bg-rose-950/15 border border-rose-900/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4 shadow-xl shadow-rose-950/5 animate-in fade-in duration-300">
            <div className="p-2.5 bg-rose-950/65 rounded-xl border border-rose-900/50 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center space-x-1.5">
                <span>{config.jsonBinError ? "Cloud Database Connection Failed" : "Cloud Database Sync is Offline (Ephemeral Storage)"}</span>
                <span className={`px-2 py-0.5 text-[9px] font-mono rounded-md uppercase font-bold tracking-wider ${config.jsonBinError ? 'bg-red-950/80 text-rose-350 border border-red-900/40' : 'bg-amber-900/40 text-amber-350'}`}>
                  {config.jsonBinError ? 'Sync Error' : 'Storage Warning'}
                </span>
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-4xl">
                {config.jsonBinError ? (
                  <>
                    The application detected JSONBin keys in your Vercel settings, but failed to establish a secure database connection. Error details: <code className="bg-red-950/40 text-red-350 px-1.5 py-0.5 rounded font-mono border border-rose-900/40">{config.jsonBinError}</code>
                  </>
                ) : (
                  <>
                    Because Vercel serverless containers are stateless and reset periodically, any modifications you make (adding students, grades, or tests) will be <strong className="text-amber-300">lost on the next recycle</strong>. To activate dynamic syncing, configure <strong>JSONBin.io</strong> keys.
                  </>
                )}
              </p>
              <div className="text-[11px] text-neutral-500 pt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center space-x-1">
                  <span className="h-1 text-rose-400 font-bold">•</span>
                  <span>Set up a free JSON store on <a href="https://jsonbin.io" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">JSONBin.io</a></span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="h-1 text-rose-400 font-bold">•</span>
                  <span>Double check <code>JSONBIN_API_KEY</code> & <code>JSONBIN_BIN_ID</code> in Vercel Project Settings</span>
                </span>
                {config.jsonBinError && (
                  <span className="flex items-center space-x-1">
                    <span className="h-1 text-rose-400 font-bold">•</span>
                    <strong className="text-rose-400">Important: Trigger a "Redeploy" in Vercel after editing keys!</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* LANDING / REGISTRATION ENTRANCE */}
        {currentPage === "landing" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6 sm:py-12">
            
            {/* Visual Branding Section */}
            <div className="col-span-1 lg:col-span-7 flex flex-col justify-center space-y-6">
              
              <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight text-center lg:text-left">
                Evaluate Stealth.<br />
                <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-500 bg-clip-text text-transparent">
                  Black Panther Tracker
                </span>
              </h1>

              {/* Conversion Rules Preview */}
              <div className="bg-neutral-950/55 rounded-3xl p-6 border border-purple-950/60 max-w-lg mx-auto lg:mx-0 shadow-xl shadow-purple-500/[0.03]">
                <h3 className="text-xs font-bold tracking-widest text-[#a855f7] font-mono uppercase mb-4 flex items-center justify-center lg:justify-start space-x-1">
                  <Info className="w-4 h-4 text-[#a855f7]" />
                  <span>Interactive Academic Boundaries</span>
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center">
                  {gradeBoundaries.map((g) => (
                    <div
                      key={g.name}
                      className="p-1.5 rounded-xl border border-neutral-900 bg-neutral-950 flex flex-col items-center"
                    >
                      <span className={`text-base font-bold ${g.color.split(" ")[0]}`}>{g.name}</span>
                      <span className="font-mono text-[9px] text-neutral-500">≥{g.min}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Form Box */}
            <div className="col-span-1 lg:col-span-5 max-w-md mx-auto w-full h-full lg:max-w-none">
              <div className="bg-neutral-950/70 backdrop-blur-md rounded-3xl p-8 border border-purple-950/80 shadow-2xl shadow-purple-900/10 flex flex-col justify-between h-full min-h-[380px]">
                
                {/* LOGIN FORM */}
                <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="text-center pb-2">
                      <Cat className="w-8 h-8 text-purple-400 mx-auto opacity-70 mb-2" />
                      <h2 className="text-lg font-bold text-white tracking-tight">Access Control Center</h2>
                      <p className="text-xs text-neutral-500 mt-1">Authenticate student alias or administrator terminal</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Stealth Username</label>
                      <input
                        id="login-username"
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. wildcat_panther or admin"
                        className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Access Password / PIN</label>
                      <input
                        id="login-password"
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                      />
                    </div>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    className="w-full py-3.5 mt-4 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-650 transition shadow-lg shadow-purple-650/15 font-display tracking-wide uppercase active:scale-[0.98]"
                  >
                    Authenticate Ingress
                  </button>
                </form>

              </div>
            </div>

          </div>
        )}

        {/* STUDENT WORKSTATION / MY PROGRESS */}
        {currentPage === "student-dashboard" && currentUser && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Greetings Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-purple-950/40 gap-4">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">Student Active Terminal</span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Agent <span className="text-purple-350">{currentUser.nickname}</span>
                </h2>
                <div className="flex items-center space-x-3.5 mt-2">
                  <span className="text-xs text-neutral-400">Class: Group {currentUser.classGroup}</span>
                  <span className="text-neutral-700">•</span>
                  <span className="text-xs text-neutral-400">Cycle: Academic Year {currentUser.academicYear}</span>
                </div>
              </div>

              {myRank !== null && (
                <div className="bg-neutral-950 rounded-2xl px-5 py-3 border border-purple-950/60 flex items-center space-x-3 self-start md:self-auto shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900/40 border border-purple-800/60">
                    <Award className="w-5 h-5 text-purple-350 animate-bounce" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">Arena Ranking</p>
                    <p className="text-lg font-extrabold text-white">
                      #{myRank} <span className="text-xs text-neutral-400 font-normal">in Global Arena</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats widgets & Record Marks Forms */}
            <div className="grid lg:grid-cols-12 gap-8">
              
              {/* Dynamic Trend Chart */}
              <div className="lg:col-span-8 bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[360px]">
                <div className="flex justify-between items-start mb-6 border-b border-purple-950/35 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span>My Performance Journey</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">Historical track records plotted on percentages scale</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wide block">Dynamic Average</span>
                    <span className="text-2xl font-black text-white">
                      {studentAveragePercentage > 0 ? `${studentAveragePercentage.toFixed(1)}%` : "0%"}
                    </span>
                    <span className={`inline-block ml-1 px-2 py-0.5 text-[10px] font-bold rounded ${currentOverallGrade.color.split(" ")[0]} ${currentOverallGrade.color.split(" ")[1]}`}>
                      Grade {currentOverallGrade.name}
                    </span>
                  </div>
                </div>

                {/* Plot Canvas */}
                <div className="flex-1 h-56 pt-2">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#22123b" />
                        <XAxis dataKey="date" stroke="#6d5c8a" fontSize={10} fontFamily="JetBrains Mono" />
                        <YAxis stroke="#6d5c8a" fontSize={10} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: "#090611", borderColor: "#442a78" }}
                          itemStyle={{ color: "#c084fc", fontSize: "11px" }}
                          labelStyle={{ color: "#93c5fd", fontSize: "12px", fontWeight: "bold" }}
                          formatter={(value, name, props) => [`${value}% (Grade ${props.payload.grade})`, "Percentage"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke="#a855f7"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorPercentage)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 border border-dashed border-purple-950/60 rounded-2xl bg-neutral-950/20">
                      <TrendingUp className="w-12 h-12 text-neutral-800 mb-3" />
                      <p className="text-sm font-semibold">No progress data registered yet.</p>
                      <p className="text-xs text-neutral-600 max-w-sm mt-1">Please enter a date and log your first assessment score using the form sidebar to kickstart tracking.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Log grades form */}
              <div className="lg:col-span-4 bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 border-b border-purple-950/35 pb-4 mb-5">
                    <Plus className="w-4 h-4 text-purple-400" />
                    <span>Log Assessment Score</span>
                  </h3>

                  {tests.length > 0 ? (
                    <form onSubmit={handleScoreSubmission} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Assessment template</label>
                        <select
                          id="submit-test-id"
                          value={selectedTestId}
                          onChange={(e) => setSelectedTestId(e.target.value)}
                          className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                        >
                          {tests.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Max Marks: {t.maxScore})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Assess Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-purple-600" />
                          <input
                            id="submit-date"
                            type="date"
                            required
                            value={newScoreDate}
                            onChange={(e) => setNewScoreDate(e.target.value)}
                            className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Your Score (marks)</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-2.5 h-4 w-4 text-purple-600" />
                          <input
                            id="submit-score"
                            type="number"
                            step="any"
                            required
                            min="0"
                            placeholder={tests.find(x => x.id === selectedTestId) ? `...... / ${tests.find(x => x.id === selectedTestId)?.maxScore} (out of max score)` : "...... / (out of max score)"}
                            value={studentScoreRaw}
                            onChange={(e) => setStudentScoreRaw(e.target.value)}
                            className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                          />
                        </div>
                        {selectedTestId && studentScoreRaw && (
                          <div className="mt-2 text-[10px] bg-purple-950/30 rounded px-2.5 py-1.5 border border-purple-900/40 font-mono text-purple-300">
                             Calculation:{" "}
                            {(parseFloat(studentScoreRaw) / (tests.find(x => x.id === selectedTestId)?.maxScore || 1) * 100).toFixed(1)}%{" "}
                             -{" "}
                            <span className="font-bold">
                              Grade {determineGrade(parseFloat(((parseFloat(studentScoreRaw) / (tests.find(x => x.id === selectedTestId)?.maxScore || 1)) * 100).toFixed(2)))}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        id="score-submit-btn"
                        type="submit"
                        className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition active:scale-95"
                      >
                        File Score Record
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-4 bg-[#030304] rounded-2xl border border-purple-950 text-neutral-500 text-xs">
                      No assessment templates are loaded by the teacher yet. Reach out to the teacher console to establish assessment topics.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Assessment logs Table */}
            <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 border-b border-purple-950/35 pb-4 mb-4">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Logged Assessments History</span>
              </h3>

              <div className="overflow-x-auto">
                {studentScores.length > 0 ? (
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="text-[10px] text-purple-400/80 uppercase tracking-widest border-b border-purple-950/50">
                      <tr>
                        <th className="py-3 px-4">Assess Date</th>
                        <th className="py-3 px-4">Assessment Name</th>
                        <th className="py-3 px-4 font-mono">My Secure Marks</th>
                        <th className="py-3 px-4 font-mono text-center">Percentage</th>
                        <th className="py-3 px-4 text-center">Grade Boundary</th>
                        <th className="py-3 px-4 text-right">Retract</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {studentScores.map(score => {
                        const gradeSticker = getGradeSticker(score.percentage);
                        return (
                          <tr key={score.id} className="hover:bg-purple-950/15 transition duration-150">
                            <td className="py-3.5 px-4 text-neutral-300 font-medium">
                              {new Date(score.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </td>
                            <td className="py-3.5 px-4 text-white font-semibold">{score.testName}</td>
                            <td className="py-3.5 px-4 font-mono text-neutral-400">
                              {score.score} <span className="text-[10px] text-neutral-600">/ {score.maxScore}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-purple-300 text-center">
                              {score.percentage}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-brand uppercase border ${gradeSticker.color}`}>
                                Grade {score.grade}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                id={`delete-score-${score.id}`}
                                onClick={() => handleScoreDelete(score.id)}
                                className="text-neutral-500 hover:text-red-400 transition ml-auto inline-block active:scale-95"
                                title="Retract this score"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center p-8 text-neutral-600">
                    No assessments submitted in this academic session.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TEACHER DASHBOARD COMMAND CENTER */}
        {currentPage === "teacher-dashboard" && currentUser && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Greetings Bar */}
            <div className="pb-6 border-b border-purple-950/40">
              <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">Authorized Supervisor Session</span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Black Panther Command <span className="text-amber-500">Center</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">Real-time class groupings analytics, assessments releases, and individual grade sheets management.</p>
            </div>

            {/* Top Stat Overview Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <Users className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                <p className="text-xs font-mono text-neutral-500 uppercase">Recruited Students</p>
                <p className="text-2xl font-black text-white mt-2">{teacherData.students.length}</p>
                <div className="text-[10px] text-purple-400 mt-1 font-mono">Across A, B, C, D, E class groups</div>
              </div>

              <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <FileText className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                <p className="text-xs font-mono text-neutral-500 uppercase">Active Assessment Templates</p>
                <p className="text-2xl font-black text-white mt-2">{teacherData.tests.length}</p>
                <div className="text-[10px] text-purple-400 mt-1 font-mono">Controlling options available for student logging</div>
              </div>

              <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <TrendingUp className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                <p className="text-xs font-mono text-neutral-500 uppercase">Interactive Cohort Average</p>
                <p className="text-2xl font-black text-purple-300 mt-2">
                  {teacherMetrics.averagePercent > 0 ? `${teacherMetrics.averagePercent}%` : "0.0%"}
                </p>
                <div className="text-[10px] text-purple-400 mt-1 font-mono">Weighted percentages cohort-wide</div>
              </div>

              <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <Award className="absolute right-4 top-4 text-amber-500/10 w-10 h-10" />
                <p className="text-xs font-mono text-amber-500 uppercase">Pass Rate (Grade A*-B)</p>
                <p className="text-2xl font-black text-amber-400 mt-2">
                  {teacherMetrics.successRate}%
                </p>
                <div className="text-[10px] text-amber-500/70 mt-1 font-mono">Ratio of outstanding grades</div>
              </div>

            </div>

            {/* Dynamic Filtration Panels */}
            <div className="bg-neutral-950/80 rounded-3xl p-6 border border-purple-950/60 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <Filter className="w-4 h-4 text-amber-500 hidden sm:block" />
                <span className="text-xs font-bold text-gray-400 font-mono text-[10px] uppercase">Cohort Scope Filters:</span>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-0.5">Filter Class Group</label>
                  <select
                    id="filter-class-group"
                    value={teacherFilterClass}
                    onChange={(e) => {
                      setTeacherFilterClass(e.target.value);
                      setSelectedStudentDrilldown(null);
                    }}
                    className="bg-[#030304] border border-purple-950 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                  >
                    <option value="ALL">All Class Groups</option>
                    <option value="A">Class Group A</option>
                    <option value="B">Class Group B</option>
                    <option value="C">Class Group C</option>
                    <option value="D">Class Group D</option>
                    <option value="E">Class Group E</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-0.5">Filter Year Cycle</label>
                  <select
                    id="filter-year-cycle"
                    value={teacherFilterYear}
                    onChange={(e) => {
                      setTeacherFilterYear(e.target.value);
                      setSelectedStudentDrilldown(null);
                    }}
                    className="bg-[#030304] border border-purple-950 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                  >
                    <option value="ALL">All Academic Years</option>
                    <option value="26-27">26-27</option>
                    <option value="27-28">27-28</option>
                    <option value="28-29">28-29</option>
                    <option value="29-30">29-30</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Analytics Line Chart Block */}
            <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl flex flex-col space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-950/35 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span>Academic Performance Analytics Traces</span>
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase tracking-wider">Chronological course trajectory tracking</p>
                </div>

                {/* Tab Switchers */}
                <div className="flex bg-[#030304] border border-purple-950/40 rounded-xl p-1 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setTeacherChartTab("whole")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                      teacherChartTab === "whole"
                        ? "bg-purple-900/40 text-purple-200 border border-purple-850 font-bold"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Whole Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherChartTab("groups")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                      teacherChartTab === "groups"
                        ? "bg-purple-900/40 text-purple-200 border border-purple-850 font-bold"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Compare Groups
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherChartTab("student")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                      teacherChartTab === "student"
                        ? "bg-purple-900/40 text-purple-200 border border-purple-850 font-bold"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Individual Student
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-control for Individual Student Tab */}
              {teacherChartTab === "student" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#030304]/60 border border-purple-950/30 p-4 rounded-2xl animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Tracking target</span>
                    <h4 className="text-xs font-semibold text-white">Focus Student Trace: {currentMetricStudentNickname}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-purple-400">Roster Selection:</span>
                    <select
                      id="selected-chart-student-select"
                      value={selectedChartStudent}
                      onChange={(e) => setSelectedChartStudent(e.target.value)}
                      className="bg-[#030304] border border-purple-950/70 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                    >
                      {(teacherData?.students || []).map(s => (
                        <option key={s.username} value={s.username}>
                          {s.nickname || s.username} ({s.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Chart Stage */}
              <div className="w-full">
                {((teacherChartTab === "whole" && wholeGroupLineData.length > 0) ||
                  (teacherChartTab === "groups" && overlayLineData.length > 0) ||
                  (teacherChartTab === "student" && individualStudentLineData.length > 0)) ? (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          teacherChartTab === "whole"
                            ? wholeGroupLineData
                            : teacherChartTab === "groups"
                            ? overlayLineData
                            : individualStudentLineData
                        }
                        margin={{ top: 15, right: 20, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#22123b" />
                        <XAxis dataKey="testName" stroke="#6d5c8a" fontSize={10} fontFamily="JetBrains Mono" />
                        <YAxis domain={[0, 100]} stroke="#6d5c8a" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#090611", borderColor: "#442a78", borderRadius: "1rem" }}
                          itemStyle={{ fontSize: "11px" }}
                          labelStyle={{ color: "#c084fc", fontSize: "11px", fontFamily: "JetBrains Mono", fontWeight: "bold" }}
                          formatter={(v: any) => [`${v}%`, "Score"]}
                        />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono", paddingLeft: 10 }} />
                        {teacherChartTab === "whole" && (
                          <Line type="monotone" name="Cohort Average %" dataKey="Cohort Average %" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        )}
                        {teacherChartTab === "groups" && (
                          <>
                            <Line type="monotone" name="Group A Avg" dataKey="Group A Average %" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" name="Group B Avg" dataKey="Group B Average %" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" name="Group C Avg" dataKey="Group C Average %" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" name="Group D Avg" dataKey="Group D Average %" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" name="Group E Avg" dataKey="Group E Average %" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                          </>
                        )}
                        {teacherChartTab === "student" && (
                          <Line type="monotone" name="Student Marks %" dataKey="Student Performance %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[240px] flex flex-col items-center justify-center text-center text-neutral-600 border border-dashed border-purple-950/60 rounded-2xl bg-[#030304]/30">
                    <TrendingUp className="w-12 h-12 text-neutral-800 mb-3" />
                    <p className="text-sm font-semibold">Insufficient score registries</p>
                    <p className="text-xs text-neutral-600 max-w-sm mt-1">There are no matching logged grades currently available to plot for this trace view.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Double Segment Grid: Left is assessments templated. Right is individual records drilling */}
            <div className="grid lg:grid-cols-12 gap-8">
              
              {/* Release assessment templates */}
              <div className="lg:col-span-5 flex flex-col space-y-6">

                {/* Score Bulk Upload & Manual Ingestion Command Card */}
                <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl flex flex-col space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 border-b border-purple-950/35 pb-4 mb-4">
                      <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                      <span>Grades Ingestion Console</span>
                    </h3>

                    {/* Mode Navigation tabs */}
                    <div className="flex flex-wrap bg-[#030304] border border-purple-950/80 rounded-xl p-1 mb-4 gap-1">
                      <button
                        type="button"
                        onClick={() => { setIngestMode("bulk_grades"); setBulkTextInput(""); }}
                        className={`flex-1 min-w-[124px] flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                          ingestMode === "bulk_grades"
                            ? "bg-purple-900/40 text-purple-200 border border-purple-850 shadow-inner font-bold"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        <span>Upload Grades</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIngestMode("bulk_assessments"); setBulkTextInput(""); }}
                        className={`flex-1 min-w-[124px] flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                          ingestMode === "bulk_assessments"
                            ? "bg-purple-900/40 text-purple-200 border border-purple-850 shadow-inner font-bold"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1 text-purple-400" />
                        <span>Upload Topics</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIngestMode("bulk_students"); setBulkTextInput(""); }}
                        className={`flex-1 min-w-[124px] flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                          ingestMode === "bulk_students"
                            ? "bg-purple-900/40 text-purple-200 border border-purple-850 shadow-inner font-bold"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 mr-1 text-blue-400" />
                        <span>Preload Roster</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIngestMode("manual"); setBulkTextInput(""); }}
                        className={`flex-1 min-w-[124px] flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                          ingestMode === "manual"
                            ? "bg-purple-900/40 text-purple-200 border border-purple-850 shadow-inner font-bold"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Manual Grade</span>
                      </button>
                    </div>

                    {/* BULK GRADES UPLOADER */}
                    {ingestMode === "bulk_grades" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="rounded-xl border border-dashed border-purple-950/85 p-3 text-[11px] leading-relaxed text-neutral-400 bg-[#030304]/30 space-y-1.5">
                          <span className="font-bold text-amber-400 block font-mono text-[9px] uppercase tracking-wider">Spreadsheet Grades Schema Template:</span>
                          <p>
                            Header structure row: <code className="bg-[#030304] border border-neutral-800 px-1 rounded font-mono text-purple-350">students email address, assessment name, max marks, actual marks</code>
                          </p>
                          <div className="bg-[#030304] rounded p-1.5 mt-1 border border-neutral-950 select-all font-mono text-[9px] text-neutral-500 overflow-x-auto whitespace-pre">
                            {"students email address, assessment name, max marks, actual marks\nstudent1@domain.com, Calculus Quiz, 50, 42\nstudent2@domain.com, Mechanics Midterm, 100, 85"}
                          </div>
                          <span className="block text-[9px] text-neutral-500 italic mt-1 font-mono">
                            * Integrates on-the-fly student rosters. Existing duplicate matches are automatically pruned.
                          </span>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const text = evt.target?.result as string;
                                  if (text) {
                                    handleBulkImport(text);
                                  }
                                };
                                reader.readAsText(file);
                              }}
                            />
                            <div className="h-9 w-9 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-center text-purple-400 mb-1 group-hover:scale-105 transition">
                              <Upload className="w-5 h-5 animate-pulse" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-300">Select Spreadsheet file</span>
                            <span className="text-[10px] text-neutral-500">supports .csv / .tsv sheets</span>
                          </div>
                        </div>

                        {/* Direct Copy-Paste area */}
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (bulkTextInput) handleBulkImport(bulkTextInput);
                        }} className="space-y-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Or Paste CSV/TSV Rows</label>
                            <textarea
                              rows={4}
                              value={bulkTextInput}
                              onChange={(e) => setBulkTextInput(e.target.value)}
                              placeholder={`students email address, assessment name, max marks, actual marks\nstudent1@domain.com, Calculus Quiz, 50, 42`}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl p-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-600 font-mono resize-none transition"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!bulkTextInput.trim()}
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition disabled:opacity-35 disabled:pointer-events-none active:scale-[98]"
                          >
                            Execute Grades Import
                          </button>
                        </form>
                      </div>
                    )}

                    {/* BULK ASSESSMENT TEMPLATES UPLOADER */}
                    {ingestMode === "bulk_assessments" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="rounded-xl border border-dashed border-purple-950/85 p-3 text-[11px] leading-relaxed text-neutral-400 bg-[#030304]/30 space-y-1.5">
                          <span className="font-bold text-purple-400 block font-mono text-[9px] uppercase tracking-wider">Assessment Topics Schema:</span>
                          <p>
                            Header structure row: <code className="bg-[#030304] border border-neutral-800 px-1 rounded font-mono text-purple-350">assessment name, max marks</code>
                          </p>
                          <div className="bg-[#030304] rounded p-1.5 mt-1 border border-neutral-950 select-all font-mono text-[9px] text-neutral-500 overflow-x-auto whitespace-pre">
                            {"assessment name, max marks\nMechanics quiz 1, 50\nOrganic Chemistry Quiz, 40\nBiochem Practical, 25"}
                          </div>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const text = evt.target?.result as string;
                                  if (text) {
                                    handleAssessmentImport(text);
                                  }
                                };
                                reader.readAsText(file);
                              }}
                            />
                            <div className="h-9 w-9 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-center text-purple-400 mb-1 group-hover:scale-105 transition">
                              <Upload className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-300">Select Spreadsheet file</span>
                            <span className="text-[10px] text-neutral-500">supports .csv / .tsv sheets</span>
                          </div>
                        </div>

                        {/* Direct Copy-Paste area */}
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (bulkTextInput) handleAssessmentImport(bulkTextInput);
                        }} className="space-y-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Or Paste CSV/TSV Rows</label>
                            <textarea
                              rows={4}
                              value={bulkTextInput}
                              onChange={(e) => setBulkTextInput(e.target.value)}
                              placeholder={`assessment name, max marks\nCalculus quiz, 50`}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl p-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-600 font-mono resize-none transition"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!bulkTextInput.trim()}
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition disabled:opacity-35 disabled:pointer-events-none active:scale-[98]"
                          >
                            Deploy Deployed Options
                          </button>
                        </form>
                      </div>
                    )}

                    {/* BULK STUDENT LIST PRELOAD UPLOADER */}
                    {ingestMode === "bulk_students" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="rounded-xl border border-dashed border-purple-950/85 p-3 text-[11px] leading-relaxed text-neutral-400 bg-[#030304]/30 space-y-1.5">
                          <span className="font-bold text-purple-400 block font-mono text-[9px] uppercase tracking-wider">Students Roster Schema:</span>
                          <p>
                            Header structure row: <code className="bg-[#030304] border border-neutral-800 px-1 rounded font-mono text-purple-350">email, Group, Academic Year, Nickname</code>
                          </p>
                          <div className="bg-[#030304] rounded p-1.5 mt-1 border border-neutral-950 select-all font-mono text-[9px] text-neutral-500 overflow-x-auto whitespace-pre">
                            {"email, Group, Academic Year, Nickname\nstudent1@domain.com, A, 26-27, Tony Stark\nstudent2@domain.com, B, 26-27, Bruce Banner"}
                          </div>
                          <span className="block text-[9px] text-neutral-500 font-mono italic mt-1">
                            * Installs password of "1234" by default. Students will be locked into changing credentials on their first login cycle.
                          </span>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const text = evt.target?.result as string;
                                  if (text) {
                                    handleStudentsImport(text);
                                  }
                                };
                                reader.readAsText(file);
                              }}
                            />
                            <div className="h-9 w-9 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-center text-purple-400 mb-1 group-hover:scale-105 transition">
                              <Upload className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-300">Select Spreadsheet file</span>
                            <span className="text-[10px] text-neutral-500">supports .csv / .tsv sheets</span>
                          </div>
                        </div>

                        {/* Direct Copy-Paste area */}
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (bulkTextInput) handleStudentsImport(bulkTextInput);
                        }} className="space-y-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Or Paste CSV/TSV Rows</label>
                            <textarea
                              rows={4}
                              value={bulkTextInput}
                              onChange={(e) => setBulkTextInput(e.target.value)}
                              placeholder={`email, Group, Academic Year, Nickname\nstudent1@domain.com, A, 26-27, Tony Stark`}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl p-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-600 font-mono resize-none transition"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!bulkTextInput.trim()}
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition disabled:opacity-35 disabled:pointer-events-none active:scale-[98]"
                          >
                            Verify & Ingest Roster
                          </button>
                        </form>
                      </div>
                    )}

                    {/* MANUAL GRADES RECORD INGRESS */}
                    {ingestMode === "manual" && (
                      <form onSubmit={handleTeacherManualEntry} className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Student Roster Target</label>
                          <select
                            value={manualStudentUsername}
                            onChange={(e) => setManualStudentUsername(e.target.value)}
                            required
                            className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                          >
                            <option value="">-- Choose student roster alias --</option>
                            {teacherData.students.map(s => (
                              <option key={s.username} value={s.username}>
                                {s.nickname} ({s.username})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Assessment Option</label>
                            <select
                              value={manualTestId}
                              onChange={(e) => setManualTestId(e.target.value)}
                              required
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                            >
                              <option value="">-- Choose task --</option>
                              {teacherData.tests.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (Max {t.maxScore})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Secure Date</label>
                            <input
                              type="date"
                              required
                              value={manualScoreDate}
                              onChange={(e) => setManualScoreDate(e.target.value)}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-2.5 py-[6px] text-xs text-white focus:outline-none focus:border-purple-600 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Marks Secured</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-2.5 h-4 w-4 text-purple-600" />
                            <input
                              type="number"
                              step="any"
                              required
                              min="0"
                              placeholder={manualTestId ? `Secured score out of ${teacherData.tests.find(x => x.id === manualTestId)?.maxScore}` : "Enter secured score"}
                              value={manualScoreRaw}
                              onChange={(e) => setManualScoreRaw(e.target.value)}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                            />
                          </div>
                          {manualTestId && manualScoreRaw && (
                            <p className="text-[9px] font-mono text-purple-400 mt-1">
                              Will register as {((parseFloat(manualScoreRaw) / (teacherData.tests.find(x => x.id === manualTestId)?.maxScore || 1)) * 100).toFixed(1)}% ({determineGrade(parseFloat(((parseFloat(manualScoreRaw) / (teacherData.tests.find(x => x.id === manualTestId)?.maxScore || 1)) * 100).toFixed(2)))})
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition active:scale-[98] shadow-md shadow-purple-900/10"
                        >
                          Submit Manual Grade Entry
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Active Assessments List Card */}
                <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 border-b border-purple-950/35 pb-4">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Active Assessments List</span>
                  </h3>
                  {teacherData.tests.length > 0 ? (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {teacherData.tests.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#030304]/60 border border-neutral-900">
                          <div>
                            <p className="font-semibold text-white">{t.name}</p>
                            <span className="font-mono text-[9px] text-neutral-500">Max Marks Limit: {t.maxScore}</span>
                          </div>
                          <button
                            id={`delete-test-${t.id}`}
                            onClick={() => handleDeleteTestTemplate(t.id, t.name)}
                            className="p-1 px-2.5 bg-red-950/40 border border-red-950/60 rounded-lg text-rose-400 hover:bg-rose-900 hover:text-rose-200 text-[10px] font-bold tracking-wider uppercase transition inline-flex items-center"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Purge
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-[#030304]/40 rounded-2xl text-neutral-600 text-xs border border-dashed border-neutral-850/60">
                      No deployed assessments yet.
                    </div>
                  )}
                </div>

              </div>

              {/* Recruited Class members drilldown */}
              <div className="lg:col-span-7 bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-950/35 pb-4 gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Student Rosters & Records Tracker</span>
                  </h3>
                  
                  {/* View mode toggle */}
                  <div className="flex bg-[#030304] border border-purple-950/80 rounded-xl p-1 inline-flex self-start">
                    <button
                      type="button"
                      onClick={() => setRosterViewMode("list")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                        rosterViewMode === "list"
                          ? "bg-purple-900/40 text-purple-200 border border-purple-850/60 shadow-inner"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      Single List
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterViewMode("by-group")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                        rosterViewMode === "by-group"
                          ? "bg-purple-900/40 text-purple-200 border border-purple-850/60 shadow-inner"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      Per Group View
                    </button>
                  </div>
                </div>

                {rosterViewMode === "list" ? (
                  /* Filter and roster lists */
                  <div className="grid sm:grid-cols-2 gap-4">
                    
                    {/* Students Roster list */}
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-2">Class Grads ({
                        teacherData.students.filter(s => {
                          const matchClass = teacherFilterClass === "ALL" || s.classGroup === teacherFilterClass;
                          const matchYear = teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear;
                          return matchClass && matchYear;
                        }).length
                      })</span>
                      
                      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                        {teacherData.students
                          .filter(s => {
                            const matchClass = teacherFilterClass === "ALL" || s.classGroup === teacherFilterClass;
                            const matchYear = teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear;
                            return matchClass && matchYear;
                          })
                          .map(student => {
                            // Compute average performance for this student
                            const sScores = teacherData.scores.filter(sc => sc.studentUsername === student.username);
                            const avgValue = sScores.length > 0
                              ? sScores.reduce((sum, sx) => sum + sx.percentage, 0) / sScores.length
                              : null;

                            return (
                              <button
                                id={`select-student-${student.username}`}
                                key={student.username}
                                onClick={() => setSelectedStudentDrilldown(student.username)}
                                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                                  selectedStudentDrilldown === student.username
                                    ? "bg-purple-950/60 border-purple-500/70 text-white"
                                    : "bg-neutral-900/40 border-neutral-850/60 text-neutral-300 hover:bg-neutral-900"
                                }`}
                              >
                                <div className="truncate max-w-[70%]">
                                  <p className="font-semibold text-xs truncate">{student.nickname}</p>
                                  <span className="font-mono text-[9px] text-neutral-500">
                                    User: {student.username} (Group {student.classGroup})
                                  </span>
                                </div>
                                <div className="text-right">
                                  {avgValue !== null ? (
                                    <>
                                      <span className="font-mono font-bold text-xs text-purple-300 block">{avgValue.toFixed(1)}%</span>
                                      <span className="text-[9px] text-neutral-500 uppercase">{sScores.length} logged</span>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-neutral-600 italic">No entries</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Drilling information pane */}
                    <div className="bg-[#030304] rounded-2xl p-4 border border-purple-950/80 flex flex-col justify-between min-h-[300px]">
                      {selectedStudentDrilldown ? (
                        (() => {
                          const sProfile = teacherData.students.find(s => s.username === selectedStudentDrilldown);
                          if (!sProfile) return <p className="text-neutral-500 text-xs">Error profile loading.</p>;

                          const sScoresFiltered = teacherData.scores.filter(
                            sc => sc.studentUsername === selectedStudentDrilldown
                          );

                          const avgVal = sScoresFiltered.length > 0
                            ? sScoresFiltered.reduce((sum, s) => sum + s.percentage, 0) / sScoresFiltered.length
                            : 0;

                          return (
                            <div className="flex flex-col justify-between h-full space-y-4">
                              <div>
                                <div className="flex items-center justify-between border-b border-purple-950/35 pb-2">
                                  <span className="text-[10px] font-mono text-purple-400 capitalize">Alias: {sProfile.nickname}</span>
                                  <span className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-400">Class {sProfile.classGroup}</span>
                                </div>

                                <div className="mt-3.5 space-y-1">
                                  <p className="text-[10px] text-neutral-550 font-mono uppercase">Secure Stats</p>
                                  <div className="text-sm font-semibold text-white font-mono leading-relaxed mt-1 flex items-center">
                                    <span>Group:</span>
                                    <select
                                      value={sProfile.classGroup}
                                      onChange={(e) => handleReassignStudentGroup(sProfile.username, e.target.value, sProfile.nickname)}
                                      className="ml-2 bg-[#030304] border border-purple-950/60 rounded px-2 py-0.5 text-xs text-purple-300 font-bold focus:outline-none focus:border-purple-600 transition inline-block"
                                    >
                                      <option value="A">Group A</option>
                                      <option value="B">Group B</option>
                                      <option value="C">Group C</option>
                                      <option value="D">Group D</option>
                                      <option value="E">Group E</option>
                                    </select>
                                  </div>
                                  <div className="mt-4 pt-1 space-y-1">
                                    <p className="text-xs font-semibold text-white">
                                      Average secure percentage:{" "}
                                      <span className="text-purple-300 font-mono font-bold">{avgVal > 0 ? `${avgVal.toFixed(1)}%` : "N/A"}</span>
                                    </p>
                                    <p className="text-xs text-neutral-400 font-semibold mt-1">
                                      Highest secure score:{" "}
                                      <span className="text-emerald-400 font-mono">
                                        {sScoresFiltered.length > 0
                                          ? `${Math.max(...sScoresFiltered.map(x => x.percentage))}%`
                                          : "None"}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Log entries checklist</span>
                                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 text-[11px]">
                                    {sScoresFiltered.length > 0 ? (
                                      sScoresFiltered.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-neutral-900 px-2 py-1 rounded">
                                          <span className="truncate text-neutral-300 font-medium max-w-[60%]">{item.testName}</span>
                                          <span className="font-mono text-purple-400">{item.percentage}% ({item.grade})</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-neutral-600 italic">No test grades submitted.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-purple-950/30">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(sProfile.username, sProfile.nickname)}
                                  className="w-full py-2 bg-red-950/40 hover:bg-rose-900 border border-red-900/60 text-red-350 uppercase font-bold text-[10px] rounded-lg tracking-wider transition inline-flex items-center justify-center space-x-1"
                                >
                                  <Trash2 className="w-3" />
                                  <span>Purge Student Profile</span>
                                </button>
                                
                                <button
                                  id="drilldown-retract-all"
                                  onClick={() => {
                                    if (sScoresFiltered.length === 0) return;
                                    requestConfirm(
                                      "Retract All Test Grades",
                                      `Are you absolutely sure you want to retract/delete all test submissions logged for alias "${sProfile.nickname}"?`,
                                      async () => {
                                        try {
                                          await Promise.all(
                                            sScoresFiltered.map(item =>
                                              fetch(`/api/scores/${item.id}`, { method: "DELETE" })
                                            )
                                          );
                                          showNotification(`Purged entries of candidate "${sProfile.nickname}"`, "success");
                                          syncApplicationData();
                                        } catch (_) {}
                                      }
                                    );
                                  }}
                                  disabled={sScoresFiltered.length === 0}
                                  className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-405 uppercase font-bold text-[9px] rounded-lg tracking-wider disabled:opacity-30 disabled:pointer-events-none transition"
                                >
                                  Clear Grade Submissions
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 p-4">
                          <Search className="w-8 h-8 text-neutral-800 mb-2" />
                          <p className="text-xs font-semibold">Select static profile from Roster listing to view detail sheets</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  /* BY GROUP COMPREHENSIVE VIEW */
                  <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2">
                    {["A", "B", "C", "D", "E"].map(groupName => {
                      const groupStudents = teacherData.students.filter(
                        s => s.classGroup === groupName && (teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear)
                      );
                      
                      return (
                        <div key={groupName} className="bg-[#030304]/60 border border-purple-950/60 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-purple-950/30 pb-2">
                            <span className="font-mono text-xs font-bold text-purple-300 uppercase">
                              Class Group {groupName}
                            </span>
                            <span className="text-[10px] bg-purple-950/40 text-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                              {groupStudents.length} {groupStudents.length === 1 ? "student" : "students"}
                            </span>
                          </div>

                          {groupStudents.length > 0 ? (
                            <div className="space-y-2">
                              {groupStudents.map(student => {
                                const sScores = teacherData.scores.filter(sc => sc.studentUsername === student.username);
                                const avgValue = sScores.length > 0
                                  ? sScores.reduce((sum, sx) => sum + sx.percentage, 0) / sScores.length
                                  : null;

                                return (
                                  <div
                                    key={student.username}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-900 gap-3 text-xs"
                                  >
                                    <div className="truncate max-w-[65%]">
                                      <p className="font-semibold text-white truncate">{student.nickname}</p>
                                      <p className="font-mono text-[9px] text-neutral-500 truncate">
                                        {student.username} {student.academicYear !== "ALL" && `(${student.academicYear})`}
                                      </p>
                                      {avgValue !== null ? (
                                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-purple-950/40 text-purple-300 rounded font-bold font-mono">
                                          Avg: {avgValue.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-neutral-600 block mt-0.5 italic">No submissions</span>
                                      )}
                                    </div>

                                    {/* Action row */}
                                    <div className="flex items-center space-x-2 self-end sm:self-center">
                                      <div className="flex items-center space-x-1">
                                        <span className="text-[9px] font-mono text-neutral-600 uppercase">Move:</span>
                                        <select
                                          value={student.classGroup}
                                          onChange={(e) => handleReassignStudentGroup(student.username, e.target.value, student.nickname)}
                                          className="bg-[#030304] border border-purple-950/80 rounded px-1.5 py-0.5 text-[10px] text-purple-200 font-bold focus:outline-none focus:border-purple-600 transition"
                                        >
                                          <option value="A">Group A</option>
                                          <option value="B">Group B</option>
                                          <option value="C">Group C</option>
                                          <option value="D">Group D</option>
                                          <option value="E">Group E</option>
                                        </select>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStudent(student.username, student.nickname)}
                                        title="Purge student profile"
                                        className="p-1.5 bg-red-950/30 hover:bg-rose-950 text-rose-400 hover:text-rose-200 border border-red-950/50 hover:border-red-650/50 rounded-lg transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] font-mono text-neutral-600 italic">No candidates registered in this class group.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>

            {/* Complete roster overall records ledger */}
            <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 border-b border-purple-950/35 pb-4 mb-4">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Overall Assessments Secure Ledger ({teacherMetrics.scoresFiltered.length} submissions)</span>
              </h3>

              <div className="overflow-x-auto">
                {teacherMetrics.scoresFiltered.length > 0 ? (
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="text-[10px] text-purple-400/80 uppercase tracking-widest border-b border-purple-950/50">
                      <tr>
                        <th className="py-3 px-4">Assess Date</th>
                        <th className="py-3 px-4">Private Alias</th>
                        <th className="py-3 px-4">Assessment Name</th>
                        <th className="py-3 px-4 text-center">Class / Cycle</th>
                        <th className="py-3 px-4 font-mono text-center">Marks</th>
                        <th className="py-3 px-4 font-mono text-center">Percentage</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4 text-right">Erase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {teacherMetrics.scoresFiltered.map(score => {
                        const gradeSticker = getGradeSticker(score.percentage);
                        return (
                          <tr key={score.id} className="hover:bg-purple-950/15 transition duration-150">
                            <td className="py-3.5 px-4 text-neutral-400">{score.date}</td>
                            <td className="py-3.5 px-4 text-white font-semibold flex items-center space-x-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              <span>{score.studentNickname}</span>
                            </td>
                            <td className="py-3.5 px-4 text-neutral-200 font-semibold">{score.testName}</td>
                            <td className="py-3.5 px-4 text-center text-neutral-400">
                              Group {score.classGroup} • {score.academicYear}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {score.score} / {score.maxScore}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-400 text-center">{score.percentage}%</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${gradeSticker.color}`}>
                                {score.grade}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                id={`erase-score-${score.id}`}
                                onClick={() => {
                                  requestConfirm(
                                    "Erase Grade Entry",
                                    "Are you sure you want to permanently erase this score entry from student record?",
                                    async () => {
                                      try {
                                        const response = await fetch(`/api/scores/${score.id}`, { method: "DELETE" });
                                        if (response.ok) {
                                          showNotification("Student score purges updated successfully.", "success");
                                          syncApplicationData();
                                        }
                                      } catch (e) {}
                                    }
                                  );
                                }}
                                className="text-neutral-500 hover:text-red-400 transition ml-auto inline-block bg-neutral-900 border border-neutral-800 p-1.5 rounded-lg active:scale-95"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center p-8 text-neutral-600">
                    No assessments match the current filters or have been logged yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* COMPREHENSIVE WILD CAT ARENA (LEADERBOARD) */}
        {currentPage === "leaderboard" && currentUser && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Greetings Bar */}
            <div className="pb-6 border-b border-purple-950/40">
              <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">Apex Interactive Rankings</span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                The Wild Cat <span className="text-purple-400">Arena</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                A high-privacy tracking platform which preserves student confidentiality using generated wild cat names. Compare overall weighted average performances across all class groups.
              </p>
            </div>

            {/* Podium Spotlights */}
            {arenaList.length > 0 && (
              <div className="grid md:grid-cols-3 gap-6 items-end pt-4 max-w-4xl mx-auto">
                
                {/* 2nd Place */}
                {arenaList[1] && (
                  <div className="bg-neutral-950/60 border border-purple-950 rounded-3xl p-6 text-center shadow-lg transform hover:-translate-y-1 transition flex flex-col items-center justify-between min-h-[180px] order-2 md:order-1">
                    <div className="space-y-2">
                      <span className="text-lg font-black font-mono text-slate-400">02</span>
                      <p className="font-semibold text-white truncate max-w-[160px]">{arenaList[1].nickname}</p>
                      <span className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-400 font-mono">
                        Group {arenaList[1].classGroup}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-neutral-500">Average Performance</p>
                      <p className="text-xl font-mono font-black text-purple-300">{arenaList[1].averagePercentage}%</p>
                    </div>
                  </div>
                )}

                {/* 1st Place (Winner Banner) */}
                {arenaList[0] && (
                  <div className="bg-neutral-950 border-2 border-amber-500/40 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden transform hover:-translate-y-2.5 transition flex flex-col items-center justify-between min-h-[220px] order-1 md:order-2">
                    {/* Glowing highlight element */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-300"></div>
                    <div className="absolute -inset-0.5 rounded-3xl bg-amber-500/5 blur opacity-25"></div>
                    
                    <div className="space-y-2">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-lg font-extrabold shadow-inner mb-2 animate-pulse">
                        👑
                      </div>
                      <p className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 text-lg truncate max-w-[180px]">
                        {arenaList[0].nickname}
                      </p>
                      <span className="text-[10px] bg-amber-950/40 border border-amber-900/40 px-2.5 py-0.5 rounded-full text-amber-300 font-bold tracking-wide uppercase font-mono">
                        Apex Predator • Group {arenaList[0].classGroup}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-amber-500/70 uppercase tracking-widest font-bold">Cohorts Master</p>
                      <p className="text-2xl font-mono font-black text-white">{arenaList[0].averagePercentage}%</p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {arenaList[2] && (
                  <div className="bg-neutral-950/60 border border-purple-950 rounded-3xl p-6 text-center shadow-lg transform hover:-translate-y-1 transition flex flex-col items-center justify-between min-h-[170px] order-3">
                    <div className="space-y-2">
                      <span className="text-lg font-black font-mono text-amber-705/70">03</span>
                      <p className="font-semibold text-white truncate max-w-[160px]">{arenaList[2].nickname}</p>
                      <span className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-400 font-mono">
                        Group {arenaList[2].classGroup}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-neutral-500">Average Performance</p>
                      <p className="text-xl font-mono font-black text-purple-300">{arenaList[2].averagePercentage}%</p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Arena Standings Board */}
            <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl max-w-4xl mx-auto">
              <h3 className="text-sm font-semibold text-purple-300/90 flex items-center space-x-2 border-b border-purple-950/35 pb-4 mb-4">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Leaderboard Standing Matrix ({arenaList.length} unique candidates tracked)</span>
              </h3>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {arenaList.length > 0 ? (
                  arenaList.map((rank, index) => {
                    const isMe = rank.nickname === currentUser.nickname;
                    const gradeSticker = getGradeSticker(rank.averagePercentage);
                    return (
                      <div
                        id={`arena-rank-row-${index}`}
                        key={rank.nickname}
                        className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                          isMe
                            ? "bg-purple-900/20 border-purple-600 shadow-lg shadow-purple-600/10"
                            : "bg-neutral-900/40 border-neutral-850/60 hover:bg-neutral-900"
                        }`}
                      >
                        <div className="flex items-center space-x-4 min-w-[70%]">
                          <span className={`h-8 w-8 rounded-xl font-mono text-sm font-bold flex items-center justify-center border ${
                            index === 0
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold"
                              : index === 1
                              ? "bg-slate-500/10 border-slate-500/30 text-slate-300"
                              : "bg-purple-950/30 border-purple-950 text-neutral-400"
                          }`}>
                            {index + 1}
                          </span>

                          <div className="truncate">
                            <span className="font-semibold text-white text-sm flex items-center space-x-1.5 truncate">
                              <span>{rank.nickname}</span>
                              {isMe && (
                                <span className="bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider text-purple-300">
                                  You
                                </span>
                              )}
                            </span>
                            <p className="font-mono text-[10px] text-neutral-500 mt-1">
                              Class Group {rank.classGroup} • Cycle: {rank.academicYear} • Solved {rank.testsCount} Assessments
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-purple-300 block">
                            {rank.averagePercentage}%
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-[8px] font-bold rounded tracking-wider uppercase border border-neutral-800 ${gradeSticker.color}`}>
                            Bound: {gradeSticker.name}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-8 text-neutral-600 font-medium">
                    No classroom achievements have sparked yet. Submit scores to rise in the Wilderness rankings list.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      <div className="py-8"></div>

      {/* Custom Non-blocking Confirmation Dialog */}
      {confirmModalState.isOpen && (
        <div 
          id="custom-confirm-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
        >
          <div 
            id="custom-confirm-card"
            className="bg-neutral-950 border border-purple-900 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-purple-950/20 space-y-4 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex items-start space-x-3 text-rose-500">
              <div className="p-2 bg-rose-950/40 rounded-xl border border-rose-900/40 mt-0.5 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-450" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-white tracking-tight">
                  {confirmModalState.title}
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed mt-2.5">
                  {confirmModalState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-purple-950/30">
              <button
                id="custom-confirm-cancel"
                type="button"
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-850 hover:border-neutral-750 rounded-xl transition duration-150 active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="custom-confirm-approve"
                type="button"
                onClick={confirmModalState.onConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-red-650 hover:bg-red-500 rounded-xl shadow-lg shadow-red-650/10 transition duration-150 active:scale-95 cursor-pointer"
              >
                Proceed Operation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
