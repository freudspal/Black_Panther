import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Hash,
  Upload,
  FileSpreadsheet,
  Download,
  KeyRound,
  ExternalLink,
  Gauge,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import Header from "./components/Header";
import { TestTemplate, Student, ScoreEntry, TeacherDashboardMetrics, RevisionSession, ExamAttempt, RevisionService, RevisionServiceLog } from "./types";
// @ts-ignore
import pantherLogo from "./assets/images/panther_logo_1782473515224.jpg";

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
  const [flashLog, setFlashLog] = useState<boolean>(false);
  const flashTimeoutRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [syncProgress, setSyncProgress] = useState<number>(100);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);
  const [verifiedActions, setVerifiedActions] = useState<Array<{
    id: string;
    text: string;
    type: "success" | "info" | "error";
    timestamp: string;
  }>>([]);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  
  // Configuration fetched from backend
  const [config, setConfig] = useState<{
    hasSupabase: boolean;
    supabaseUrl: string | null;
    supabaseError: string | null;
  }>({
    hasSupabase: false,
    supabaseUrl: null,
    supabaseError: null,
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
  const [assessmentSearch, setAssessmentSearch] = useState<string>("");
  const [assessmentSortOrder, setAssessmentSortOrder] = useState<"date-desc" | "date-asc" | "grade-desc" | "grade-asc">("date-desc");

  // Student Revision tracker states
  const [studentTab, setStudentTab] = useState<"my-progress" | "wild-cat-arena" | "revision-progress">("my-progress");
  const [arenaRankTab, setArenaRankTab] = useState<"aggregate" | "assessments" | "revision">("aggregate");
  const [arenaGroupFilter, setArenaGroupFilter] = useState<string>("ALL");
  const [revisionSessions, setRevisionSessions] = useState<RevisionSession[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [revisionServices, setRevisionServices] = useState<RevisionService[]>([]);
  const [revisionServiceLogs, setRevisionServiceLogs] = useState<RevisionServiceLog[]>([]);

  // Study Session Timer & Search
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [cumulativeSearch, setCumulativeSearch] = useState<string>("");
  const [ragFilter, setRagFilter] = useState<"all" | "green" | "amber" | "red">("all");
  const [logSortOrder, setLogSortOrder] = useState<"latest" | "oldest" | "longest" | "shortest">("latest");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [quickLogTopic, setQuickLogTopic] = useState<string>("");
  const [quickLogRag, setQuickLogRag] = useState<"red" | "amber" | "green">("green");
  const [showQuickLogForm, setShowQuickLogForm] = useState<boolean>(false);
  const [isSavingTopicLog, setIsSavingTopicLog] = useState<boolean>(false);
  const [isSavingExamAttempt, setIsSavingExamAttempt] = useState<boolean>(false);
  const [isLoggingService, setIsLoggingService] = useState<boolean>(false);
  const [showLivenessCheck, setShowLivenessCheck] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false);
  const [processingDeletions, setProcessingDeletions] = useState<Record<string, boolean>>({});
  const [isRegisteringShortcut, setIsRegisteringShortcut] = useState<boolean>(false);

  // Refs for background-accurate stopwatch timing and liveness check interval
  const timerStartTimeRef = useRef<number | null>(null);
  const timerBaseSecondsRef = useRef<number>(0);
  const lastLivenessCheckMarkRef = useRef<number>(0);

  // Teacher dashboard sub-tab state
  const [teacherViewTab, setTeacherViewTab] = useState<"assessments" | "revision-progress">("assessments");

  // Revision logging forms
  const [revDate, setRevDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [revDuration, setRevDuration] = useState<string>("");
  const [revTopic, setRevTopic] = useState<string>("");
  const [revRag, setRevRag] = useState<"red" | "amber" | "green">("green");
  const [revComment, setRevComment] = useState<string>("");

  // Exam Question Attempts forms
  const [examComponent, setExamComponent] = useState<string>("");
  const [examTopic, setExamTopic] = useState<string>("");
  const [examWording, setExamWording] = useState<string>("");
  const [examMarksAvailable, setExamMarksAvailable] = useState<string>("");
  const [examMarksScored, setExamMarksScored] = useState<string>("");
  const [examSelfMark, setExamSelfMark] = useState<string>(""); // self scoring score
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [examRag, setExamRag] = useState<"red" | "amber" | "green">("green");

  // External Services config forms
  const [newServiceName, setNewServiceName] = useState<string>("");
  const [newServiceUrl, setNewServiceUrl] = useState<string>("");
  const [logServiceId, setLogServiceId] = useState<string>("");
  const [logServiceDuration, setLogServiceDuration] = useState<string>("");
  const [logServiceRag, setLogServiceRag] = useState<"red" | "amber" | "green">("green");

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
  const [chartDisplayMode, setChartDisplayMode] = useState<"chronological" | "single_test">("chronological");
  const [selectedChartTestId, setSelectedChartTestId] = useState<string>("");
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
      showNotification("Please provide headers and at least one assessment row.", "error");
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
      showNotification("Network error during template import.", "error");
    }
  };

  const handleStudentsImport = async (textToParse: string) => {
    const lines = textToParse.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      showNotification("Please provide headers and at least one student row.", "error");
      return;
    }
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("address") || h.includes("student email") || h.includes("username"));
    const classIdx = headers.findIndex(h => h.includes("class") || h.includes("group"));
    const yearIdx = headers.findIndex(h => h.includes("year") || h.includes("cycle") || h.includes("academic"));

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
      if (email) {
        studentsParsed.push({ email, classGroup, academicYear });
      }
    }

    if (studentsParsed.length === 0) {
      showNotification("No valid student rows found.", "error");
      return;
    }

    try {
      showNotification("Uploading student list...", "info");
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
        showNotification(data.error || "Failed to import student list.", "error");
      }
    } catch (_) {
      showNotification("Network error during student import.", "error");
    }
  };

  const handleBulkImport = async (textToParse: string) => {
    const records = processExcelCSVData(textToParse);
    if (records.length === 0) {
      showNotification("No valid student score rows found in columns.", "error");
      return;
    }

    try {
      showNotification("Uploading spreadsheet scores...", "info");
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
        showNotification(data.error || "Failed to process bulk import.", "error");
      }
    } catch (_) {
      showNotification("Network error during bulk score upload.", "error");
    }
  };

  const downloadTemplate = (type: "grades" | "assessments" | "students") => {
    let content = "";
    let filename = "";
    
    if (type === "students") {
      content = "Email,Group,Academic Year\nstudent_agent1@school.com,A,26-27\nstudent_agent2@school.com,B,26-27\nstudent_agent3@school.com,A,26-27\n";
      filename = "roster_template.csv";
    } else if (type === "grades") {
      content = "Students Email Address,Assessment Name,Max Marks,Actual Marks\nstudent_agent1@school.com,Introductory Mechanics,50,42\nstudent_agent2@school.com,Introductory Mechanics,50,31\nstudent_agent3@school.com,Introductory Mechanics,50,48\n";
      filename = "grades_template.csv";
    } else {
      content = "Assessment Name,Max Marks\nThermodynamics Quiz,30\nWaves & Oscillations Final,100\nQuantum Basics Checkpoint,20\n";
      filename = "topics_template.csv";
    }
    
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Excel CSV template "${filename}" downloaded successfully.`, "success");
  };

  const handleTeacherManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentUsername || !manualTestId || !manualScoreRaw || !manualScoreDate) {
      showNotification("Please select a student, assessment, date, and enter a score.", "error");
      return;
    }

    const testTemplate = teacherData.tests.find(t => t.id === manualTestId);
    if (testTemplate) {
      const rawVal = parseFloat(manualScoreRaw);
      if (isNaN(rawVal) || rawVal < 0 || rawVal > testTemplate.maxScore) {
        showNotification(`Score must be between 0 and the maximum marks limit of ${testTemplate.maxScore} for this assessment.`, "error");
        return;
      }
    }

    try {
      showNotification("Logging score...", "info");
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
        showNotification(`Successfully logged score for "${manualStudentUsername}".`, "success");
        setManualStudentUsername("");
        setManualScoreRaw("");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to record manually entered marks.", "error");
      }
    } catch (_) {
      showNotification("Server error during score filing.", "error");
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

  function cleanComment(comment: string): string {
    if (!comment) return "";
    let clean = comment;
    if (clean.includes("__EXAM_METADATA__:")) {
      clean = clean.split("__EXAM_METADATA__:")[0];
    }
    if (clean.includes("__EXTERNAL_APP__:")) {
      clean = clean.split("__EXTERNAL_APP__:")[0];
    }
    return clean.trim();
  }

  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load config on mount
  useEffect(() => {
    fetch(`/api/config-status?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConfig({
            hasSupabase: data.hasSupabase,
            supabaseUrl: data.supabaseUrl,
            supabaseError: data.supabaseError || null,
          });
        }
      })
      .catch(err => console.error("Error loading API config", err));
  }, []);

  // Sync timerSecondsRef with timerSeconds state to avoid interval re-triggering
  const timerSecondsRef = useRef<number>(timerSeconds);
  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
  }, [timerSeconds]);

  // Study timer effect with background accuracy and system clock timestamp tracking
  useEffect(() => {
    let interval: any = null;

    if (isTimerRunning && !showLivenessCheck) {
      if (timerStartTimeRef.current === null) {
        timerStartTimeRef.current = Date.now() - (timerSecondsRef.current * 1000);
      }

      interval = setInterval(() => {
        if (timerStartTimeRef.current !== null) {
          const elapsedSeconds = Math.floor((Date.now() - timerStartTimeRef.current) / 1000);
          setTimerSeconds(elapsedSeconds);

          // Trigger liveness prompt if we crossed a 15-minute boundary
          const current15MinBlock = Math.floor(elapsedSeconds / 900);
          if (elapsedSeconds > 0 && current15MinBlock > lastLivenessCheckMarkRef.current) {
            lastLivenessCheckMarkRef.current = current15MinBlock;
            setShowLivenessCheck(true);
          }
        }
      }, 500); // Poll every 500ms to stay extremely snappy and instantly sync when tab is reactivated
    } else {
      timerStartTimeRef.current = null;
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, showLivenessCheck]);

  // Helper to generate a unique 9-digit code ID (as a string containing only digits)
  const generate9DigitId = (): string => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const syncLocalAndCloudData = async (
    key: string,
    localItems: any[],
    cloudItems: any[],
    postEndpoint: string,
    payloadMapper: (item: any) => any,
    quiet = true
  ): Promise<any[]> => {
    const localMap = new Map<string, any>();
    localItems.forEach(item => {
      if (item && item.id) {
        localMap.set(String(item.id), item);
      }
    });

    const mergedList: any[] = [];
    const itemsToUpload: any[] = [];
    const cloudProcessedIds = new Set<string>();

    for (const cloudItem of cloudItems) {
      if (!cloudItem || !cloudItem.id) continue;
      const idStr = String(cloudItem.id);
      cloudProcessedIds.add(idStr);

      const localItem = localMap.get(idStr);
      if (localItem) {
        // Both exist. Compare updatedAt or date
        const localTime = new Date(localItem.updatedAt || localItem.date || 0).getTime();
        const cloudTime = new Date(cloudItem.updatedAt || cloudItem.date || 0).getTime();

        if (localTime > cloudTime) {
          // Local is newer -> preserve local and upload it
          mergedList.push(localItem);
          itemsToUpload.push(localItem);
        } else {
          // Cloud is newer or equal -> preserve cloud, ensure it's stamped
          const stampedCloud = {
            ...cloudItem,
            updatedAt: cloudItem.updatedAt || new Date().toISOString()
          };
          mergedList.push(stampedCloud);
        }
      } else {
        // Exists in cloud only
        const stampedCloud = {
          ...cloudItem,
          updatedAt: cloudItem.updatedAt || new Date().toISOString()
        };
        mergedList.push(stampedCloud);
      }
    }

    // Add remaining local items (not in cloud list)
    for (const localItem of localItems) {
      if (!localItem || !localItem.id) continue;
      const idStr = String(localItem.id);
      if (!cloudProcessedIds.has(idStr)) {
        // Exists in local only -> upload it
        const stampedLocal = {
          ...localItem,
          updatedAt: localItem.updatedAt || new Date().toISOString()
        };
        mergedList.push(stampedLocal);
        itemsToUpload.push(stampedLocal);
      }
    }

    // Save final merged list to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(mergedList));
    } catch (e) {
      console.error(`Failed to save local storage cache for ${key}`, e);
    }

    // Quietly upload new or modified items to cloud
    if (itemsToUpload.length > 0) {
      for (const item of itemsToUpload) {
        try {
          const payload = payloadMapper(item);
          await fetch(postEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.error(`Failed quiet upload of item ${item.id} to ${postEndpoint}`, err);
        }
      }
    }

    return mergedList;
  };

  // Sync / Refresh helper
  const syncApplicationData = async (quiet = false) => {
    if (!quiet) {
      setIsRefreshing(true);
      const databaseType = config.hasSupabase ? "Supabase database" : "local cache";
      showNotification(`Syncing data with ${databaseType}...`, "info");
    }
    try {
      if (currentUser) {
        const timestamp = Date.now();
        if (currentUser.role === "student") {
          setBackgroundSyncStatus("syncing");
          setSyncProgress(15);
          // Load tests, student specific scores, and revision progress
          const [testsRes, scoresRes, revisionRes] = await Promise.all([
            fetch(`/api/tests?t=${timestamp}`),
            fetch(`/api/scores?studentUsername=${encodeURIComponent(currentUser.username)}&t=${timestamp}`),
            fetch(`/api/student/revision-data?studentUsername=${encodeURIComponent(currentUser.username)}&t=${timestamp}`)
          ]);
          const testsData = await testsRes.json();
          const scoresData = await scoresRes.json();
          const revisionData = await revisionRes.json();

          setSyncProgress(35);

          if (testsData.success) {
            setTests(testsData.tests);
            if (!selectedTestId && testsData.tests.length > 0) {
              setSelectedTestId(testsData.tests[0].id);
            }
          }

          // Get local caches from localStorage
          let localScores: any[] = [];
          let localSessions: any[] = [];
          let localAttempts: any[] = [];
          let localServiceLogs: any[] = [];

          try {
            localScores = JSON.parse(localStorage.getItem(`scores_${currentUser.username}`) || "[]");
            localSessions = JSON.parse(localStorage.getItem(`revision_sessions_${currentUser.username}`) || "[]");
            localAttempts = JSON.parse(localStorage.getItem(`exam_attempts_${currentUser.username}`) || "[]");
            localServiceLogs = JSON.parse(localStorage.getItem(`revision_service_logs_${currentUser.username}`) || "[]");
          } catch (_) {}

          // 1. Sync Scores / Assignments
          let finalScores = localScores;
          if (scoresData.success) {
            finalScores = await syncLocalAndCloudData(
              `scores_${currentUser.username}`,
              localScores,
              scoresData.scores || [],
              "/api/scores",
              (item) => ({
                id: item.id,
                studentUsername: currentUser.username,
                testId: item.testId,
                score: item.score,
                date: item.date,
                updatedAt: item.updatedAt
              }),
              quiet
            );
          }
          setStudentScores(finalScores);
          setSyncProgress(60);

          // 2. Sync Revision Sessions & Exam Attempts
          let finalSessions = localSessions;
          let finalAttempts = localAttempts;

          if (revisionData.success) {
            finalSessions = await syncLocalAndCloudData(
              `revision_sessions_${currentUser.username}`,
              localSessions,
              revisionData.revisionSessions || [],
              "/api/student/revision-session",
              (item) => ({
                id: item.id,
                studentUsername: currentUser.username,
                date: item.date,
                duration: item.duration,
                topic: item.topic,
                rag: item.rag,
                comment: item.comment,
                updatedAt: item.updatedAt
              }),
              quiet
            );

            setSyncProgress(80);

            finalAttempts = await syncLocalAndCloudData(
              `exam_attempts_${currentUser.username}`,
              localAttempts,
              revisionData.examAttempts || [],
              "/api/student/exam-attempt",
              (item) => ({
                id: item.id,
                studentUsername: currentUser.username,
                component: item.component,
                topic: item.topic,
                questionWording: item.questionWording,
                marksAvailable: item.marksAvailable,
                marksScored: item.marksScored,
                selfMarkingScore: item.selfMarkingScore,
                date: item.date,
                rag: item.rag,
                updatedAt: item.updatedAt
              }),
              quiet
            );

            setSyncProgress(90);

            let finalServiceLogs = localServiceLogs;
            finalServiceLogs = await syncLocalAndCloudData(
              `revision_service_logs_${currentUser.username}`,
              localServiceLogs,
              revisionData.revisionServiceLogs || [],
              "/api/student/revision-services/log",
              (item) => ({
                id: item.id,
                sessionId: item.sessionId || String(Date.now() + Math.floor(Math.random() * 1000000)),
                studentUsername: currentUser.username,
                serviceId: item.serviceId,
                serviceName: item.serviceName,
                duration: item.duration,
                date: item.date,
                updatedAt: item.updatedAt
              }),
              quiet
            );

            setRevisionServiceLogs(finalServiceLogs);
            setRevisionServices(revisionData.revisionServices || []);
            try {
              localStorage.setItem(`revision_services_${currentUser.username}`, JSON.stringify(revisionData.revisionServices || []));
            } catch (_) {}
          }

          setRevisionSessions(finalSessions);
          setExamAttempts(finalAttempts);
          setBackgroundSyncStatus("synced");
          setSyncProgress(100);

        } else if (currentUser.role === "teacher") {
          // Load teacher panel summary metrics
          const res = await fetch(`/api/teacher/dashboard?t=${timestamp}`);
          const data = await res.json();
          if (data.success) {
            setTeacherData(data);
          }
        }
      }
      if (!quiet) {
        showNotification("Data synchronized successfully.", "success");
      }
    } catch (err) {
      if (currentUser?.role === "student") {
        setBackgroundSyncStatus("error");
      }
      if (!quiet) {
        showNotification("Connection delay during sync. Retrying with local data.", "error");
      }
    } finally {
      if (!quiet) {
        setIsRefreshing(false);
      }
    }
  };

  // Trigger auto refresh when user state transitions
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "student") {
        // Instantly load cached revision data from localStorage to eliminate any UI delay/lag
        try {
          const cachedScores = localStorage.getItem(`scores_${currentUser.username}`);
          const cachedSessions = localStorage.getItem(`revision_sessions_${currentUser.username}`);
          const cachedAttempts = localStorage.getItem(`exam_attempts_${currentUser.username}`);
          const cachedServices = localStorage.getItem(`revision_services_${currentUser.username}`);
          const cachedServiceLogs = localStorage.getItem(`revision_service_logs_${currentUser.username}`);

          if (cachedScores) setStudentScores(JSON.parse(cachedScores));
          if (cachedSessions) setRevisionSessions(JSON.parse(cachedSessions));
          if (cachedAttempts) setExamAttempts(JSON.parse(cachedAttempts));
          if (cachedServices) setRevisionServices(JSON.parse(cachedServices));
          if (cachedServiceLogs) setRevisionServiceLogs(JSON.parse(cachedServiceLogs));
        } catch (e) {
          console.error("Failed to restore revision cache from localStorage", e);
        }

        // Quietly perform background database sync without blocking the UI
        syncApplicationData(true);
      } else {
        // Teacher panel does standard sync
        syncApplicationData();
      }
    }
  }, [currentUser]);

  // Auto-initialize selected chart student when teacher data is loaded
  useEffect(() => {
    if (currentUser?.role === "teacher") {
      if (teacherData?.students && teacherData.students.length > 0) {
        if (!selectedChartStudent || !teacherData.students.some(s => s.username === selectedChartStudent)) {
          setSelectedChartStudent(teacherData.students[0].username);
        }
      }
      if (teacherData?.tests && teacherData.tests.length > 0) {
        if (!selectedChartTestId || !teacherData.tests.some(t => t.id === selectedChartTestId)) {
          setSelectedChartTestId(teacherData.tests[0].id);
        }
      }
    }
  }, [teacherData, selectedChartStudent, selectedChartTestId, currentUser]);

  // Auto-refresh when entering teacher dashboard or toggling between its sub-tabs, with background polling
  useEffect(() => {
    let intervalId: any;
    if (currentUser?.role === "teacher" && currentPage === "teacher-dashboard") {
      syncApplicationData(true); // quiet background update
      
      // Set up background polling every 15 seconds to keep teacher dashboard updated in real-time
      intervalId = setInterval(() => {
        syncApplicationData(true);
      }, 15000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentPage, teacherViewTab, currentUser]);

  const showNotification = (text: string, type: "success" | "error" | "info") => {
    setSystemMessage({ text, type });
    setFlashLog(false);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setTimeout(() => {
      setFlashLog(true);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashLog(false);
      }, 1000);
    }, 20);

    const id = Math.random().toString(36).substring(2, 9);
    const date = new Date();
    const timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setVerifiedActions(prev => [{ id, text, type, timestamp }, ...prev].slice(0, 10));
  };

  // Standard Authorisations

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showNotification("Please enter both username and password.", "error");
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const isTeacher = data.role === "teacher";
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
        setCurrentPage(isTeacher ? "teacher-dashboard" : "student-dashboard");
        showNotification(`Welcome back, ${data.user.nickname}!`, "success");
        // Clear login form
        setLoginUsername("");
        setLoginPassword("");
      } else {
        showNotification(data.error || "Access denied. Username or password does not match.", "error");
      }
    } catch (err) {
      showNotification("Network connection error during login.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setCurrentPage("landing");
    showNotification("You have been logged out.", "info");
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!currentPasswordForChange || !newPasswordForChange || !confirmPasswordForChange) {
      showNotification("Please fill in all password fields.", "error");
      return;
    }
    if (newPasswordForChange !== confirmPasswordForChange) {
      showNotification("The passwords entered do not match.", "error");
      return;
    }
    if (newPasswordForChange.length < 4) {
      showNotification("The new password must be at least 4 characters long.", "error");
      return;
    }

    try {
      showNotification("Updating password...", "info");
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
        showNotification("Password updated successfully.", "success");
        setStudentNeedsPasswordChange(false);
        // Clear state fields
        setCurrentPasswordForChange("");
        setNewPasswordForChange("");
        setConfirmPasswordForChange("");
      } else {
        showNotification(data.error || "Password update failed.", "error");
      }
    } catch (_) {
      showNotification("Network error during password update.", "error");
    }
  };

  // Submit Score Entry
  const handleScoreSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!selectedTestId || !studentScoreRaw) {
      showNotification("Please select an assessment and enter your score.", "error");
      return;
    }

    const testTemplate = tests.find(t => t.id === selectedTestId);
    if (!testTemplate) return;

    const rawVal = parseFloat(studentScoreRaw);
    if (isNaN(rawVal) || rawVal < 0 || rawVal > testTemplate.maxScore) {
      showNotification(`Score must be a positive number up to ${testTemplate.maxScore}.`, "error");
      return;
    }

    setIsSavingScore(true);

    const uniqueId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const pct = Math.round((rawVal / testTemplate.maxScore) * 100);
    
    // Simple mock grade calculation for immediate UI response
    const tempGrade = pct >= 90 ? "9" : pct >= 80 ? "8" : pct >= 70 ? "7" : pct >= 60 ? "6" : pct >= 50 ? "5" : pct >= 40 ? "4" : "U";

    const newScoreEntry: ScoreEntry = {
      id: uniqueId,
      studentUsername: currentUser.username,
      studentNickname: currentUser.nickname || currentUser.username,
      testId: selectedTestId,
      testName: testTemplate.name,
      maxScore: testTemplate.maxScore,
      score: rawVal,
      percentage: pct,
      grade: tempGrade,
      date: newScoreDate,
      classGroup: currentUser.classGroup || "General",
      academicYear: currentUser.academicYear || "1",
      updatedAt: currentISO
    };

    setStudentScores(prev => {
      // Remove any existing score with same uniqueId to prevent duplicates
      const filtered = prev.filter(s => s.id !== uniqueId);
      const updated = [...filtered, newScoreEntry];
      try {
        localStorage.setItem(`scores_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    // Reset inputs and stop spinning immediately so the user can enter another score right away
    setStudentScoreRaw("");
    setIsSavingScore(false);

    // Perform database sync in the background without blocking the UI
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: uniqueId,
        studentUsername: currentUser.username,
        testId: selectedTestId,
        score: rawVal,
        date: newScoreDate,
        updatedAt: currentISO
      })
    })
    .then(async response => {
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification(`Synced ${data.score.percentage}% with cloud: Grade ${data.score.grade}`, "success");
        syncApplicationData(true); // Quiet sync
      } else {
        showNotification(data.error || "Failed to sync score to cloud database.", "error");
      }
    })
    .catch(() => {
      showNotification("Network delay. Score saved locally and will sync in background.", "info");
    });
  };

  // Submit Revision Session
  const handleRevisionSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isSavingTopicLog) return;
    if (!revDuration || !revTopic) {
      showNotification("Please fill in the duration and topic.", "error");
      return;
    }
    const durationMin = parseInt(revDuration);
    if (isNaN(durationMin) || durationMin <= 0) {
      showNotification("Duration must be a positive number of minutes.", "error");
      return;
    }

    setIsSavingTopicLog(true);

    const savedDuration = revDuration;
    const savedTopic = revTopic;
    const savedComment = revComment;
    const savedRag = revRag;
    const savedDate = revDate;

    // Instantly reset input fields
    setRevDuration("");
    setRevTopic("");
    setRevComment("");

    // Optimistically update locally with a unique 9-digit code ID
    const uniqueId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const newSession: RevisionSession = {
      id: uniqueId,
      studentUsername: currentUser.username,
      date: savedDate,
      duration: durationMin,
      topic: savedTopic,
      rag: savedRag,
      comment: savedComment,
      updatedAt: currentISO
    };

    setRevisionSessions(prev => {
      const updated = [...prev, newSession];
      try {
        localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    // Unblock the form instantly so the user is never blocked from adding multiple entries
    setIsSavingTopicLog(false);

    // Perform database sync in the background
    fetch("/api/student/revision-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: uniqueId,
        studentUsername: currentUser.username,
        date: savedDate,
        duration: durationMin,
        topic: savedTopic,
        rag: savedRag,
        comment: savedComment,
        updatedAt: currentISO
      })
    })
    .then(async response => {
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification("Revision session synchronized with cloud!", "success");
        syncApplicationData(true); // Quiet sync
      } else {
        showNotification(data.error || "Failed to sync revision session to server.", "error");
      }
    })
    .catch(() => {
      showNotification("Network connection delay. Revision session saved locally.", "info");
    });
  };

  // Submit Quick Revision from Live Timer
  const handleQuickTimerLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!quickLogTopic) {
      showNotification("Please enter a topic for the quick log.", "error");
      return;
    }
    const mins = Math.max(1, Math.round(timerSeconds / 60));

    const savedTopic = quickLogTopic;
    const savedRag = quickLogRag;

    // Instantly reset timer and form
    setTimerSeconds(0);
    setQuickLogTopic("");
    setShowQuickLogForm(false);

    // Optimistically update locally with a unique 9-digit ID
    const uniqueId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const newSession: RevisionSession = {
      id: uniqueId,
      studentUsername: currentUser.username,
      date: new Date().toISOString().split("T")[0],
      duration: mins,
      topic: savedTopic,
      rag: savedRag,
      comment: "Logged automatically via live revision timer.",
      updatedAt: currentISO
    };

    setRevisionSessions(prev => {
      const updated = [...prev, newSession];
      try {
        localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    try {
      fetch("/api/student/revision-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: uniqueId,
          studentUsername: currentUser.username,
          date: new Date().toISOString().split("T")[0],
          duration: mins,
          topic: savedTopic,
          rag: savedRag,
          comment: "Logged automatically via live revision timer.",
          updatedAt: currentISO
        })
      })
      .then(async response => {
        const data = await response.json();
        if (response.ok && data.success) {
          showNotification(`Logged ${mins} mins of revision on "${savedTopic}"!`, "success");
          await syncApplicationData(true); // Quiet sync
        } else {
          showNotification(data.error || "Failed to save session to server.", "error");
        }
      })
      .catch(() => {
        showNotification("Network connection delay. Session saved locally.", "info");
      });
    } catch (_) {}
  };

  // Delete Revision Session
  const handleRevisionSessionDelete = async (id: string) => {
    if (!currentUser) return;
    requestConfirm(
      "Purge Revision Session",
      "Are you sure you want to remove this logged revision session?",
      async () => {
        // Optimistically remove locally
        setRevisionSessions(prev => {
          const filtered = prev.filter(s => s.id !== id);
          try {
            localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        // Also optimistically remove any matching exam attempt to keep them in sync
        setExamAttempts(prev => {
          const filtered = prev.filter(a => a.id !== id);
          try {
            localStorage.setItem(`exam_attempts_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        try {
          const response = await fetch(`/api/student/revision-session/${id}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Revision session purged successfully.", "success");
            await syncApplicationData(true); // Quiet sync
          } else {
            showNotification("Failed to purge session on server.", "error");
          }
        } catch (_) {
          showNotification("Network error. Removed locally.", "info");
        }
      }
    );
  };

  // Submit Exam question attempt
  const handleExamAttemptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isSavingExamAttempt) return;
    if (!examComponent || !examTopic || !examWording || !examMarksAvailable || !examMarksScored) {
      showNotification("Please fill in all exam attempt fields.", "error");
      return;
    }
    const marksAvail = parseFloat(examMarksAvailable);
    const marksSc = parseFloat(examMarksScored);
    const selfM = Math.round((marksSc / marksAvail) * 10) || 0;

    if (isNaN(marksAvail) || marksAvail <= 0) {
      showNotification("Marks available must be a positive number.", "error");
      return;
    }
    if (isNaN(marksSc) || marksSc < 0 || marksSc > marksAvail) {
      showNotification(`Self-assessed marks scored must be between 0 and ${marksAvail}.`, "error");
      return;
    }

    setIsSavingExamAttempt(true);

    const savedComponent = examComponent;
    const savedTopic = examTopic;
    const savedWording = examWording;
    const savedMarksAvailable = examMarksAvailable;
    const savedMarksScored = examMarksScored;
    const savedSelfMark = examSelfMark;
    const savedRag = examRag;

    // Reset input fields instantly to prevent double logging
    setExamComponent("");
    setExamTopic("");
    setExamWording("");
    setExamMarksAvailable("");
    setExamMarksScored("");
    setExamSelfMark("");
    setExamRag("green");

    // Optimistically update locally with a unique 9-digit client ID and updatedAt
    const uniqueId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const computedDuration = Math.max(1, Math.round(marksAvail * 1.35));

    const newAttempt: ExamAttempt = {
      id: uniqueId,
      studentUsername: currentUser.username,
      component: savedComponent,
      topic: savedTopic,
      questionWording: savedWording,
      marksAvailable: marksAvail,
      marksScored: marksSc,
      selfMarkingScore: selfM,
      date: examDate,
      rag: savedRag,
      updatedAt: currentISO
    };

    const examMeta = {
      component: savedComponent,
      marksScored: marksSc,
      marksAvailable: marksAvail,
      selfMarkingScore: selfM,
      topicArea: savedTopic,
      rag: savedRag
    };

    const formattedComment = `Component: ${examMeta.component} | Score: ${examMeta.marksScored}/${examMeta.marksAvailable} | Self Assessed Score: ${examMeta.selfMarkingScore}/10 | Topic Area: ${examMeta.topicArea} __EXAM_METADATA__:${JSON.stringify(examMeta)}`;

    const newSession: RevisionSession = {
      id: uniqueId,
      studentUsername: currentUser.username,
      date: examDate,
      duration: computedDuration,
      topic: savedWording,
      rag: savedRag,
      comment: formattedComment,
      updatedAt: currentISO
    };

    setExamAttempts(prev => {
      const updated = [...prev, newAttempt];
      try {
        localStorage.setItem(`exam_attempts_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    setRevisionSessions(prev => {
      const updated = [...prev, newSession];
      try {
        localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    // Unblock the form instantly so the user is never blocked from adding multiple entries
    setIsSavingExamAttempt(false);

    // Perform database sync in the background
    fetch("/api/student/exam-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: uniqueId,
        studentUsername: currentUser.username,
        component: savedComponent,
        topic: savedTopic,
        questionWording: savedWording,
        marksAvailable: marksAvail,
        marksScored: marksSc,
        selfMarkingScore: selfM,
        date: examDate,
        rag: savedRag,
        updatedAt: currentISO
      })
    })
    .then(async response => {
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification("Exam question attempt synchronized with cloud!", "success");
        syncApplicationData(true); // Quiet sync
      } else {
        showNotification(data.error || "Failed to sync exam attempt to server.", "error");
      }
    })
    .catch(() => {
      showNotification("Network connection delay. Exam attempt saved locally.", "info");
    });
  };

  // Delete Exam question attempt
  const handleExamAttemptDelete = async (id: string) => {
    if (!currentUser) return;
    requestConfirm(
      "Purge Exam Attempt",
      "Are you sure you want to remove this logged exam attempt?",
      async () => {
        // Optimistically remove locally
        setExamAttempts(prev => {
          const filtered = prev.filter(a => a.id !== id);
          try {
            localStorage.setItem(`exam_attempts_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        // Also optimistically remove the linked revision session to keep them in sync
        setRevisionSessions(prev => {
          const filtered = prev.filter(s => s.id !== id);
          try {
            localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        try {
          const response = await fetch(`/api/student/exam-attempt/${id}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Exam attempt purged successfully.", "success");
            await syncApplicationData(true); // Quiet sync
          } else {
            showNotification("Failed to purge attempt on server.", "error");
          }
        } catch (_) {
          showNotification("Network error. Removed locally.", "info");
        }
      }
    );
  };

  // Register Revision service (external link)
  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newServiceName) {
      showNotification("Please enter a service name.", "error");
      return;
    }

    const savedName = newServiceName;
    const savedUrl = newServiceUrl;

    // Reset fields instantly
    setNewServiceName("");
    setNewServiceUrl("");

    setIsRegisteringShortcut(true);

    // Optimistically update locally with a 9-digit client ID and updatedAt
    const uniqueId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const newService: RevisionService = {
      id: uniqueId,
      studentUsername: currentUser.username,
      name: savedName,
      url: savedUrl,
      updatedAt: currentISO
    };

    setRevisionServices(prev => {
      const updated = [...prev, newService];
      try {
        localStorage.setItem(`revision_services_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    try {
      fetch("/api/student/revision-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: uniqueId,
          studentUsername: currentUser.username,
          name: savedName,
          url: savedUrl,
          updatedAt: currentISO
        })
      })
      .then(async response => {
        const data = await response.json();
        if (response.ok && data.success) {
          showNotification(`Revision service "${savedName}" registered!`, "success");
          await syncApplicationData(true); // Quiet sync
        } else {
          showNotification(data.error || "Failed to register service on server.", "error");
        }
      })
      .catch(() => {
        showNotification("Network delay. Service registered locally.", "info");
      })
      .finally(() => {
        setIsRegisteringShortcut(false);
      });
    } catch (_) {
      setIsRegisteringShortcut(false);
    }
  };

  // Delete Revision service
  const handleServiceDelete = async (id: string) => {
    if (!currentUser) return;
    requestConfirm(
      "Remove Revision Service",
      "Are you sure you want to remove this service? All matching logged durations will be deleted.",
      async () => {
        // Optimistically remove locally
        setRevisionServices(prev => {
          const filtered = prev.filter(s => s.id !== id);
          try {
            localStorage.setItem(`revision_services_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        setRevisionServiceLogs(prev => {
          const filtered = prev.filter(l => l.serviceId !== id);
          try {
            localStorage.setItem(`revision_service_logs_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        try {
          const response = await fetch(`/api/student/revision-service/${id}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Revision service deleted successfully.", "success");
            await syncApplicationData(true); // Quiet sync
          } else {
            showNotification("Failed to delete service on server.", "error");
          }
        } catch (_) {
          showNotification("Network error. Removed locally.", "info");
        }
      }
    );
  };

  // Log duration on service
  const handleLogServiceDurationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!logServiceId || !logServiceDuration) {
      showNotification("Please select a service and enter a duration.", "error");
      return;
    }
    const durationMin = parseInt(logServiceDuration);
    if (isNaN(durationMin) || durationMin <= 0) {
      showNotification("Duration must be a positive number of minutes.", "error");
      return;
    }

    const service = revisionServices.find(s => s.id === logServiceId);
    if (!service) return;

    const savedDuration = logServiceDuration;
    const savedRag = logServiceRag;
    const savedServiceId = logServiceId;

    // Reset inputs instantly
    setLogServiceDuration("");
    setLogServiceRag("green");

    setIsLoggingService(true);

    // Optimistically update locally with a unique 9-digit ID and updatedAt
    const uniqueLogId = generate9DigitId();
    const uniqueSessionId = generate9DigitId();
    const currentISO = new Date().toISOString();
    const currentDate = new Date().toISOString().split("T")[0];

    const newLog: RevisionServiceLog = {
      id: uniqueLogId,
      studentUsername: currentUser.username,
      serviceId: savedServiceId,
      serviceName: service.name,
      duration: durationMin,
      date: currentDate,
      updatedAt: currentISO
    };

    const newSession: RevisionSession = {
      id: uniqueSessionId,
      studentUsername: currentUser.username,
      date: currentDate,
      duration: durationMin,
      topic: `Study on ${service.name}`,
      rag: savedRag,
      comment: `Logged automatically via external app: ${service.name} __EXTERNAL_APP__:${service.name}`,
      updatedAt: currentISO
    };

    setRevisionServiceLogs(prev => {
      const updated = [...prev, newLog];
      try {
        localStorage.setItem(`revision_service_logs_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    setRevisionSessions(prev => {
      const updated = [...prev, newSession];
      try {
        localStorage.setItem(`revision_sessions_${currentUser?.username}`, JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage write error", e);
      }
      return updated;
    });

    // Unblock immediately so user is never blocked from subsequent inputs
    setIsLoggingService(false);

    // Perform database sync in the background
    fetch("/api/student/revision-services/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: uniqueLogId,
        sessionId: uniqueSessionId,
        studentUsername: currentUser.username,
        serviceId: savedServiceId,
        serviceName: service.name,
        duration: durationMin,
        date: currentDate,
        rag: savedRag,
        updatedAt: currentISO
      })
    })
    .then(async response => {
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification(`Logged ${durationMin} mins on "${service.name}"!`, "success");
        syncApplicationData(true); // Run quiet sync in the background
      } else {
        showNotification(data.error || "Failed to log service time on server.", "error");
      }
    })
    .catch(() => {
      showNotification("Network delay. Logged locally.", "info");
    });
  };

  // Handle Score Deletion (Student side)
  const handleScoreDelete = (scoreId: string) => {
    requestConfirm(
      "Delete Score Submission",
      "Are you sure you want to delete this score? This will update your statistics.",
      async () => {
        // Optimistically delete from state & cache
        setStudentScores(prev => {
          const filtered = prev.filter(s => s.id !== scoreId);
          try {
            localStorage.setItem(`scores_${currentUser?.username}`, JSON.stringify(filtered));
          } catch (e) {
            console.error("localStorage write error", e);
          }
          return filtered;
        });

        try {
          const response = await fetch(`/api/scores/${scoreId}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Score deleted successfully.", "success");
            await syncApplicationData(true); // Quiet sync
          }
        } catch (err) {
          showNotification("Failed to delete score. Connection issue.", "error");
        }
      }
    );
  };

  const handleCreateTestTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName || !newTestMaxScore) {
      showNotification("Please provide an assessment name and maximum marks.", "error");
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
        showNotification(`Assessment "${data.test.name}" created successfully.`, "success");
        setNewTestName("");
        setNewTestMaxScore("50");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to create assessment.", "error");
      }
    } catch (err) {
      showNotification("Network connection error. Failed to create assessment.", "error");
    }
  };

  const handleDeleteTestTemplate = (id: string, name: string) => {
    requestConfirm(
      "Delete Assessment",
      `Are you sure you want to permanently delete the assessment "${name}" and all associated student scores?`,
      async () => {
        try {
          const response = await fetch(`/api/tests/${id}`, {
            method: "DELETE"
          });
          if (response.ok) {
            showNotification("Assessment and associated scores deleted.", "success");
            syncApplicationData();
          }
        } catch (e) {
          showNotification("Failed to delete assessment.", "error");
        }
      }
    );
  };

  // Delete Student (Teacher action)
  const handleDeleteStudent = (username: string, nickname: string) => {
    requestConfirm(
      "Delete Student Profile",
      `Are you sure you want to permanently delete student "${nickname}" and all of their logged scores?`,
      async () => {
        try {
          const response = await fetch("/api/teacher/delete-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            showNotification(`Student "${nickname}" deleted successfully.`, "success");
            if (selectedStudentDrilldown === username) {
              setSelectedStudentDrilldown(null);
            }
            syncApplicationData();
          } else {
            showNotification(data.error || "Failed to delete student profile.", "error");
          }
        } catch (_) {
          showNotification("Network error. Failed to delete student profile.", "error");
        }
      }
    );
  };

  // Reset Student Password (Teacher action)
  const handleResetStudentPassword = (username: string, nickname: string) => {
    requestConfirm(
      "Reset Student Password",
      `Are you sure you want to reset the password for student "${nickname}" back to the default "1234"?`,
      async () => {
        try {
          const response = await fetch("/api/teacher/reset-student-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            showNotification(`Student "${nickname}" password reset back to the default "1234" successfully.`, "success");
            syncApplicationData();
          } else {
            showNotification(data.error || "Failed to reset student password.", "error");
          }
        } catch (_) {
          showNotification("Network error. Failed to reset student password.", "error");
        }
      }
    );
  };

  const handleReassignStudentGroup = async (username: string, classGroup: string, nickname: string) => {
    try {
      const response = await fetch("/api/teacher/reassign-student-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, classGroup })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showNotification(`Successfully reassigned "${nickname}" to Group ${classGroup}.`, "success");
        syncApplicationData();
      } else {
        showNotification(data.error || "Failed to reassign student group.", "error");
      }
    } catch (_) {
      showNotification("Network error while reassigning student group.", "error");
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
  const [globalRevisionSessions, setGlobalRevisionSessions] = useState<any[]>([]);
  const [globalRevisionServiceLogs, setGlobalRevisionServiceLogs] = useState<any[]>([]);
  const [globalStudents, setGlobalStudents] = useState<any[]>([]);

  const loadGlobalScoresForArena = async () => {
    try {
      const res = await fetch(`/api/scores?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setGlobalScores(data.scores || []);
        setGlobalRevisionSessions(data.revisionSessions || []);
        setGlobalRevisionServiceLogs(data.revisionServiceLogs || []);
        setGlobalStudents(data.students || []);
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
    const activeScores = currentUser?.role === "teacher" ? (teacherData?.scores || []) : globalScores;
    const activeRevisionSessions = currentUser?.role === "teacher" ? (teacherData?.revisionSessions || []) : globalRevisionSessions;
    const activeRevisionLogs = currentUser?.role === "teacher" ? (teacherData?.revisionServiceLogs || []) : globalRevisionServiceLogs;
    const activeStudents = currentUser?.role === "teacher" ? (teacherData?.students || []) : globalStudents;

    // 1. Identify all unique students across all datasets
    const candidatesMap = new Map<string, {
      nickname: string;
      classGroup: string;
      academicYear: string;
      username: string;
    }>();

    // Populate from student metadata list
    if (Array.isArray(activeStudents)) {
      activeStudents.forEach(st => {
        if (!st || !st.nickname) return;
        candidatesMap.set(st.nickname.toLowerCase().trim(), {
          nickname: st.nickname,
          classGroup: st.classGroup || "A",
          academicYear: st.academicYear || "26-27",
          username: st.username || ""
        });
      });
    }

    // Populate from scores
    if (Array.isArray(activeScores)) {
      activeScores.forEach(s => {
        if (!s || !s.studentNickname) return;
        const key = s.studentNickname.toLowerCase().trim();
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            nickname: s.studentNickname,
            classGroup: s.classGroup || "A",
            academicYear: s.academicYear || "26-27",
            username: s.studentUsername || ""
          });
        }
      });
    }

    // Populate from revision sessions
    if (Array.isArray(activeRevisionSessions)) {
      activeRevisionSessions.forEach(s => {
        if (!s || !s.studentNickname) return;
        const key = s.studentNickname.toLowerCase().trim();
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            nickname: s.studentNickname,
            classGroup: s.classGroup || "A",
            academicYear: s.academicYear || "26-27",
            username: s.studentUsername || ""
          });
        }
      });
    }

    const candidates = Array.from(candidatesMap.values());

    // 2. Pre-calculate total time for normalization
    const timeTotalsMap = new Map<string, number>();
    let maxTotalTime = 1; // avoid division by zero

    candidates.forEach(c => {
      const sSess = (activeRevisionSessions || []).filter(item => {
        if (c.username && item.studentUsername) return item.studentUsername.toLowerCase() === c.username.toLowerCase();
        return item.studentNickname && item.studentNickname.toLowerCase().trim() === c.nickname.toLowerCase().trim();
      });
      const sLogs = (activeRevisionLogs || []).filter(item => {
        if (c.username && item.studentUsername) return item.studentUsername.toLowerCase() === c.username.toLowerCase();
        return item.studentNickname && item.studentNickname.toLowerCase().trim() === c.nickname.toLowerCase().trim();
      });
      const tMins = sSess.reduce((sum, s) => sum + s.duration, 0) + sLogs.reduce((sum, l) => sum + l.duration, 0);
      timeTotalsMap.set(c.nickname.toLowerCase().trim(), tMins);
      if (tMins > maxTotalTime) {
        maxTotalTime = tMins;
      }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 3. Compute metrics for all candidates
    let list = candidates.map(c => {
      const key = c.nickname.toLowerCase().trim();
      const studScores = (activeScores || []).filter(s => s.studentNickname && s.studentNickname.toLowerCase().trim() === key);
      const scoreAverage = studScores.length > 0
        ? parseFloat((studScores.reduce((sum, s) => sum + s.percentage, 0) / studScores.length).toFixed(2))
        : 0;

      const sSess = (activeRevisionSessions || []).filter(item => {
        if (c.username && item.studentUsername) return item.studentUsername.toLowerCase() === c.username.toLowerCase();
        return item.studentNickname && item.studentNickname.toLowerCase().trim() === key;
      });
      const sLogs = (activeRevisionLogs || []).filter(item => {
        if (c.username && item.studentUsername) return item.studentUsername.toLowerCase() === c.username.toLowerCase();
        return item.studentNickname && item.studentNickname.toLowerCase().trim() === key;
      });

      const totalTimeMins = timeTotalsMap.get(key) || 0;

      // Compute weekly revision time for student
      const studWeeklySessionsMins = sSess
        .filter(s => s.date && new Date(s.date) >= sevenDaysAgo)
        .reduce((sum, s) => sum + s.duration, 0);
      const studWeeklyLogsMins = sLogs
        .filter(l => l.date && new Date(l.date) >= sevenDaysAgo)
        .reduce((sum, l) => sum + l.duration, 0);
      const weeklyMins = studWeeklySessionsMins + studWeeklyLogsMins;

      // Normalize total revision time on a 0 to 100 scale
      const timeScore = (totalTimeMins / maxTotalTime) * 100;

      // Weighted total of 50% for total time and 50% for score average
      const aggregateScore = parseFloat((0.5 * scoreAverage + 0.5 * timeScore).toFixed(2));

      return {
        nickname: c.nickname,
        classGroup: c.classGroup,
        academicYear: c.academicYear,
        averagePercentage: scoreAverage,
        testsCount: studScores.length,
        totalTimeMins,
        weeklyMins,
        aggregateScore
      };
    });

    // 4. Apply group filtering if not "ALL"
    if (arenaGroupFilter !== "ALL") {
      list = list.filter(student => student.classGroup.toUpperCase() === arenaGroupFilter.toUpperCase());
    }

    // 5. Sort list based on active tab
    if (arenaRankTab === "assessments") {
      list.sort((a, b) => b.averagePercentage - a.averagePercentage);
    } else if (arenaRankTab === "revision") {
      list.sort((a, b) => b.totalTimeMins - a.totalTimeMins);
    } else {
      // "aggregate"
      list.sort((a, b) => b.aggregateScore - a.aggregateScore);
    }

    return list;
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

  // 4. Single assessment focus calculations
  const selectedChartTest = (teacherData?.tests || []).find(t => t.id === selectedChartTestId);
  const selectedChartTestName = selectedChartTest ? selectedChartTest.name : "Selected Assessment";

  // Single test whole group performance
  const singleTestWholeGroupData = (teacherData?.students || []).map(student => {
    const scoreNode = (teacherData?.scores || []).find(s => s.testId === selectedChartTestId && s.studentUsername === student.username);
    return {
      name: student.nickname || student.username,
      "Score %": scoreNode ? scoreNode.percentage : 0,
    };
  }).sort((a, b) => b["Score %"] - a["Score %"]);

  // Single test compare groups
  const singleTestGroupsData = ["A", "B", "C", "D", "E"].map(g => {
    const groupScores = (teacherData?.scores || []).filter(s => s.testId === selectedChartTestId && s.classGroup === g);
    const avg = groupScores.length > 0 
      ? parseFloat((groupScores.reduce((sum, curr) => sum + curr.percentage, 0) / groupScores.length).toFixed(1)) 
      : 0;
    return {
      groupName: `Group ${g}`,
      "Group Average %": avg,
    };
  });

  // Single test student comparison
  const singleTestStudentCompareData = (() => {
    const studentObj = (teacherData?.students || []).find(s => s.username === selectedChartStudent);
    const sGroup = studentObj?.classGroup || "A";
    const scoreNode = (teacherData?.scores || []).find(s => s.testId === selectedChartTestId && s.studentUsername === selectedChartStudent);
    const groupScores = (teacherData?.scores || []).filter(s => s.testId === selectedChartTestId && s.classGroup === sGroup);
    const groupAvg = groupScores.length > 0 
      ? parseFloat((groupScores.reduce((sum, curr) => sum + curr.percentage, 0) / groupScores.length).toFixed(1)) 
      : 0;
    const allScores = (teacherData?.scores || []).filter(s => s.testId === selectedChartTestId);
    const cohortAvg = allScores.length > 0 
      ? parseFloat((allScores.reduce((sum, curr) => sum + curr.percentage, 0) / allScores.length).toFixed(1)) 
      : 0;
    return [
      { category: studentObj ? (studentObj.nickname || studentObj.username) : "Student", "Performance %": scoreNode ? scoreNode.percentage : 0 },
      { category: `Group ${sGroup} Avg`, "Performance %": groupAvg },
      { category: "Cohort Avg", "Performance %": cohortAvg }
    ];
  })();

  // Internal state for revision display mode
  const [revisionDisplayMode, setRevisionDisplayMode] = useState<"dial" | "histogram">("dial");

  // Calculation of weekly revision time (Monday to Sunday)
  const getWeeklyMinutes = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - daysSinceMonday);
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7); // exclusive of next Monday

    const weeklySessions = revisionSessions.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= thisWeekStart && sDate < thisWeekEnd;
    });
    
    const weeklyLogs = revisionServiceLogs.filter(l => {
      const lDate = new Date(l.date);
      return lDate >= thisWeekStart && lDate < thisWeekEnd;
    });
    
    const sessMins = weeklySessions.reduce((sum, s) => sum + s.duration, 0);
    const logMins = weeklyLogs.reduce((sum, l) => sum + l.duration, 0);
    
    return sessMins + logMins;
  };

  const getLastWeekMinutes = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - daysSinceMonday);
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart); // up to this week's start (exclusive)

    const lastWeekSessions = revisionSessions.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= lastWeekStart && sDate < lastWeekEnd;
    });
    
    const lastWeekLogs = revisionServiceLogs.filter(l => {
      const lDate = new Date(l.date);
      return lDate >= lastWeekStart && lDate < lastWeekEnd;
    });
    
    const sessMins = lastWeekSessions.reduce((sum, s) => sum + s.duration, 0);
    const logMins = lastWeekLogs.reduce((sum, l) => sum + l.duration, 0);
    
    return sessMins + logMins;
  };

  const getWeeklyHistogramData = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - daysSinceMonday);
    thisWeekStart.setHours(0, 0, 0, 0);

    const histogram = [];
    for (let i = 5; i >= 0; i--) {
      const wStart = new Date(thisWeekStart);
      wStart.setDate(thisWeekStart.getDate() - i * 7);
      
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);
      
      const wSessions = revisionSessions.filter(s => {
        const d = new Date(s.date);
        return d >= wStart && d < wEnd;
      });
      const wLogs = revisionServiceLogs.filter(l => {
        const d = new Date(l.date);
        return d >= wStart && d < wEnd;
      });
      const wMins = wSessions.reduce((sum, s) => sum + s.duration, 0) + 
                    wLogs.reduce((sum, l) => sum + l.duration, 0);
      
      let label = "";
      if (i === 0) label = "This Week";
      else if (i === 1) label = "Last Week";
      else label = `${i} Wks Ago`;
      
      histogram.push({
        name: label,
        minutes: wMins,
        hours: parseFloat((wMins / 60).toFixed(1))
      });
    }
    return histogram;
  };

  const weeklyMinutes = getWeeklyMinutes();
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  // RAG Dial calculation: <= 30 mins (red), 30 mins to 5h (amber), >= 5h (green)
  let weeklyRag: "red" | "amber" | "green" = "red";
  if (weeklyMinutes >= 300) {
    weeklyRag = "green";
  } else if (weeklyMinutes > 30) {
    weeklyRag = "amber";
  }

  // Internal state for sub-tabs on revision panel
  const [revSubTab, setRevSubTab] = useState<"log-sessions" | "exam-attempts">("log-sessions");

  const loggedTestIds = useMemo(() => new Set(studentScores.map(sc => sc.testId)), [studentScores]);
  const availableTests = useMemo(() => tests.filter(t => !loggedTestIds.has(t.id)), [tests, loggedTestIds]);

  // Effect to sync and update selectedTestId based on remaining unlogged assessments
  useEffect(() => {
    if (currentUser?.role === "student") {
      if (availableTests.length > 0) {
        if (!selectedTestId || !availableTests.some(t => t.id === selectedTestId)) {
          setSelectedTestId(availableTests[0].id);
        }
      } else {
        if (selectedTestId !== "") {
          setSelectedTestId("");
        }
      }
    }
  }, [availableTests, selectedTestId, currentUser]);

  const getFilteredAndSortedStudentScores = () => {
    let filtered = [...studentScores];
    const query = assessmentSearch.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(score => {
        const formattedDate = new Date(score.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toLowerCase();
        return (
          score.testName.toLowerCase().includes(query) ||
          score.grade.toLowerCase().includes(query) ||
          score.score.toString().includes(query) ||
          score.percentage.toString().includes(query) ||
          formattedDate.includes(query)
        );
      });
    }

    filtered.sort((a, b) => {
      if (assessmentSortOrder === "date-desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (assessmentSortOrder === "date-asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (assessmentSortOrder === "grade-desc") {
        return b.percentage - a.percentage;
      } else if (assessmentSortOrder === "grade-asc") {
        return a.percentage - b.percentage;
      }
      return 0;
    });

    return filtered;
  };

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-200 flex flex-col font-sans transition-all selection:bg-purple-600/30 selection:text-purple-300">
      
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
        studentTab={studentTab}
        setStudentTab={setStudentTab}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* LANDING / REGISTRATION ENTRANCE */}
        {currentPage === "landing" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6 sm:py-12">
            
            {/* Visual Branding Section */}
            <div className="col-span-1 lg:col-span-7 flex flex-col justify-center space-y-6">
              
              <div className="bg-neutral-950/60 rounded-3xl p-6 sm:p-8 border border-purple-950/60 shadow-2xl relative overflow-hidden flex flex-col min-h-[300px] justify-between">
                
                {/* Background Grid & SVG Line Graph - Absolutely Positioned */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                  {/* Background Grid */}
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-20">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="border-r border-b border-purple-950/10"></div>
                    ))}
                  </div>
                  
                  {/* SVG Line Graph */}
                  <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="purpleGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="#818cf8" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="emeraldGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="#34d399" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="roseGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="#fb7185" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    {/* Trajectory lines */}
                    <path
                      d="M 10 130 Q 120 40, 250 110 T 490 20"
                      fill="none"
                      stroke="url(#purpleGlow)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="opacity-90 animate-pulse"
                    />
                    <path
                      d="M 10 100 Q 140 140, 240 60 T 490 45"
                      fill="none"
                      stroke="url(#emeraldGlow)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="opacity-80"
                    />
                    <path
                      d="M 10 145 Q 100 80, 260 145 T 490 95"
                      fill="none"
                      stroke="url(#roseGlow)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="opacity-70"
                    />

                    {/* Small glowing coordinates */}
                    <circle cx="250" cy="110" r="4.5" fill="#818cf8" />
                    <circle cx="240" cy="60" r="4.5" fill="#34d399" />
                    <circle cx="490" cy="20" r="5.5" fill="#c084fc" />

                    {/* Animated dots moving along the lines */}
                    <g>
                      <animateMotion
                        path="M 10 130 Q 120 40, 250 110 T 490 20"
                        dur="7s"
                        repeatCount="indefinite"
                      />
                      <circle r="8" fill="#a855f7" opacity="0.35" />
                      <circle r="4" fill="#a855f7" />
                    </g>
                    <g>
                      <animateMotion
                        path="M 10 100 Q 140 140, 240 60 T 490 45"
                        dur="9s"
                        repeatCount="indefinite"
                      />
                      <circle r="7" fill="#10b981" opacity="0.35" />
                      <circle r="3.5" fill="#10b981" />
                    </g>
                    <g>
                      <animateMotion
                        path="M 10 145 Q 100 80, 260 145 T 490 95"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                      <circle r="6" fill="#f43f5e" opacity="0.35" />
                      <circle r="3" fill="#f43f5e" />
                    </g>
                  </svg>
                </div>

                {/* Relative Content Container */}
                <div className="relative z-10 space-y-6 flex-1 flex flex-col justify-between">
                  {/* Title and subtitle */}
                  <div className="text-center lg:text-left">
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                      Black Panther Tracker
                    </h1>
                    <p className="text-[10px] sm:text-xs text-neutral-400 font-mono tracking-wider mt-1.5 uppercase">
                      Interactive Academic Performance Tracker
                    </p>
                  </div>

                  {/* Grades abcde... list inside frame */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 text-center">
                      {gradeBoundaries.map((g) => (
                        <div
                          key={g.name}
                          className="p-3 rounded-2xl border border-neutral-900 bg-neutral-950/90 flex flex-col items-center justify-center min-h-[50px] shadow-lg backdrop-blur-sm"
                        >
                          <span className={`text-xl font-black ${g.color.split(" ")[0]}`}>{g.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>

            {/* Floating Form Box */}
            <div className="col-span-1 lg:col-span-5 max-w-md mx-auto w-full h-full lg:max-w-none">
              <div className="backdrop-blur-md rounded-3xl p-8 border shadow-2xl transition-all duration-300 flex flex-col justify-between h-full min-h-[380px] bg-neutral-950/75 border-purple-950/80 shadow-purple-900/10">
                
                {/* LOGIN FORM */}
                <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="text-center pb-2 flex items-center justify-center space-x-2.5">
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 overflow-hidden border border-purple-950/80">
                        <img
                          src={pantherLogo}
                          alt="Black Panther"
                          className="h-full w-full object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -inset-0.5 rounded-lg bg-purple-500/20 blur opacity-25 animate-pulse"></span>
                      </div>
                      <h2 className="text-lg font-bold text-white tracking-tight">Access Control</h2>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">
                        Username / Email Address
                      </label>
                      <input
                        id="login-username"
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. agent_alias"
                        className="w-full bg-[#030304] border rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none transition border-purple-950/80 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">
                        Access Password / PIN / Secret
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#030304] border rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none transition border-purple-950/80 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 mt-4 rounded-xl font-bold text-sm text-white transition shadow-lg font-display tracking-wide uppercase active:scale-[0.98] bg-purple-700 hover:bg-purple-650 shadow-purple-650/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                        <span>Verifying Access...</span>
                      </>
                    ) : (
                      <span>Log in</span>
                    )}
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

            {/* Cloud Database Sync Status bar */}
            <div className="bg-neutral-950/80 border border-purple-950/80 rounded-2xl px-5 py-3.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="relative flex items-center justify-center h-5 w-5">
                  {backgroundSyncStatus === "syncing" ? (
                    <>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500/30 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500"></span>
                    </>
                  ) : backgroundSyncStatus === "error" ? (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                  ) : (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-neutral-200">
                      {backgroundSyncStatus === "syncing" && "Syncing with Cloud Database..."}
                      {backgroundSyncStatus === "synced" && "Cloud Database Synchronized"}
                      {backgroundSyncStatus === "error" && "Sync delayed (offline-safe mode active)"}
                    </span>
                    {backgroundSyncStatus === "syncing" && (
                      <span className="text-[10px] text-purple-400 font-mono font-bold">({syncProgress}%)</span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 leading-none mt-1">
                    {backgroundSyncStatus === "syncing" && "Your inputs are saved locally and are currently uploading behind-the-scenes."}
                    {backgroundSyncStatus === "synced" && "Your local revision records, grades, and attempts are perfectly synced with Cloud Storage."}
                    {backgroundSyncStatus === "error" && "A network error occurred. All entries are preserved locally in offline storage and will sync upon next retry."}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto">
                {backgroundSyncStatus === "syncing" ? (
                  <div className="w-24 bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-purple-950/40">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                ) : backgroundSyncStatus === "error" ? (
                  <button
                    type="button"
                    onClick={() => syncApplicationData(true)}
                    className="px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-900/60 text-amber-300 hover:text-white rounded-lg text-[10px] font-bold tracking-wider uppercase transition active:scale-95 cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Retry Sync</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider bg-emerald-950/30 border border-emerald-900/30 px-2.5 py-1 rounded-md">Cloud Secure</span>
                )}
              </div>
            </div>

            {studentTab === "my-progress" && (
              <div className="space-y-8 animate-fade-in">

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

                  {availableTests.length > 0 ? (
                    <form onSubmit={handleScoreSubmission} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold">Assessment template</label>
                        <select
                          id="submit-test-id"
                          value={selectedTestId}
                          onChange={(e) => setSelectedTestId(e.target.value)}
                          className="w-full bg-[#030304] border border-purple-950/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                        >
                          {availableTests.map(t => (
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
                            max={availableTests.find(x => x.id === selectedTestId)?.maxScore}
                            placeholder={availableTests.find(x => x.id === selectedTestId) ? `...... / ${availableTests.find(x => x.id === selectedTestId)?.maxScore} (out of max score)` : "...... / (out of max score)"}
                            value={studentScoreRaw}
                            onChange={(e) => setStudentScoreRaw(e.target.value)}
                            className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                          />
                        </div>
                        {selectedTestId && studentScoreRaw && (
                          <div className="mt-2 text-[10px] bg-purple-950/30 rounded px-2.5 py-1.5 border border-purple-900/40 font-mono text-purple-300">
                             Calculation:{" "}
                            {(parseFloat(studentScoreRaw) / (availableTests.find(x => x.id === selectedTestId)?.maxScore || 1) * 100).toFixed(1)}%{" "}
                             -{" "}
                            <span className="font-bold">
                              Grade {determineGrade(parseFloat(((parseFloat(studentScoreRaw) / (availableTests.find(x => x.id === selectedTestId)?.maxScore || 1)) * 100).toFixed(2)))}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        id="score-submit-btn"
                        type="submit"
                        disabled={isSavingScore}
                        className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition-all duration-150 hover:scale-[1.015] active:scale-[1.03] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isSavingScore ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                            <span>Filing Entry...</span>
                          </>
                        ) : (
                          <span>File Score Record</span>
                        )}
                      </button>
                    </form>
                  ) : tests.length > 0 ? (
                    <div className="text-center p-6 bg-[#030304] rounded-2xl border border-purple-950 text-neutral-400 text-xs">
                      <div className="text-2xl mb-2">🎉</div>
                      <p className="font-semibold text-white mb-1">Excellent Work!</p>
                      <p className="text-neutral-500 text-[11px] leading-relaxed">
                        All available assessments have been logged with a score. If you need to log again, retract an entry from the history ledger below.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-[#030304] rounded-2xl border border-purple-950 text-neutral-500 text-xs">
                      No assessment templates are loaded by the teacher yet. Reach out to the teacher console to establish assessment topics.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Assessment logs Table */}
            <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-950/35 pb-4">
                <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Logged Assessments History</span>
                </h3>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  {/* Sort Order Selector */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400 shrink-0">Order:</span>
                    <select
                      value={assessmentSortOrder}
                      onChange={(e) => setAssessmentSortOrder(e.target.value as any)}
                      className="bg-[#030304] border border-purple-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-purple-600 focus:outline-none cursor-pointer"
                    >
                      <option value="date-desc">📅 Date: Newest first</option>
                      <option value="date-asc">📅 Date: Oldest first</option>
                      <option value="grade-desc">🏆 Grade: Highest first</option>
                      <option value="grade-asc">📈 Grade: Lowest first</option>
                    </select>
                  </div>

                  {/* Keyword Filter Input */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search assessments..."
                      value={assessmentSearch}
                      onChange={(e) => setAssessmentSearch(e.target.value)}
                      className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {studentScores.length > 0 ? (
                (() => {
                  const sortedAndFiltered = getFilteredAndSortedStudentScores();
                  if (sortedAndFiltered.length === 0) {
                    return (
                      <div className="text-center p-8 text-neutral-500 text-xs font-mono">
                        No matches found for "{assessmentSearch}". Try adjusting your keywords.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-2">
                      <table className="w-full text-left text-xs min-w-[600px] relative">
                        <thead className="text-[10px] text-purple-400/80 uppercase tracking-widest border-b border-purple-950/50 sticky top-0 bg-[#0e0a16] z-10">
                          <tr>
                            <th className="py-3 px-4 bg-[#0e0a16]">Assess Date</th>
                            <th className="py-3 px-4 bg-[#0e0a16]">Assessment Name</th>
                            <th className="py-3 px-4 font-mono bg-[#0e0a16]">My Secure Marks</th>
                            <th className="py-3 px-4 font-mono text-center bg-[#0e0a16]">Percentage</th>
                            <th className="py-3 px-4 text-center bg-[#0e0a16]">Grade Boundary</th>
                            <th className="py-3 px-4 text-right bg-[#0e0a16]">Retract</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/30">
                          {sortedAndFiltered.map(score => {
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
                                    className="text-neutral-500 hover:text-red-400 transition ml-auto inline-block active:scale-95 cursor-pointer"
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
                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-8 text-neutral-600">
                  No assessments submitted in this academic session.
                </div>
              )}
            </div>
            </div>
            )}

            {studentTab === "revision-progress" && (
              <div className="space-y-8 animate-fade-in">
                {/* REVISION PROGRESS SECTION */}
                <div className="grid lg:grid-cols-12 gap-8">
                  {/* Left Column: Gauge Dial and External Services */}
                  <div className="lg:col-span-5 space-y-8">
                    {/* Gauge Dial / Histogram Card */}
                    {(() => {
                      const eyeColor = weeklyMinutes >= 300 
                        ? "#10b981" // glowing emerald green
                        : weeklyMinutes > 30 
                        ? "#f59e0b" // glowing golden yellow
                        : "#ef4444"; // glowing crimson red

                      const getEncouragingMessage = (mins: number) => {
                        const percent = Math.min(Math.round((mins / 300) * 100), 100);
                        if (percent >= 100) return "🏆 Goal Achieved! 5+ hours of legendary revision. You are a true champion!";
                        if (percent >= 95) return "🎯 Just a few more minutes to go! You're on the absolute edge of victory!";
                        if (percent >= 90) return "🔥 90%! Absolutely magnificent effort. Finish strong!";
                        if (percent >= 85) return "🌟 So close to the Green Zone! Give it that final push!";
                        if (percent >= 80) return "👑 4 Hours logged! Just one more hour to peak performance!";
                        if (percent >= 75) return "💎 Three quarters done! You are truly dedicated.";
                        if (percent >= 70) return "💫 70% completed! The Green Zone is within your sight now.";
                        if (percent >= 65) return "📈 Consistency is key. You are making incredible progress!";
                        if (percent >= 60) return "⚡ 3 Hours of revision logged! Your momentum is real.";
                        if (percent >= 55) return "🐾 Step by step, paw by paw, you are getting closer!";
                        if (percent >= 50) return "🌓 Halfway there! 2.5 hours of pure focus. Stellar job.";
                        if (percent >= 45) return "🔥 Almost halfway to your weekly revision goal! You've got this.";
                        if (percent >= 40) return "🎯 2 Hours achieved! Halfway mark is just around the corner.";
                        if (percent >= 35) return "🚀 Keep climbing those steps! Small actions compound.";
                        if (percent >= 30) return "🐱 The panther is watching your progress. You're doing great!";
                        if (percent >= 25) return "🌟 A quarter of the way! Your effort is paying off.";
                        if (percent >= 20) return "⚡ 1 Hour down! Look at you go. Keep pushing!";
                        if (percent >= 15) return "🐾 Revise a little more — you're building a solid routine!";
                        if (percent >= 10) return "💪 Nice work getting started! Every single minute counts.";
                        if (percent >= 5) return "✨ A small step is still progress. Keep going!";
                        return "🐾 Off to a fresh start! Every journey begins with a single step.";
                      };

                      const thisWeekHours = (weeklyMinutes / 60).toFixed(1);
                      const lastWeekMins = getLastWeekMinutes();
                      const lastWeekHours = (lastWeekMins / 60).toFixed(1);
                      const histogramData = getWeeklyHistogramData();

                      return (
                        <div className="bg-black border border-purple-950/60 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
                          <h3 className="text-sm font-semibold text-neutral-400 flex items-center justify-between border-b border-purple-950/40 pb-3 mb-4 relative z-10">
                            <div className="flex items-center space-x-2">
                              <Gauge className="w-4 h-4 text-purple-400 animate-pulse" />
                              <span>Weekly Revision Tracker</span>
                            </div>
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                              Mon - Sun
                            </span>
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
                            {/* Left Side: Dial or Histogram Visual */}
                            <div className="md:col-span-7 flex items-center justify-center w-full">
                              {revisionDisplayMode === "dial" ? (
                                <div className="relative flex flex-col items-center justify-center h-60 w-60 mx-auto">
                                  <svg className="w-full h-full relative z-10" viewBox="0 0 120 115">
                                    {/* Defs for eye glow filter */}
                                    <defs>
                                      <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feMerge>
                                          <feMergeNode in="blur" />
                                          <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                      </filter>
                                    </defs>

                                    {/* Panther Ears */}
                                    <g className="transition-all duration-500 ease-in-out">
                                      {/* Left Ear */}
                                      <path
                                        d="M 15,32 L 8,5 L 38,22 Z"
                                        fill="#121212"
                                        stroke="#2e2e2e"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M 18,29 L 12,9 L 34,22 Z"
                                        fill="#fda4af"
                                        opacity="0.25"
                                        stroke="#fda4af"
                                        strokeWidth="0.5"
                                        strokeLinejoin="round"
                                      />

                                      {/* Right Ear */}
                                      <path
                                        d="M 105,32 L 112,5 L 82,22 Z"
                                        fill="#121212"
                                        stroke="#2e2e2e"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M 102,29 L 108,9 L 86,22 Z"
                                        fill="#fda4af"
                                        opacity="0.25"
                                        stroke="#fda4af"
                                        strokeWidth="0.5"
                                        strokeLinejoin="round"
                                      />
                                    </g>

                                    {/* Glowing Panther Eyes in Background */}
                                    <g className="transition-all duration-500 ease-in-out">
                                      {/* Left Eye Glow and Outline */}
                                      <path
                                        d="M 28,45 C 32,39 44,39 48,45 C 44,51 32,51 28,45 Z"
                                        fill={eyeColor}
                                        opacity="0.2"
                                        filter="url(#eyeGlow)"
                                      />
                                      <path
                                        d="M 28,45 C 32,39 44,39 48,45 C 44,51 32,51 28,45 Z"
                                        fill={eyeColor}
                                        filter="url(#eyeGlow)"
                                        className="transition-colors duration-500"
                                      />
                                      {/* Left pupil slit */}
                                      <path
                                        d="M 38,41 Q 39.5,45 38,49 Q 36.5,45 38,41"
                                        fill="#000000"
                                      />

                                      {/* Right Eye Glow and Outline */}
                                      <path
                                        d="M 72,45 C 76,39 88,39 92,45 C 88,51 76,51 72,45 Z"
                                        fill={eyeColor}
                                        opacity="0.2"
                                        filter="url(#eyeGlow)"
                                      />
                                      <path
                                        d="M 72,45 C 76,39 88,39 92,45 C 88,51 76,51 72,45 Z"
                                        fill={eyeColor}
                                        filter="url(#eyeGlow)"
                                        className="transition-colors duration-500"
                                      />
                                      {/* Right pupil slit */}
                                      <path
                                        d="M 82,41 Q 83.5,45 82,49 Q 80.5,45 82,41"
                                        fill="#000000"
                                      />
                                    </g>

                                    {/* Panther Nose and Mouth */}
                                    <g className="transition-all duration-500 ease-in-out">
                                      {/* Cute pink nose */}
                                      <path
                                        d="M 56,54 H 64 L 60,59 Z"
                                        fill="#fda4af"
                                        stroke="#fda4af"
                                        strokeWidth="0.5"
                                        strokeLinejoin="round"
                                      />
                                      {/* Subtle Mouth Curves */}
                                      <path
                                        d="M 60,59 L 60,61 A 3,3 0 0,0 57,64 M 60,61 A 3,3 0 0,1 63,64"
                                        fill="none"
                                        stroke="#2e2e2e"
                                        strokeWidth="1"
                                        strokeLinecap="round"
                                      />
                                    </g>

                                    {/* Panther Whiskers */}
                                    <g stroke="#333333" strokeWidth="0.75" strokeLinecap="round">
                                      {/* Left whiskers */}
                                      <line x1="50" y1="59" x2="22" y2="57" />
                                      <line x1="50" y1="61" x2="20" y2="62" />
                                      <line x1="50" y1="63" x2="23" y2="67" />
                                      
                                      {/* Right whiskers */}
                                      <line x1="70" y1="59" x2="98" y2="57" />
                                      <line x1="70" y1="61" x2="100" y2="62" />
                                      <line x1="70" y1="63" x2="97" y2="67" />
                                    </g>

                                    {/* Main background arc track (increased size by 20%) */}
                                    <path
                                      d="M 6,75 A 54,54 0 0,1 114,75"
                                      fill="none"
                                      className="stroke-neutral-900/80"
                                      strokeWidth="10"
                                      strokeLinecap="round"
                                    />
                                    
                                    {/* 3 Zones: Red (0-30), Amber (30-300), Green (300-360) with 20% increased radius (54) */}
                                    <g transform="rotate(180 60 75)">
                                      {/* Red Zone (0 to 30 mins) */}
                                      <circle
                                        cx="60"
                                        cy="75"
                                        r="54"
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="10"
                                        strokeDasharray="14.14 325.15"
                                        strokeDashoffset="0"
                                      />
                                      {/* Amber Zone (30 to 300 mins) */}
                                      <circle
                                        cx="60"
                                        cy="75"
                                        r="54"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="10"
                                        strokeDasharray="127.23 212.06"
                                        strokeDashoffset="-14.14"
                                      />
                                      {/* Green Zone (300 to 360 mins) */}
                                      <circle
                                        cx="60"
                                        cy="75"
                                        r="54"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="10"
                                        strokeDasharray="28.27 311.02"
                                        strokeDashoffset="-141.37"
                                      />
                                    </g>

                                    {/* Black Cat's Paw Pointer (Hand) with 20% scaled length */}
                                    {(() => {
                                      const p = Math.min(weeklyMinutes / 360, 1);
                                      const angle = 180 + p * 180;
                                      return (
                                        <g transform={`rotate(${angle} 60 75)`}>
                                          {/* The black arm sleeve */}
                                          <path
                                            d="M 60,70 L 95,68 Q 107,70 107,75 Q 107,80 95,82 L 60,80 Z"
                                            fill="#121212"
                                            stroke="#1f1f1f"
                                            strokeWidth="0.75"
                                          />
                                          {/* Toe backings (black) */}
                                          <circle cx="102" cy="68" r="4.2" fill="#121212" />
                                          <circle cx="107" cy="75" r="4.2" fill="#121212" />
                                          <circle cx="102" cy="82" r="4.2" fill="#121212" />
                                          
                                          {/* The main pad (black) */}
                                          <ellipse cx="92" cy="75" rx="8.5" ry="7.5" fill="#121212" />
                                          
                                          {/* Cute pink beans */}
                                          <ellipse cx="91" cy="75" rx="5.5" ry="4.5" fill="#fda4af" />
                                          <circle cx="102" cy="68" r="2.2" fill="#fda4af" />
                                          <circle cx="107" cy="75" r="2.2" fill="#fda4af" />
                                          <circle cx="102" cy="82" r="2.2" fill="#fda4af" />
                                        </g>
                                      );
                                    })()}

                                    {/* Center Hub */}
                                    <circle cx="60" cy="75" r="7" fill="#121212" className="stroke-neutral-800 stroke-2" />
                                    <circle cx="60" cy="75" r="2.5" fill="#fda4af" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="h-48 w-full flex items-center justify-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#161320" vertical={false} />
                                      <XAxis 
                                        dataKey="name" 
                                        stroke="#6b7280" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                      />
                                      <YAxis 
                                        stroke="#6b7280" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(val) => `${val}h`} 
                                      />
                                      <Tooltip 
                                        cursor={{ fill: '#1e112c', opacity: 0.2 }}
                                        contentStyle={{ 
                                          backgroundColor: '#0a0512', 
                                          borderColor: '#4c1d95', 
                                          borderRadius: '12px',
                                          fontSize: '11px',
                                          color: '#fff'
                                        }} 
                                        formatter={(value: any) => [`${value} hours`, 'Revision']}
                                      />
                                      <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                                        {histogramData.map((entry, index) => {
                                          const h = entry.hours;
                                          const color = h >= 5.0 ? '#10b981' : h > 0.5 ? '#f59e0b' : '#ef4444';
                                          return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Right Side: This Week, Last Week & Display Switcher Controls */}
                            <div className="md:col-span-5 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                                {/* This Week */}
                                <div className="bg-neutral-900/40 border border-purple-950/60 rounded-2xl p-3 text-left">
                                  <p className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">This Week</p>
                                  <p className="text-2xl font-black text-white font-mono mt-1">{thisWeekHours}h</p>
                                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{weeklyMinutes} mins</p>
                                </div>

                                {/* Last Week */}
                                <div className="bg-neutral-900/40 border border-purple-950/60 rounded-2xl p-3 text-left">
                                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">Last Week</p>
                                  <p className="text-2xl font-black text-neutral-300 font-mono mt-1">{lastWeekHours}h</p>
                                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{lastWeekMins} mins</p>
                                </div>
                              </div>

                              {/* Toggle Display Button */}
                              <button
                                type="button"
                                onClick={() => setRevisionDisplayMode(revisionDisplayMode === "dial" ? "histogram" : "dial")}
                                className="w-full bg-purple-700 hover:bg-purple-650 active:scale-95 text-white py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md shadow-purple-950/40"
                              >
                                {revisionDisplayMode === "dial" ? (
                                  <>
                                    <span>📊 View Histogram</span>
                                  </>
                                ) : (
                                  <>
                                    <span>🎯 View Panther Dial</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-purple-950/40 pt-4 text-left relative z-10">
                            <p className="text-xs text-neutral-300 font-medium text-center leading-relaxed">
                              {getEncouragingMessage(weeklyMinutes)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Live Revision Timer Card */}
                    <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl text-center space-y-4">
                      <h3 className="text-sm font-semibold text-neutral-400 flex items-center justify-center space-x-2 border-b border-purple-950/40 pb-3">
                        <Clock className={`w-4 h-4 animate-pulse ${showLivenessCheck ? "text-red-500" : "text-purple-400"}`} />
                        <span>Revision Stop Watch</span>
                      </h3>
                      
                      <div className={`py-4 border rounded-2xl transition-all duration-300 ${
                        showLivenessCheck 
                          ? "bg-red-950/80 border-red-500/80 animate-pulse" 
                          : "bg-black/40 border-purple-950/40"
                      }`}>
                        <div className={`text-3xl font-black font-mono tracking-widest transition-colors duration-300 ${
                          showLivenessCheck ? "text-red-400 font-bold" : "text-purple-300"
                        }`}>
                          {formatTime(timerSeconds)}
                        </div>
                        {showLivenessCheck && (
                          <div className="text-[10px] font-mono uppercase tracking-wider mt-1 text-red-300 animate-pulse">
                            🚨 Liveness Confirmation Required
                          </div>
                        )}
                      </div>

                      {showLivenessCheck ? (
                        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-2xl text-left space-y-3 animate-in fade-in duration-200">
                          <p className="text-xs font-bold text-red-200 leading-relaxed">
                            ⏱️ You've been revising for {Math.round(timerSeconds / 60)} minutes! Are you still going?
                          </p>
                          <p className="text-[10px] text-red-300/70">
                            Confirm your study session to keep counting, or pause to take a short break.
                          </p>
                          <div className="flex gap-2.5 pt-1">
                            <button
                              onClick={() => {
                                setShowLivenessCheck(false);
                                setIsTimerRunning(true);
                                showNotification("Awesome! Timer resumed. Keep up the great work!", "success");
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-red-950/50 cursor-pointer"
                            >
                              Yes, keep going!
                            </button>
                            <button
                              onClick={() => {
                                setShowLivenessCheck(false);
                                setIsTimerRunning(false);
                                showNotification("Timer paused. Take a well-deserved break!", "info");
                              }}
                              className="bg-neutral-900 hover:bg-neutral-800 border border-purple-950 text-neutral-300 py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                            >
                              Pause & Break
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-3">
                          <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`flex items-center justify-center p-3 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
                              isTimerRunning 
                                ? "bg-amber-600 hover:bg-amber-500 text-white animate-pulse" 
                                : "bg-purple-700 hover:bg-purple-650 text-white shadow-lg shadow-purple-500/10"
                            }`}
                            title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                          >
                            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setIsTimerRunning(false);
                              setTimerSeconds(0);
                              lastLivenessCheckMarkRef.current = 0;
                              showNotification("Timer reset successfully.", "info");
                            }}
                            className="flex items-center justify-center p-3 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-purple-950 text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                            title="Reset Timer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {timerSeconds > 0 && (
                        <div className="pt-2 border-t border-purple-950/30 space-y-2 animate-in fade-in duration-200">
                          <button
                            onClick={() => {
                              setIsTimerRunning(false);
                              const mins = Math.max(1, Math.round(timerSeconds / 60));
                              setRevDuration(mins.toString());
                              setRevSubTab("log-sessions");
                              showNotification(`Loaded ${mins} minutes from study timer into Topic Revision form!`, "success");
                            }}
                            className="w-full bg-purple-950/80 hover:bg-purple-900 border border-purple-800/60 text-purple-300 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                          >
                            Load Into Revision Form
                          </button>
                          
                          {!showQuickLogForm ? (
                            <button
                              onClick={() => setShowQuickLogForm(true)}
                              className="w-full bg-purple-700 hover:bg-purple-650 text-white py-2 rounded-xl text-xs font-bold transition active:scale-95"
                            >
                              ⚡ Quick Log Right Now
                            </button>
                          ) : (
                            <form onSubmit={handleQuickTimerLog} className="space-y-2.5 p-3 bg-neutral-900/40 border border-purple-950/60 rounded-2xl text-left">
                              <div>
                                <label className="text-[9px] font-mono tracking-wider uppercase font-black text-purple-400 block mb-1">Topic Area</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Psychodynamic dream therapy"
                                  value={quickLogTopic}
                                  onChange={(e) => setQuickLogTopic(e.target.value)}
                                  className="w-full bg-[#030304] border rounded-lg px-2.5 py-1.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono tracking-wider uppercase font-black text-purple-400 block mb-1">RAG Confidence</label>
                                <select
                                  value={quickLogRag}
                                  onChange={(e) => setQuickLogRag(e.target.value as any)}
                                  className="w-full bg-[#030304] border rounded-lg px-2 py-1 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                                >
                                  <option value="green">🟢 Green (Strong)</option>
                                  <option value="amber">🟡 Amber (Improving)</option>
                                  <option value="red">🔴 Red (Needs work)</option>
                                </select>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="submit"
                                  className="flex-1 bg-purple-700 hover:bg-purple-650 text-white py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
                                >
                                  Confirm Log
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowQuickLogForm(false)}
                                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 py-1.5 px-2.5 rounded-lg text-xs transition active:scale-95"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>

                    {/* External Revision Services configuration */}
                    <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl">
                      <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2 mb-4 border-b border-purple-950/40 pb-3">
                        <ExternalLink className="w-4 h-4 text-purple-400" />
                        <span>Revision Hub Buttons</span>
                      </h3>

                      {/* Register new external service form */}
                      <form onSubmit={handleRegisterService} className="space-y-3 mb-6">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Service Name (e.g., Seneca)"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="w-full bg-[#030304] border rounded-lg px-3 py-2 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="URL (optional)"
                            value={newServiceUrl}
                            onChange={(e) => setNewServiceUrl(e.target.value)}
                            className="w-full bg-[#030304] border rounded-lg px-3 py-2 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isRegisteringShortcut}
                          className="w-full bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {isRegisteringShortcut ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-purple-400/35 border-t-purple-400 rounded-full animate-spin"></span>
                              <span>Registering Button...</span>
                            </>
                          ) : (
                            <span>+ Register New Rev Button</span>
                          )}
                        </button>
                      </form>

                      {/* Registered Services list */}
                      {revisionServices.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Your Shortcuts & Mins Logged</p>
                          <div className="grid grid-cols-1 gap-2.5">
                            {revisionServices.map(service => {
                              const totalMins = revisionServiceLogs
                                .filter(l => l.serviceId === service.id)
                                .reduce((sum, l) => sum + l.duration, 0);

                              return (
                                <div key={service.id} className="relative group bg-neutral-950 border border-purple-950/60 p-3 rounded-xl flex items-center justify-between hover:border-purple-800 transition">
                                  <div className="max-w-[150px]">
                                    <p className="font-bold text-white text-xs truncate">{service.name}</p>
                                    <p className="text-[10px] text-purple-400 font-mono mt-0.5">{totalMins} mins logged</p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1.5 z-10">
                                    {service.url && (
                                      <a
                                        href={service.url.startsWith("http") ? service.url : `https://${service.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-7 w-7 flex items-center justify-center rounded bg-purple-950/50 hover:bg-purple-900 border border-purple-900/40 text-purple-300 transition"
                                        title={`Launch ${service.name}`}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => setLogServiceId(service.id)}
                                      className="h-7 px-2 flex items-center justify-center rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[10px] transition font-semibold"
                                      title="Quick-log revision duration"
                                    >
                                      + Log Time
                                    </button>
                                    <button
                                      onClick={() => handleServiceDelete(service.id)}
                                      className="h-7 w-7 flex items-center justify-center text-neutral-600 hover:text-red-400 transition"
                                      title="Delete button configuration"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-neutral-600 italic">
                          No custom shortcut revision buttons registered yet. Add Seneca, Quizlet, etc. above!
                        </div>
                      )}

                      {/* Log time spent on selected service popover */}
                      {logServiceId && (
                        <div className="mt-5 border-t border-purple-950/40 pt-4 bg-purple-950/10 p-3 rounded-xl border border-purple-950/60">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-purple-300 font-mono uppercase">Log Revision Duration</p>
                            <button
                              onClick={() => {
                                setLogServiceId("");
                                setLogServiceDuration("");
                              }}
                              className="text-neutral-500 hover:text-neutral-300 text-xs"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <p className="text-[10px] text-neutral-400 mb-2">
                            Add study time for: <span className="font-bold text-white">{(revisionServices.find(s => s.id === logServiceId))?.name}</span>
                          </p>
                          <form onSubmit={handleLogServiceDurationSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono tracking-wider uppercase font-bold text-neutral-400">Duration (mins)</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  max="1440"
                                  placeholder="Minutes (e.g., 45)"
                                  value={logServiceDuration}
                                  onChange={(e) => setLogServiceDuration(e.target.value)}
                                  className="w-full bg-[#030304] border rounded-lg px-3 py-1.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono tracking-wider uppercase font-bold text-neutral-400">RAG Rating</label>
                                <select
                                  value={logServiceRag}
                                  onChange={(e) => setLogServiceRag(e.target.value as any)}
                                  className="w-full bg-[#030304] border rounded-lg px-3 py-1.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none cursor-pointer"
                                >
                                  <option value="green">🟢 Green (Strong)</option>
                                  <option value="amber">🟡 Amber (Improving)</option>
                                  <option value="red">🔴 Red (Needs Work)</option>
                                </select>
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={isLoggingService}
                              className="w-full bg-purple-700 hover:bg-purple-650 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoggingService ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                                  <span>Logging Session...</span>
                                </>
                              ) : (
                                <span>🚀 Log Study Session</span>
                              )}
                            </button>
                          </form>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Right Column: Revision sessions log book & Exam Question attempts */}
                  <div className="lg:col-span-7 space-y-8">
                    {/* Internal Subtabs switcher */}
                    <div className="flex bg-neutral-950/50 p-1.5 rounded-xl border border-purple-950/50 gap-2">
                      <button
                        onClick={() => setRevSubTab("log-sessions")}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                          revSubTab === "log-sessions"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/40"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        📖 Topic Revision Log
                      </button>
                      <button
                        onClick={() => setRevSubTab("exam-attempts")}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                          revSubTab === "exam-attempts"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/40"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        📝 Exam Question Log
                      </button>
                    </div>

                    {/* Log Topic Revision Session form & list */}
                    {revSubTab === "log-sessions" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Session log Form */}
                        <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl">
                          <h4 className="text-sm font-semibold text-white mb-4">Log A Topic Revision Session</h4>
                          <form onSubmit={handleRevisionSessionSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Date Revised</label>
                              <input
                                type="date"
                                required
                                value={revDate}
                                onChange={(e) => setRevDate(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Duration (Minutes)</label>
                              <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 45"
                                value={revDuration}
                                onChange={(e) => setRevDuration(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">RAG Rating</label>
                              <select
                                value={revRag}
                                onChange={(e) => setRevRag(e.target.value as any)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              >
                                <option value="green">🟢 Green (Strong / Comfortable)</option>
                                <option value="amber">🟡 Amber (Need improvement)</option>
                                <option value="red">🔴 Red (Unconfident / Struggling)</option>
                              </select>
                            </div>
                            <div className="md:col-span-12 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Topic Revised</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Psychodynamic dream therapy"
                                value={revTopic}
                                onChange={(e) => setRevTopic(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-12 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Comments / Notes</label>
                              <textarea
                                placeholder="Detail what you revised, self assessment remarks, or key takeaways..."
                                value={revComment}
                                onChange={(e) => setRevComment(e.target.value)}
                                rows={2}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                             <div className="md:col-span-12 pt-2">
                              <motion.button
                                type="submit"
                                disabled={isSavingTopicLog}
                                whileTap={{ scale: 0.95 }}
                                whileHover={isSavingTopicLog ? {} : { scale: 1.01 }}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md font-display uppercase tracking-wider flex items-center justify-center space-x-2 ${
                                  isSavingTopicLog
                                    ? "bg-purple-900/60 text-purple-400 cursor-not-allowed border border-purple-800/40"
                                    : "bg-purple-700 hover:bg-purple-650"
                                }`}
                              >
                                {isSavingTopicLog ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Logging Session...</span>
                                  </>
                                ) : (
                                  <span>Save Topic Session Log</span>
                                )}
                              </motion.button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Log Exam Question Attempt form & list */}
                    {revSubTab === "exam-attempts" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Exam question attempt log Form */}
                        <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl">
                          <h4 className="text-sm font-semibold text-white mb-4">Log Exam Question Attempt</h4>
                          <form onSubmit={handleExamAttemptSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Exam Component</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Paper 1 Section A"
                                value={examComponent}
                                onChange={(e) => setExamComponent(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Self-Assessed Marks Scored</label>
                              <input
                                type="number"
                                required
                                min="0"
                                step="0.5"
                                placeholder="e.g. 8"
                                value={examMarksScored}
                                onChange={(e) => setExamMarksScored(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Marks Available</label>
                              <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 10"
                                value={examMarksAvailable}
                                onChange={(e) => setExamMarksAvailable(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-6 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Attempt Date</label>
                              <input
                                type="date"
                                required
                                value={examDate}
                                onChange={(e) => setExamDate(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-6 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">RAG Rating Tag</label>
                              <select
                                value={examRag}
                                onChange={(e) => setExamRag(e.target.value as any)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              >
                                <option value="green">🟢 Green (Comfortable / Strong)</option>
                                <option value="amber">🟡 Amber (Need improvement)</option>
                                <option value="red">🔴 Red (Unconfident / Weak)</option>
                              </select>
                            </div>
                            <div className="md:col-span-12 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Topic Area</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Psychodynamic dream therapy"
                                value={examTopic}
                                onChange={(e) => setExamTopic(e.target.value)}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-12 space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400">Wording of the Question</label>
                              <textarea
                                required
                                placeholder="Enter the exact or paraphrased wording of the exam question..."
                                value={examWording}
                                onChange={(e) => setExamWording(e.target.value)}
                                rows={2}
                                className="w-full bg-[#030304] border rounded-xl px-4 py-2.5 text-xs text-white border-purple-950/80 focus:border-purple-600 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-12 pt-2">
                              <motion.button
                                type="submit"
                                disabled={isSavingExamAttempt}
                                whileTap={{ scale: 0.95 }}
                                whileHover={isSavingExamAttempt ? {} : { scale: 1.01 }}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md font-display uppercase tracking-wider flex items-center justify-center space-x-2 ${
                                  isSavingExamAttempt
                                    ? "bg-purple-900/60 text-purple-400 cursor-not-allowed border border-purple-800/40"
                                    : "bg-purple-700 hover:bg-purple-650"
                                }`}
                              >
                                {isSavingExamAttempt ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Saving Attempt...</span>
                                  </>
                                ) : (
                                  <span>Save Exam Question Attempt</span>
                                )}
                              </motion.button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Unified Cumulative Revision & Exam History Log */}
                    {(() => {
                      const getFirstPhrases = (text: string, count = 2) => {
                        if (!text) return "";
                        // Split by sentence-ending punctuation followed by space or end of string
                        const sentences = text.trim().split(/(?<=[.!?])\s+/);
                        if (sentences.length <= count) return text;
                        return sentences.slice(0, count).join(" ") + "...";
                      };

                      const rawLogs: Array<{
                        id: string;
                        originalId: string;
                        type: "exam" | "topic" | "external";
                        date: string;
                        title: string;
                        details: string;
                        badge: string;
                        badgeColor: string;
                        meta: string;
                        rag: string;
                        fullComponent?: string;
                        fullTopic: string;
                        fullWording?: string;
                        fullMarksScored?: number;
                        fullMarksAvailable?: number;
                        fullPercentage?: number;
                        fullSelfScore?: number;
                        fullComment?: string;
                        fullDuration?: number;
                        updatedAt?: string;
                      }> = [];

                      // Process revision sessions
                      for (const s of revisionSessions) {
                        const rating = s.rag || "green";
                        const duration = s.duration !== undefined ? s.duration : (s as any).duration;
                        const topic = s.topic || "";
                        const comment = s.comment || (s as any).comment || "";
                        const dateVal = s.date || "";

                        // Check if this is an external app log
                        if (comment.includes("__EXTERNAL_APP__:")) {
                          try {
                            const parts = comment.split("__EXTERNAL_APP__:");
                            const extAppName = parts[1] ? parts[1].trim() : "External App";
                            rawLogs.push({
                              id: `session-${s.id}`,
                              originalId: s.id,
                              type: "external" as const,
                              date: dateVal,
                              title: topic || `Study on ${extAppName}`,
                              details: `Logged automatically via external app: ${extAppName}`,
                              badge: rating.toUpperCase(),
                              badgeColor: rating === "green" 
                                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                : rating === "amber" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-red-500/10 text-red-400 border border-red-500/20",
                              meta: `${duration} mins`,
                              rag: rating,
                              fullTopic: topic,
                              fullComment: comment,
                              fullDuration: duration,
                              updatedAt: s.updatedAt
                            });
                            continue;
                          } catch (_) {
                            // Fallback
                          }
                        }

                        // Check if this is an exam question logged inside revision sessions
                        if (comment.includes("__EXAM_METADATA__:")) {
                          try {
                            const parts = comment.split("__EXAM_METADATA__:");
                            const meta = JSON.parse(parts[1]);
                            const normPercent = meta.marksAvailable > 0 ? (meta.marksScored / meta.marksAvailable) * 100 : 0;
                            
                            rawLogs.push({
                              id: `session-${s.id}`,
                              originalId: s.id,
                              type: "exam" as const,
                              date: dateVal,
                              title: `${meta.component} - ${meta.topicArea}`,
                              details: topic, // Question wording is stored in the topic field
                              badge: `Exam Score: ${meta.marksScored}/${meta.marksAvailable} (${normPercent.toFixed(0)}%)`,
                              badgeColor: rating === "green" 
                                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                : rating === "amber" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-red-500/10 text-red-400 border border-red-500/20",
                              meta: `Self-Mark: ${meta.selfMarkingScore || 0}/10`,
                              rag: rating,
                              fullComponent: meta.component,
                              fullTopic: meta.topicArea,
                              fullWording: topic,
                              fullMarksScored: meta.marksScored,
                              fullMarksAvailable: meta.marksAvailable,
                              fullPercentage: normPercent,
                              fullSelfScore: meta.selfMarkingScore || 0,
                              fullDuration: duration,
                              updatedAt: s.updatedAt
                            });
                            continue;
                          } catch (_) {
                            // Fallback
                          }
                        }

                        // Regular study topic log
                        rawLogs.push({
                          id: `session-${s.id}`,
                          originalId: s.id,
                          type: "topic" as const,
                          date: dateVal,
                          title: topic,
                          details: cleanComment(comment),
                          badge: rating.toUpperCase(),
                          badgeColor: rating === "green" 
                            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                            : rating === "amber" 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20",
                          meta: `${duration} mins`,
                          rag: rating,
                          fullTopic: topic,
                          fullComment: cleanComment(comment),
                          fullDuration: duration,
                          updatedAt: s.updatedAt
                        });
                      }

                      // Process standalone exam attempts (if any, for backwards compatibility)
                      for (const e of examAttempts) {
                        const marksScored = e.marksScored !== undefined ? e.marksScored : (e as any).marks_scored;
                        const marksAvailable = e.marksAvailable !== undefined ? e.marksAvailable : (e as any).marks_available;
                        const questionWording = e.questionWording || (e as any).question_wording || "";
                        const component = e.component || "";
                        const topic = e.topic || "";
                        const dateVal = e.date || "";
                        const selfScore = e.selfMarkingScore !== undefined ? e.selfMarkingScore : (e as any).self_marking_score;
                        const rating = e.rag || (marksAvailable > 0 && (marksScored / marksAvailable) >= 0.7 ? "green" : (marksScored / marksAvailable) >= 0.4 ? "amber" : "red");

                        const percentage = marksAvailable > 0 ? (marksScored / marksAvailable) * 100 : 0;
                        const computedDuration = Math.max(1, Math.round(marksAvailable * 1.35));

                        rawLogs.push({
                          id: `exam-${e.id}`,
                          originalId: e.id,
                          type: "exam" as const,
                          date: dateVal,
                          title: `${component} - ${topic}`,
                          details: questionWording ? `Question: ${questionWording}` : "Exam question attempt",
                          badge: `Exam Score: ${marksScored}/${marksAvailable} (${percentage.toFixed(0)}%)`,
                          badgeColor: rating === "green" 
                            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                            : rating === "amber" 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20",
                          meta: `Self-Mark: ${selfScore}/10`,
                          rag: rating,
                          fullComponent: component,
                          fullTopic: topic,
                          fullWording: questionWording,
                          fullMarksScored: marksScored,
                          fullMarksAvailable: marksAvailable,
                          fullPercentage: percentage,
                          fullSelfScore: selfScore,
                          fullDuration: computedDuration,
                          updatedAt: e.updatedAt
                        });
                      }

                      // Deduplicate logs by originalId so we never show duplicates
                      const uniqueLogsMap = new Map<string, typeof rawLogs[0]>();
                      for (const log of rawLogs) {
                        // If already added, prefer the richer session-based log format
                        if (!uniqueLogsMap.has(log.originalId)) {
                          uniqueLogsMap.set(log.originalId, log);
                        } else if (log.id.startsWith("session-")) {
                          uniqueLogsMap.set(log.originalId, log);
                        }
                      }
                      const cumulativeLogs = Array.from(uniqueLogsMap.values());
                      
                      // Sort based on logSortOrder state
                      if (logSortOrder === "latest") {
                        cumulativeLogs.sort((a, b) => {
                          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.date).getTime();
                          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.date).getTime();
                          if (timeA !== timeB) return timeB - timeA;
                          return b.date.localeCompare(a.date);
                        });
                      } else if (logSortOrder === "oldest") {
                        cumulativeLogs.sort((a, b) => {
                          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.date).getTime();
                          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.date).getTime();
                          if (timeA !== timeB) return timeA - timeB;
                          return a.date.localeCompare(b.date);
                        });
                      } else if (logSortOrder === "longest") {
                        cumulativeLogs.sort((a, b) => (b.fullDuration || 0) - (a.fullDuration || 0));
                      } else if (logSortOrder === "shortest") {
                        cumulativeLogs.sort((a, b) => (a.fullDuration || 0) - (b.fullDuration || 0));
                      }

                      const filteredCumulativeLogs = cumulativeLogs.filter(log => {
                        // 1. RAG Filter
                        if (ragFilter !== "all" && log.rag !== ragFilter) {
                          return false;
                        }

                        // 2. Keyword Filter
                        const query = cumulativeSearch.trim().toLowerCase();
                        if (!query) return true;
                        return (
                          log.title.toLowerCase().includes(query) ||
                          (log.details && log.details.toLowerCase().includes(query)) ||
                          log.date.includes(query) ||
                          log.type.toLowerCase().includes(query) ||
                          (log.rag && log.rag.toLowerCase().includes(query)) ||
                          log.badge.toLowerCase().includes(query)
                        );
                      });

                      return (
                        <div className="bg-neutral-950/70 border border-purple-950/80 rounded-3xl p-6 shadow-xl space-y-4">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-950/40 pb-4">
                            <div>
                              <h4 className="text-sm font-semibold text-white">Revision Log</h4>
                            </div>
                            
                            {/* RAG and Keyword Filters */}
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                              {/* RAG Filter Segmented Controls */}
                              <div className="flex bg-[#030304] border border-purple-950/80 rounded-xl p-1 text-[10px] font-mono">
                                <button
                                  type="button"
                                  onClick={() => setRagFilter("all")}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition uppercase ${
                                    ragFilter === "all"
                                      ? "bg-purple-950 text-purple-300"
                                      : "text-neutral-400 hover:text-white"
                                  }`}
                                >
                                  ALL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRagFilter("green")}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                                    ragFilter === "green"
                                      ? "bg-green-500/15 text-green-400 border border-green-500/20 font-black"
                                      : "text-neutral-400 hover:text-green-450"
                                  }`}
                                >
                                  <span>🟢</span> <span>GREEN</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRagFilter("amber")}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                                    ragFilter === "amber"
                                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 font-black"
                                      : "text-neutral-400 hover:text-amber-450"
                                  }`}
                                >
                                  <span>🟡</span> <span>AMBER</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRagFilter("red")}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                                    ragFilter === "red"
                                      ? "bg-red-500/15 text-red-400 border border-red-500/20 font-black"
                                      : "text-neutral-400 hover:text-red-450"
                                  }`}
                                >
                                  <span>🔴</span> <span>RED</span>
                                </button>
                              </div>

                              {/* Sort Order Selector */}
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-purple-400 shrink-0">Order:</span>
                                <select
                                  value={logSortOrder}
                                  onChange={(e) => setLogSortOrder(e.target.value as any)}
                                  className="bg-[#030304] border border-purple-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-purple-600 focus:outline-none cursor-pointer"
                                >
                                  <option value="latest">📅 Latest first</option>
                                  <option value="oldest">📅 Oldest first</option>
                                  <option value="longest">⏱️ Longest session</option>
                                  <option value="shortest">⏱️ Shortest session</option>
                                </select>
                              </div>

                              {/* Keyword Filter Input */}
                              <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                                <input
                                  type="text"
                                  placeholder="Search logs..."
                                  value={cumulativeSearch}
                                  onChange={(e) => setCumulativeSearch(e.target.value)}
                                  className="w-full bg-[#030304] border border-purple-950/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-purple-600 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {filteredCumulativeLogs.length > 0 ? (
                            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                              {filteredCumulativeLogs.map((log) => {
                                const isSelected = selectedLogId === log.id;
                                return (
                                  <div
                                    key={log.id}
                                    className={`bg-neutral-950 border rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                      isSelected
                                        ? "border-purple-600/80 bg-purple-950/5 shadow-purple-950/20 shadow-md"
                                        : "border-purple-950/40 hover:bg-purple-950/10 hover:border-purple-900/60"
                                    }`}
                                    onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                                  >
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 w-full">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                          {log.type === "exam" ? (
                                            <>
                                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-blue-950 text-blue-400 border border-blue-900">
                                                📝 Exam Question
                                              </span>
                                              <span className="text-neutral-700">•</span>
                                            </>
                                          ) : log.type === "external" ? (
                                            <>
                                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-900">
                                                🌐 External Revision App
                                              </span>
                                              <span className="text-neutral-700">•</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-purple-950 text-purple-400 border border-purple-900">
                                                📖 Revision
                                              </span>
                                              <span className="text-neutral-700">•</span>
                                            </>
                                          )}
                                          <span className="text-xs font-semibold text-white">{log.title}</span>
                                        </div>
                                        
                                        {log.details && (
                                          <p className="text-xs text-neutral-300 italic leading-relaxed">
                                            "{isSelected ? log.details : getFirstPhrases(log.details)}"
                                          </p>
                                        )}

                                        <div className="flex items-center space-x-3 text-[10px] text-neutral-500 font-mono pt-1">
                                          <span>
                                            Date: {log.date}
                                            {(() => {
                                              if (log.updatedAt) {
                                                try {
                                                  const d = new Date(log.updatedAt);
                                                  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                  return ` @ ${timeStr}`;
                                                } catch (_) {}
                                              }
                                              return "";
                                            })()}
                                          </span>
                                          {log.type === "topic" || log.type === "external" ? (
                                            <>
                                              <span>•</span>
                                              <span>Duration: {log.meta}</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>•</span>
                                              <span>{log.meta}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-3 self-end sm:self-auto pt-2 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md ${log.badgeColor}`}>
                                          {log.badge}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (log.type === "topic") {
                                              handleRevisionSessionDelete(log.originalId);
                                            } else {
                                              handleExamAttemptDelete(log.originalId);
                                            }
                                          }}
                                          className="text-neutral-500 hover:text-red-400 transition p-1.5 rounded-md"
                                          title={`Delete ${log.type === "topic" ? "revision session" : "exam attempt"}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLogId(isSelected ? null : log.id);
                                          }}
                                          className="text-neutral-400 hover:text-white transition p-1"
                                          title={isSelected ? "Collapse" : "Expand details"}
                                        >
                                          {isSelected ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expanded Panel */}
                                    {isSelected && (
                                      <div className="mt-4 pt-4 border-t border-purple-950/40 space-y-4 animate-fade-in text-xs text-neutral-300">
                                        {log.type === "topic" ? (
                                          <>
                                            <div className="bg-[#030304] border border-purple-900/30 p-3 rounded-xl space-y-2">
                                              <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                                <span>📖 Full Session Commentary</span>
                                              </div>
                                              <p className="whitespace-pre-wrap leading-relaxed text-neutral-200 font-sans">
                                                {log.fullComment || "No comments written for this study session."}
                                              </p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[10px] text-neutral-400 bg-[#030304]/40 p-3 rounded-xl border border-purple-950/20">
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Category</span>
                                                <span className="text-purple-300">📖 Study Topic</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Duration</span>
                                                <span className="text-white font-bold">{log.fullDuration} minutes</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Logged Date</span>
                                                <span className="text-white">{log.date}</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">RAG Rating</span>
                                                <span className={`font-black uppercase flex items-center gap-1 ${
                                                  log.rag === "green" ? "text-green-400" : log.rag === "amber" ? "text-amber-400" : "text-red-400"
                                                }`}>
                                                  <span>{log.rag === "green" ? "🟢" : log.rag === "amber" ? "🟡" : "🔴"}</span>
                                                  <span>{log.rag}</span>
                                                </span>
                                              </div>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="bg-[#030304] border border-purple-900/30 p-3 rounded-xl space-y-2">
                                              <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                                <span>📝 Exam Question Wording</span>
                                              </div>
                                              <p className="whitespace-pre-wrap leading-relaxed text-neutral-200 font-sans italic">
                                                "{log.fullWording || "No question wording logged."}"
                                              </p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-[10px] text-neutral-400 bg-[#030304]/40 p-3 rounded-xl border border-purple-950/20">
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Exam Component</span>
                                                <span className="text-white">{log.fullComponent}</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Topic Area</span>
                                                <span className="text-white">{log.fullTopic}</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Date Logged</span>
                                                <span className="text-white">{log.date}</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Marks Scored</span>
                                                <span className="text-purple-350 font-bold">{log.fullMarksScored} / {log.fullMarksAvailable} ({log.fullPercentage?.toFixed(1)}%)</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Self-Marking Grade</span>
                                                <span className="text-amber-400 font-bold">{log.fullSelfScore} / 10</span>
                                              </div>
                                              <div>
                                                <span className="block text-neutral-500 uppercase tracking-wider font-bold">Performance RAG</span>
                                                <span className={`font-black uppercase flex items-center gap-1 ${
                                                  log.rag === "green" ? "text-green-400" : log.rag === "amber" ? "text-amber-400" : "text-red-400"
                                                }`}>
                                                  <span>{log.rag === "green" ? "🟢" : log.rag === "amber" ? "🟡" : "🔴"}</span>
                                                  <span>{log.rag?.toUpperCase()}</span>
                                                </span>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-xs text-neutral-600 italic">
                              {cumulativeSearch || ragFilter !== "all" ? "No entries match your filters." : "Your cumulative revision history is empty. Log a topic session or exam question above!"}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TEACHER DASHBOARD COMMAND CENTER */}
        {currentPage === "teacher-dashboard" && currentUser && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Greetings Bar */}
            <div className="pb-6 border-b border-purple-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">Authorized Supervisor Session</span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Black Panther Command <span className="text-amber-500">Center</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Real-time class groupings analytics, assessments releases, and individual grade sheets management.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => syncApplicationData(false)}
                  disabled={isRefreshing}
                  className="px-4 py-2 bg-purple-950/40 hover:bg-purple-900 border border-purple-900/60 text-purple-350 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>{isRefreshing ? "Syncing..." : "Sync & Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Tab switch between Assessments and Revision Progress */}
            <div className="flex flex-wrap border-b border-purple-950/60 gap-2">
              <button
                onClick={() => setTeacherViewTab("assessments")}
                className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  teacherViewTab === "assessments"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                📊 Assessments Dashboard
              </button>
              <button
                onClick={() => setTeacherViewTab("revision-progress")}
                className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  teacherViewTab === "revision-progress"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                📖 Revision Tracker Dashboard
              </button>
            </div>

            {teacherViewTab === "assessments" && (
              <div className="space-y-8 animate-fade-in">

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

              {/* Chart Dimension Sub-controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#030304]/40 border border-purple-950/45 p-4 rounded-2xl">
                <div className="flex flex-col space-y-1">
                  <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Chart Dimension Mode</span>
                  <div className="flex bg-[#010102] border border-purple-950/75 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setChartDisplayMode("chronological")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                        chartDisplayMode === "chronological"
                          ? "bg-purple-950 text-purple-300 border border-purple-900"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      Chronological Course Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartDisplayMode("single_test")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                        chartDisplayMode === "single_test"
                          ? "bg-purple-950 text-purple-300 border border-purple-900"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      Single Assessment Focus
                    </button>
                  </div>
                </div>

                {chartDisplayMode === "single_test" && (
                  <div className="flex flex-col space-y-1 min-w-[220px] animate-fade-in">
                    <label className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Select Focus Assessment</label>
                    <select
                      id="chart-assessment-select"
                      value={selectedChartTestId}
                      onChange={(e) => setSelectedChartTestId(e.target.value)}
                      className="bg-[#030304] border border-purple-950/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-600 transition"
                    >
                      {(teacherData?.tests || []).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Dynamic Sub-control for Individual Student Tab */}
              {teacherChartTab === "student" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#030304]/60 border border-purple-950/30 p-4 rounded-2xl animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Tracking target</span>
                    <h4 className="text-xs font-semibold text-white">Focus Student Trace: {currentMetricStudentNickname}</h4>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 italic">
                    (Select any student from the class roster below to plot their trace)
                  </div>
                </div>
              )}

              {/* Chart Stage */}
              <div className="w-full">
                {chartDisplayMode === "chronological" ? (
                  ((teacherChartTab === "whole" && wholeGroupLineData.length > 0) ||
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
                  )
                ) : (
                  /* Single Assessment Focus Mode */
                  ((teacherChartTab === "whole" && singleTestWholeGroupData.length > 0) ||
                    (teacherChartTab === "groups" && singleTestGroupsData.length > 0) ||
                    (teacherChartTab === "student" && singleTestStudentCompareData.length > 0)) ? (
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={
                            teacherChartTab === "whole"
                              ? singleTestWholeGroupData
                              : teacherChartTab === "groups"
                              ? singleTestGroupsData
                              : singleTestStudentCompareData
                          }
                          margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#22123b" />
                          <XAxis 
                            dataKey={
                              teacherChartTab === "whole"
                                ? "name"
                                : teacherChartTab === "groups"
                                ? "groupName"
                                : "category"
                            } 
                            stroke="#6d5c8a" 
                            fontSize={10} 
                            fontFamily="JetBrains Mono" 
                          />
                          <YAxis domain={[0, 100]} stroke="#6d5c8a" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#090611", borderColor: "#442a78", borderRadius: "1rem" }}
                            itemStyle={{ fontSize: "11px" }}
                            labelStyle={{ color: "#c084fc", fontSize: "11px", fontFamily: "JetBrains Mono", fontWeight: "bold" }}
                            formatter={(v: any) => [`${v}%`, "Performance"]}
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono", paddingLeft: 10 }} />
                          
                          {teacherChartTab === "whole" && (
                            <Bar name={`Scores % for ${selectedChartTestName}`} dataKey="Score %" fill="#a855f7" radius={[6, 6, 0, 0]}>
                              {singleTestWholeGroupData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#a855f7" />
                              ))}
                            </Bar>
                          )}

                          {teacherChartTab === "groups" && (
                            <Bar name={`Group Comparison % for ${selectedChartTestName}`} dataKey="Group Average %" radius={[6, 6, 0, 0]}>
                              {singleTestGroupsData.map((entry, index) => {
                                const colors: { [key: string]: string } = {
                                  "Group A": "#3b82f6",
                                  "Group B": "#22c55e",
                                  "Group C": "#eab308",
                                  "Group D": "#a855f7",
                                  "Group E": "#f43f5e"
                                };
                                return <Cell key={`cell-${index}`} fill={colors[entry.groupName] || "#6366f1"} />;
                              })}
                            </Bar>
                          )}

                          {teacherChartTab === "student" && (
                            <Bar name={`Comparison % for ${selectedChartTestName}`} dataKey="Performance %" radius={[6, 6, 0, 0]}>
                              {singleTestStudentCompareData.map((entry, index) => {
                                let cellColor = "#f59e0b"; // Student (Amber)
                                if (entry.category.endsWith("Avg")) {
                                  cellColor = entry.category === "Cohort Avg" ? "#3b82f6" : "#a855f7";
                                }
                                return <Cell key={`cell-${index}`} fill={cellColor} />;
                              })}
                            </Bar>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[240px] flex flex-col items-center justify-center text-center text-neutral-600 border border-dashed border-purple-950/60 rounded-2xl bg-[#030304]/30">
                      <TrendingUp className="w-12 h-12 text-neutral-800 mb-3" />
                      <p className="text-sm font-semibold">Insufficient score registries</p>
                      <p className="text-xs text-neutral-600 max-w-sm mt-1">There are no matching logged grades currently available to plot for this trace view.</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Split layout: Top is Release assessment templates as side-by-side components, Bottom is full-width Student Rosters & Records Tracker */}
            <div className="space-y-8">
              
              {/* Release assessment templates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
                          <div className="pt-2 border-t border-neutral-900/60 flex justify-between items-center">
                            <span className="text-[9px] text-neutral-500 font-mono">Need a starter template?</span>
                            <button
                              type="button"
                              onClick={() => downloadTemplate("grades")}
                              className="flex items-center text-[10px] font-bold font-mono text-amber-400 hover:text-amber-350 transition"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-amber-400" />
                              Download Excel Template (.csv)
                            </button>
                          </div>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative overflow-hidden border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
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
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition-all duration-150 hover:scale-[1.015] active:scale-[1.03] active:bg-emerald-600 active:shadow-emerald-500/30 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
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
                          <div className="pt-2 border-t border-neutral-900/60 flex justify-between items-center">
                            <span className="text-[9px] text-neutral-500 font-mono">Need a starter template?</span>
                            <button
                              type="button"
                              onClick={() => downloadTemplate("assessments")}
                              className="flex items-center text-[10px] font-bold font-mono text-purple-400 hover:text-purple-350 transition"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-purple-400" />
                              Download Excel Template (.csv)
                            </button>
                          </div>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative overflow-hidden border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
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
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition-all duration-150 hover:scale-[1.015] active:scale-[1.03] active:bg-emerald-600 active:shadow-emerald-500/30 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
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
                            Header structure row: <code className="bg-[#030304] border border-neutral-800 px-1 rounded font-mono text-purple-350">email, Group, Academic Year</code>
                          </p>
                          <div className="bg-[#030304] rounded p-1.5 mt-1 border border-neutral-950 select-all font-mono text-[9px] text-neutral-500 overflow-x-auto whitespace-pre">
                            {"email, Group, Academic Year\nstudent1@domain.com, A, 26-27\nstudent2@domain.com, B, 26-27"}
                          </div>
                          <span className="block text-[9px] text-neutral-500 font-mono italic mt-1">
                            * Installs password of "1234" by default. A funny wild cat name (e.g. Midnight Panther, Shadow Lynx) is dynamically generated for each agent!
                          </span>
                          <div className="pt-2 border-t border-neutral-900/60 flex justify-between items-center">
                            <span className="text-[9px] text-neutral-500 font-mono">Need a starter template?</span>
                            <button
                              type="button"
                              onClick={() => downloadTemplate("students")}
                              className="flex items-center text-[10px] font-bold font-mono text-purple-400 hover:text-purple-350 transition"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-purple-400" />
                              Download Excel Template (.csv)
                            </button>
                          </div>
                        </div>

                        {/* File CSV Uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-purple-400 uppercase font-bold block">Upload CSV / TSV File</label>
                          <div className="relative overflow-hidden border border-purple-950/80 bg-[#030304] rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-purple-800/75 cursor-pointer transition">
                            <input
                              type="file"
                              accept=".csv,.tsv,.txt"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
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
                              placeholder={`email, Group, Academic Year\nstudent1@domain.com, A, 26-27`}
                              className="w-full bg-[#030304] border border-purple-950/80 rounded-xl p-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-purple-600 font-mono resize-none transition"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!bulkTextInput.trim()}
                            className="w-full py-2 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition-all duration-150 hover:scale-[1.015] active:scale-[1.03] active:bg-emerald-600 active:shadow-emerald-500/30 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
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
                              max={teacherData.tests.find(x => x.id === manualTestId)?.maxScore}
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
                          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase text-white bg-purple-700 hover:bg-purple-650 tracking-wide transition-all duration-150 hover:scale-[1.015] active:scale-[1.03] active:bg-emerald-600 active:shadow-emerald-500/30 shadow-md shadow-purple-900/10 cursor-pointer"
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
              <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl space-y-4 w-full">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-purple-950/35 pb-4 gap-4 mb-2">
                  <h3 className="text-sm font-semibold text-neutral-400 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Student Rosters & Records Tracker</span>
                    <button
                      onClick={() => syncApplicationData(false)}
                      title="Force Sync Roster & Logs Now"
                      className="p-1 text-neutral-500 hover:text-purple-400 transition hover:bg-purple-950/25 rounded ml-2 inline-flex items-center"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
                    </button>
                  </h3>
                  
                  {/* Direct interactive filtering inside tracker */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Class Group */}
                    <div className="flex items-center space-x-2 bg-[#030304] border border-purple-950/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[9px] font-mono uppercase text-neutral-500">Group:</span>
                      <select
                        id="tracker-filter-class"
                        value={teacherFilterClass}
                        onChange={(e) => {
                          setTeacherFilterClass(e.target.value);
                          setSelectedStudentDrilldown(null);
                        }}
                        className="bg-transparent text-xs text-purple-300 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Groups</option>
                        <option value="A">Group A</option>
                        <option value="B">Group B</option>
                        <option value="C">Group C</option>
                        <option value="D">Group D</option>
                        <option value="E">Group E</option>
                      </select>
                    </div>

                    {/* Filter Year Cycle */}
                    <div className="flex items-center space-x-2 bg-[#030304] border border-purple-950/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[9px] font-mono uppercase text-neutral-500">Year:</span>
                      <select
                        id="tracker-filter-year"
                        value={teacherFilterYear}
                        onChange={(e) => {
                          setTeacherFilterYear(e.target.value);
                          setSelectedStudentDrilldown(null);
                        }}
                        className="bg-transparent text-xs text-purple-300 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Years</option>
                        <option value="26-27">Year 26-27</option>
                        <option value="27-28">Year 27-28</option>
                        <option value="28-29">Year 28-29</option>
                        <option value="29-30">Year 29-30</option>
                      </select>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex bg-[#030304] border border-purple-950/80 rounded-xl p-1 inline-flex">
                      <button
                        type="button"
                        onClick={() => setRosterViewMode("list")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition ${
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
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                          rosterViewMode === "by-group"
                            ? "bg-purple-900/40 text-purple-200 border border-purple-850/60 shadow-inner"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        By Group
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unified Search Input for Students */}
                <div className="relative mb-3">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Search className="h-4 w-4 text-purple-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter students by private nickname or username..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#030304]/80 border border-purple-950/80 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/40 transition-all duration-150"
                  />
                  {rosterSearch && (
                    <button 
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 text-[10px] font-mono"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-12 gap-5">
                  {/* Left Column: Toggled Roster (Single List or Per Group View) */}
                  <div className="sm:col-span-7 space-y-3">
                    {rosterViewMode === "list" ? (
                      /* Students Roster list */
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-2">
                          Class Cohort ({
                            teacherData.students.filter(s => {
                              const matchClass = teacherFilterClass === "ALL" || s.classGroup === teacherFilterClass;
                              const matchYear = teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear;
                              const matchSearch = !rosterSearch.trim() ||
                                s.nickname.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                                s.username.toLowerCase().includes(rosterSearch.toLowerCase());
                              return matchClass && matchYear && matchSearch;
                            }).length
                          })
                        </span>
                        
                        <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                          {teacherData.students
                            .filter(s => {
                              const matchClass = teacherFilterClass === "ALL" || s.classGroup === teacherFilterClass;
                              const matchYear = teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear;
                              const matchSearch = !rosterSearch.trim() ||
                                s.nickname.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                                s.username.toLowerCase().includes(rosterSearch.toLowerCase());
                              return matchClass && matchYear && matchSearch;
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
                                  onClick={() => {
                                    setSelectedStudentDrilldown(student.username);
                                    setSelectedChartStudent(student.username);
                                    setTeacherChartTab("student");
                                  }}
                                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
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
                    ) : (
                      /* BY GROUP COMPREHENSIVE VIEW */
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                        {["A", "B", "C", "D", "E"].map(groupName => {
                          const groupStudents = teacherData.students.filter(
                            s => s.classGroup === groupName && 
                                 (teacherFilterYear === "ALL" || s.academicYear === teacherFilterYear) &&
                                 (!rosterSearch.trim() || 
                                  s.nickname.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                                  s.username.toLowerCase().includes(rosterSearch.toLowerCase()))
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
                                      <button
                                        type="button"
                                        key={student.username}
                                        onClick={() => {
                                          setSelectedStudentDrilldown(student.username);
                                          setSelectedChartStudent(student.username);
                                          setTeacherChartTab("student");
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer ${
                                          selectedStudentDrilldown === student.username
                                            ? "bg-purple-950/60 border-purple-500/70 text-white animate-pulse"
                                            : "bg-neutral-950/60 border-neutral-900 text-neutral-300 hover:bg-neutral-900/80"
                                        }`}
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
                                        <div className="flex items-center space-x-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
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
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleResetStudentPassword(student.username, student.nickname);
                                            }}
                                            title="Reset password to 1234"
                                            className="p-1.5 bg-purple-950/30 hover:bg-purple-900 text-purple-400 hover:text-purple-200 border border-purple-950/50 hover:border-purple-600/50 rounded-lg transition"
                                          >
                                            <KeyRound className="w-3.5 h-3.5" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteStudent(student.username, student.nickname);
                                            }}
                                            title="Purge student profile"
                                            className="p-1.5 bg-red-950/30 hover:bg-rose-950 text-rose-400 hover:text-rose-200 border border-red-950/50 hover:border-red-650/50 rounded-lg transition"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </button>
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

                  {/* Right Column: Drilling information pane (Shared dynamically between list and group views) */}
                  <div className="sm:col-span-5 bg-[#030304] rounded-2xl p-4 border border-purple-950/80 flex flex-col justify-between min-h-[350px] h-fit">
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
                                onClick={() => handleResetStudentPassword(sProfile.username, sProfile.nickname)}
                                className="w-full py-2 bg-purple-950/40 hover:bg-purple-900 border border-purple-900/60 text-purple-350 uppercase font-bold text-[10px] rounded-lg tracking-wider transition inline-flex items-center justify-center space-x-1"
                              >
                                <KeyRound className="w-3" />
                                <span>Reset Student Password</span>
                              </button>

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

            {teacherViewTab === "revision-progress" && (() => {
              // Extract revision arrays safely
              const sessions = teacherData.revisionSessions || [];
              const logs = teacherData.revisionServiceLogs || [];
              const attempts = teacherData.examAttempts || [];
              const students = teacherData.students || [];

              // 1. Overall stats
              const totalMins = sessions.reduce((sum, s) => sum + s.duration, 0) + logs.reduce((sum, l) => sum + l.duration, 0);
              const totalHours = (totalMins / 60).toFixed(1);
              const avgMinsPerStudent = students.length > 0 ? Math.round(totalMins / students.length) : 0;
              const avgHoursPerStudent = (avgMinsPerStudent / 60).toFixed(1);

              // 2. Weekly change graph (past 7 days activity)
              // Create map of past 7 days
              const dailyActivity: { [dateStr: string]: number } = {};
              const daysList: string[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split("T")[0];
                dailyActivity[dStr] = 0;
                daysList.push(dStr);
              }

              // Populating daily activity from sessions and logs
              sessions.forEach(s => {
                if (dailyActivity[s.date] !== undefined) {
                  dailyActivity[s.date] += s.duration;
                }
              });
              logs.forEach(l => {
                if (dailyActivity[l.date] !== undefined) {
                  dailyActivity[l.date] += l.duration;
                }
              });

              const activityChartData = daysList.map(date => {
                // Shorten date for chart labels e.g. "07/14"
                const parts = date.split("-");
                const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : date;
                return {
                  dateStr: label,
                  "Revision Minutes": dailyActivity[date]
                };
              });

              // 3. Comparison across groups (A, B, C, D, E)
              const groupMap: { [group: string]: { totalMins: number; count: number } } = {
                A: { totalMins: 0, count: 0 },
                B: { totalMins: 0, count: 0 },
                C: { totalMins: 0, count: 0 },
                D: { totalMins: 0, count: 0 },
                E: { totalMins: 0, count: 0 }
              };

              // Count students per group
              students.forEach(s => {
                const g = s.classGroup || "A";
                if (groupMap[g]) groupMap[g].count++;
              });

              // Aggregate minutes per group
              sessions.forEach(s => {
                const sStudent = students.find(x => x.username.toLowerCase().trim() === s.studentUsername.toLowerCase().trim());
                const g = sStudent?.classGroup || "A";
                if (groupMap[g]) groupMap[g].totalMins += s.duration;
              });
              logs.forEach(l => {
                const lStudent = students.find(x => x.username.toLowerCase().trim() === l.studentUsername.toLowerCase().trim());
                const g = lStudent?.classGroup || "A";
                if (groupMap[g]) groupMap[g].totalMins += l.duration;
              });

              const groupChartData = Object.keys(groupMap).map(g => {
                const info = groupMap[g];
                const avg = info.count > 0 ? Math.round(info.totalMins / info.count) : 0;
                return {
                  group: `Group ${g}`,
                  "Total Hours": parseFloat((info.totalMins / 60).toFixed(1)),
                  "Avg Minutes/Student": avg
                };
              });

              return (
                <div className="space-y-8 animate-fade-in">
                  {/* Top Stats Overview */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <Gauge className="absolute right-4 top-4 text-purple-900/40 w-10 h-10 animate-pulse" />
                      <p className="text-xs font-mono text-neutral-500 uppercase">Total Logged Revision</p>
                      <p className="text-2xl font-black text-white mt-2">{totalHours} Hours</p>
                      <div className="text-[10px] text-purple-400 mt-1 font-mono">Cumulative study time cohort-wide</div>
                    </div>

                    <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <Award className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                      <p className="text-xs font-mono text-neutral-500 uppercase">Average study per student</p>
                      <p className="text-2xl font-black text-purple-300 mt-2">{avgHoursPerStudent} Hours</p>
                      <div className="text-[10px] text-purple-400 mt-1 font-mono">Average logged per student user</div>
                    </div>

                    <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <BookOpen className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                      <p className="text-xs font-mono text-neutral-500 uppercase">Topic Sessions</p>
                      <p className="text-2xl font-black text-amber-400 mt-2">{sessions.length}</p>
                      <div className="text-[10px] text-amber-500/70 mt-1 font-mono">Self-logged revision sessions</div>
                    </div>

                    <div className="bg-neutral-950/70 border border-purple-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <CheckCircle className="absolute right-4 top-4 text-purple-900/40 w-10 h-10" />
                      <p className="text-xs font-mono text-neutral-500 uppercase">Logged Exam Questions</p>
                      <p className="text-2xl font-black text-emerald-400 mt-2">{attempts.length}</p>
                      <div className="text-[10px] text-emerald-500/70 mt-1 font-mono">Exam question attempts logged</div>
                    </div>
                  </div>

                  {/* Graphs section */}
                  <div className="grid lg:grid-cols-12 gap-8">
                    {/* Weekly change graph (Daily activity) */}
                    <div className="lg:col-span-6 bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[360px]">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-300 flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-amber-500" />
                          <span>Weekly Change & Daily Revision Trend</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">Total minutes logged per day over the past 7 days</p>
                      </div>

                      <div className="flex-1 h-56 pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#22123b" />
                            <XAxis dataKey="dateStr" stroke="#6d28d9" fontSize={10} fontFamily="monospace" />
                            <YAxis stroke="#6d28d9" fontSize={10} fontFamily="monospace" />
                            <Tooltip contentStyle={{ backgroundColor: "#090514", borderColor: "#4c1d95", color: "#fff" }} />
                            <Area type="monotone" dataKey="Revision Minutes" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Comparison across groups */}
                    <div className="lg:col-span-6 bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[360px]">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-300 flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                          <span>Group Study Comparison</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">Average minutes of revision logged per student in each Group</p>
                      </div>

                      <div className="flex-1 h-56 pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#22123b" />
                            <XAxis dataKey="group" stroke="#6d28d9" fontSize={10} fontFamily="monospace" />
                            <YAxis stroke="#6d28d9" fontSize={10} fontFamily="monospace" />
                            <Tooltip contentStyle={{ backgroundColor: "#090514", borderColor: "#4c1d95", color: "#fff" }} />
                            <Bar dataKey="Avg Minutes/Student" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={45} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Detailed roster table for students' revision tracking */}
                  <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl">
                    <div className="pb-4 border-b border-purple-950/40 mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-300">Detailed Student Revision Ledger</h3>
                        <p className="text-xs text-neutral-500 mt-1">Check individual revision metrics, RAG badges, exam question logs, and scroll down to details</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-purple-950/60 text-purple-400/80 uppercase tracking-wider font-mono">
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4 text-center">Class / Group</th>
                            <th className="py-3 px-4 text-center">Total Hours Logged</th>
                            <th className="py-3 px-4 text-center">Weekly Minutes</th>
                            <th className="py-3 px-4 text-center">Weekly status</th>
                            <th className="py-3 px-4 text-center">Exam logs</th>
                            <th className="py-3 px-4 text-right">Action View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/30 text-neutral-300">
                          {students.map(st => {
                            // Compute student-specific metrics
                            const studSessions = sessions.filter(s => s.studentUsername.toLowerCase() === st.username.toLowerCase());
                            const studLogs = logs.filter(l => l.studentUsername.toLowerCase() === st.username.toLowerCase());
                            const studAttempts = attempts.filter(a => a.studentUsername.toLowerCase() === st.username.toLowerCase());

                            const studTotalMins = studSessions.reduce((sum, s) => sum + s.duration, 0) + studLogs.reduce((sum, l) => sum + l.duration, 0);
                            const studTotalHours = (studTotalMins / 60).toFixed(1);

                            // Compute weekly study time for student
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            sevenDaysAgo.setHours(0, 0, 0, 0);

                            const studWeeklySessionsMins = studSessions
                              .filter(s => new Date(s.date) >= sevenDaysAgo)
                              .reduce((sum, s) => sum + s.duration, 0);
                            const studWeeklyLogsMins = studLogs
                              .filter(l => new Date(l.date) >= sevenDaysAgo)
                              .reduce((sum, l) => sum + l.duration, 0);

                            const studWeeklyMins = studWeeklySessionsMins + studWeeklyLogsMins;

                            let stWeeklyRag: "red" | "amber" | "green" = "red";
                            if (studWeeklyMins >= 300) {
                              stWeeklyRag = "green";
                            } else if (studWeeklyMins > 30) {
                              stWeeklyRag = "amber";
                            }

                            return (
                              <tr key={st.username} className="hover:bg-purple-950/10 transition">
                                <td className="py-3.5 px-4 font-semibold text-white">
                                  {st.nickname} <span className="text-[10px] text-neutral-500 font-mono">({st.username})</span>
                                </td>
                                <td className="py-3.5 px-4 text-center text-neutral-400 font-mono">
                                  Group {st.classGroup} • {st.academicYear}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono text-white font-bold">
                                  {studTotalHours} hrs
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono">
                                  {studWeeklyMins} mins
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black ${
                                    stWeeklyRag === "green"
                                      ? "bg-green-500/10 text-green-400"
                                      : stWeeklyRag === "amber"
                                      ? "bg-amber-500/10 text-amber-400"
                                      : "bg-red-500/10 text-red-400"
                                  }`}>
                                    {stWeeklyRag === "green" ? "🟢 GREEN (5h+)" : stWeeklyRag === "amber" ? "🟡 AMBER" : "🔴 RED (<30m)"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono text-neutral-400">
                                  {studAttempts.length} questions
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      // Set selected student on the chart and simulate opening their details
                                      setSelectedChartStudent(st.username);
                                      showNotification(`Viewing individual log history for ${st.nickname}`, "info");
                                      
                                      // Set window scroll to the detail viewer below
                                      setTimeout(() => {
                                        const detailEl = document.getElementById("individual-revision-viewer");
                                        if (detailEl) {
                                          detailEl.scrollIntoView({ behavior: "smooth" });
                                        }
                                      }, 50);
                                    }}
                                    className="px-3 py-1 bg-purple-900/40 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded text-[10px] font-semibold transition active:scale-95"
                                  >
                                    View Log history
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Individual Revision Viewer detail panel */}
                  {selectedChartStudent && (() => {
                    const selectedStudentObj = students.find(s => s.username === selectedChartStudent);
                    if (!selectedStudentObj) return null;

                    const sSessions = sessions.filter(
                      s => s.studentUsername.toLowerCase() === selectedChartStudent.toLowerCase() &&
                           !s.comment?.includes("__EXAM_METADATA__:")
                    );
                    const sAttempts = attempts.filter(a => a.studentUsername.toLowerCase() === selectedChartStudent.toLowerCase());

                    return (
                      <div id="individual-revision-viewer" className="bg-[#050308]/60 backdrop-blur-md rounded-3xl border border-purple-950/80 p-6 shadow-2xl animate-fade-in space-y-6">
                        <div className="pb-4 border-b border-purple-950/40 flex justify-between items-center flex-wrap gap-4">
                          <div>
                            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">Candidate Detailed Dossier</span>
                            <h4 className="font-display text-lg font-bold text-white mt-1">
                              Revision Log History for <span className="text-purple-350">{selectedStudentObj.nickname}</span>
                            </h4>
                            <p className="text-[11px] text-neutral-400">Review detailed study topic sessions, revision comments, and marked exam question attempts</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedChartStudent(students[0]?.username || "");
                            }}
                            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded text-[10px] border border-neutral-800 transition"
                          >
                            Reset Selection
                          </button>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                          {/* Student Topic Revision Logs */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-mono tracking-wider uppercase font-bold text-purple-400 flex items-center space-x-2">
                              <span>📖 Study Topic Sessions ({sSessions.length})</span>
                            </h5>
                            
                            {sSessions.length > 0 ? (
                              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
                                {sSessions.slice().reverse().map(sess => (
                                  <div key={sess.id} className="bg-neutral-950/50 border border-purple-950/40 p-3 rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-white truncate max-w-[200px]">{sess.topic}</span>
                                      <span className={`px-2 py-0.2 text-[8px] font-mono font-black rounded uppercase ${
                                        sess.rag === "green"
                                          ? "bg-green-500/10 text-green-400"
                                          : sess.rag === "amber"
                                          ? "bg-amber-500/10 text-amber-400"
                                          : "bg-red-500/10 text-red-500"
                                      }`}>
                                        {sess.rag}
                                      </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 italic">"{cleanComment(sess.comment) || "No commentary logged."}"</p>
                                    <div className="flex items-center space-x-4 text-[9px] text-neutral-500 font-mono">
                                      <span>Date: {sess.date}</span>
                                      <span>Duration: {sess.duration} mins</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-neutral-600 bg-neutral-950/20 border border-dashed border-purple-950/30 rounded-xl text-xs italic">
                                No self-logged study sessions recorded.
                              </div>
                            )}
                          </div>

                          {/* Student Marked Exam attempts */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-mono tracking-wider uppercase font-bold text-purple-400 flex items-center space-x-2">
                              <span>📝 Exam Question Attempts ({sAttempts.length})</span>
                            </h5>

                            {sAttempts.length > 0 ? (
                              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
                                {sAttempts.slice().reverse().map(attempt => {
                                  const percentage = Math.round((attempt.marksScored / attempt.marksAvailable) * 100);
                                  return (
                                    <div key={attempt.id} className="bg-neutral-950/50 border border-purple-950/40 p-3 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                                        <span>{attempt.component}</span>
                                        <span className="text-purple-350 font-mono">{attempt.marksScored} / {attempt.marksAvailable} marks ({percentage}%)</span>
                                      </div>
                                      <p className="text-xs text-neutral-400">Topic: <span className="text-neutral-200">{attempt.topic}</span></p>
                                      <p className="text-[11px] text-neutral-300 bg-neutral-950 border border-purple-950/35 p-2 rounded-lg italic">
                                        "{attempt.questionWording}"
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                                        <span>Self-Mark: {attempt.selfMarkingScore}/10</span>
                                        <span>Logged: {attempt.date}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-neutral-600 bg-neutral-950/20 border border-dashed border-purple-950/30 rounded-xl text-xs italic">
                                No exam questions attempts registered.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              );
            })()}

          </div>
        )}

        {/* COMPREHENSIVE WILD CAT ARENA (LEADERBOARD) */}
        {currentPage === "leaderboard" && currentUser && (() => {
          const formatPodiumMetric = (student: any) => {
            if (arenaRankTab === "assessments") {
              return `${student.averagePercentage}%`;
            } else if (arenaRankTab === "revision") {
              return `${(student.totalTimeMins / 60).toFixed(1)} hrs`;
            } else {
              return `${student.aggregateScore}%`;
            }
          };

          const getMetricLabel = () => {
            if (arenaRankTab === "assessments") {
              return "Assessment Average";
            } else if (arenaRankTab === "revision") {
              return "Total Revision";
            } else {
              return "Weighted Performance";
            }
          };

          return (
            <div className="space-y-8 animate-fade-in">
              
              {/* Greetings Bar */}
              <div className="pb-6 border-b border-purple-950/40">
                <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">Apex Interactive Rankings</span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  The Wild Cat <span className="text-purple-400">Arena</span>
                </h2>
              </div>

              {/* Controls Bar: Mode Switcher & Class Filter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950/40 p-4 rounded-3xl border border-purple-950/45">
                
                {/* Ranking Metric Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setArenaRankTab("aggregate")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                      arenaRankTab === "aggregate"
                        ? "bg-purple-700 text-white shadow-md shadow-purple-950/50"
                        : "bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
                    }`}
                  >
                    🏆 Overall Power
                  </button>
                  <button
                    type="button"
                    onClick={() => setArenaRankTab("assessments")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                      arenaRankTab === "assessments"
                        ? "bg-purple-700 text-white shadow-md shadow-purple-950/50"
                        : "bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
                    }`}
                  >
                    📝 Assessments (Score Avg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setArenaRankTab("revision")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                      arenaRankTab === "revision"
                        ? "bg-purple-700 text-white shadow-md shadow-purple-950/50"
                        : "bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
                    }`}
                  >
                    ⏱️ Revision Time (Total)
                  </button>
                </div>

                {/* Class Group Ranking Filter */}
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs text-neutral-400 font-mono">Scope:</span>
                  <select
                    value={arenaGroupFilter}
                    onChange={(e) => setArenaGroupFilter(e.target.value)}
                    className="bg-neutral-950 border border-purple-950/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/40 cursor-pointer"
                  >
                    <option value="ALL">Overall Psychology Ranking</option>
                    <option value="A">Group A</option>
                    <option value="B">Group B</option>
                    <option value="C">Group C</option>
                    <option value="D">Group D</option>
                  </select>
                </div>

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
                        <p className="text-xs text-neutral-500">{getMetricLabel()}</p>
                        <p className="text-xl font-mono font-black text-purple-300">{formatPodiumMetric(arenaList[1])}</p>
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
                        <p className="text-xs text-amber-500/70 uppercase tracking-widest font-bold">{getMetricLabel()}</p>
                        <p className="text-2xl font-mono font-black text-white">{formatPodiumMetric(arenaList[0])}</p>
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
                        <p className="text-xs text-neutral-500">{getMetricLabel()}</p>
                        <p className="text-xl font-mono font-black text-purple-300">{formatPodiumMetric(arenaList[2])}</p>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Arena Standings Board */}
              <div className="bg-neutral-950/70 border border-purple-950 rounded-3xl p-6 shadow-xl max-w-4xl mx-auto">
                <h3 className="text-sm font-semibold text-purple-300/90 flex items-center justify-between border-b border-purple-950/35 pb-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>Leaderboard</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400 font-normal">
                    current participants: {arenaList.length}
                  </span>
                </h3>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {arenaList.length > 0 ? (
                    arenaList.map((rank, index) => {
                      const isMe = rank.nickname === currentUser.nickname;
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
                                Class Group {rank.classGroup} • Cycle: {rank.academicYear}
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">
                                Weekly Revision: <span className="font-mono font-bold text-purple-350">{rank.weeklyMins} mins</span> • Score Avg: <span className="font-mono font-bold text-purple-350">{rank.averagePercentage}%</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-purple-300 block">
                              {arenaRankTab === "assessments"
                                ? `${rank.averagePercentage}%`
                                : arenaRankTab === "revision"
                                ? `${(rank.totalTimeMins / 60).toFixed(1)} hrs`
                                : `${rank.aggregateScore}%`}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 block uppercase">
                              {arenaRankTab === "assessments" ? "Score Avg" : arenaRankTab === "revision" ? "Rev Hours" : "Weighted"}
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
          );
        })()}

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
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-850 hover:border-neutral-750 rounded-xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="custom-confirm-approve"
                type="button"
                onClick={confirmModalState.onConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-red-650 hover:bg-red-500 rounded-xl shadow-lg shadow-red-650/10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Proceed Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Sync Status & Action Log Footer */}
      <footer className="w-full sticky bottom-0 left-0 right-0 z-40 border-t border-purple-950/40 bg-neutral-950/90 backdrop-blur-md py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Sync Engine status section */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.hasSupabase ? "bg-emerald-400" : "bg-purple-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.hasSupabase ? "bg-emerald-500" : "bg-purple-500"}`}></span>
            </div>
            <p className="font-mono text-[11px] text-neutral-300">
              Sync Status: <span className={config.hasSupabase ? "text-emerald-400 font-bold" : "text-neutral-500 font-bold"}>{config.hasSupabase ? "Online" : "Offline"}</span>
            </p>
          </div>

          {/* Activity Log console (last event with timestamp, ultra-thinned) */}
          <div className={`flex-1 max-w-md sm:border-l sm:border-purple-950/20 sm:pl-4 flex items-center space-x-2 text-[11px] font-mono text-neutral-400 truncate px-2 py-1 transition-all duration-300 ${flashLog ? "log-flash" : ""}`}>
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold shrink-0">
              log:
            </span>
            {verifiedActions.length > 0 ? (
              <div className="flex items-center space-x-2 truncate">
                <span className={`w-1 h-1 rounded-full shrink-0 ${
                  verifiedActions[0].type === "success" ? "bg-emerald-500" : verifiedActions[0].type === "error" ? "bg-rose-500" : "bg-purple-500 animate-pulse"
                }`}></span>
                <span className="truncate text-neutral-400">{verifiedActions[0].text}</span>
                <span className="text-[9px] text-neutral-500 font-mono">({verifiedActions[0].timestamp})</span>
              </div>
            ) : (
              <span className="text-neutral-600 italic">No operations.</span>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
}
