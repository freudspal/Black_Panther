import express from "express";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

export const app = express();
const PORT = 3000;

// Env variables with defaults for preview
const TEACHER_USERNAME = process.env.TEACHER_USERNAME || "admin";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "panther2026";

// Filepath for local backup fallback - use /tmp/ on Vercel to bypass read-only filesystem restrictions
const dbFilePath = process.env.VERCEL
  ? path.join("/tmp", "data-store.json")
  : path.join(process.cwd(), "data-store.json");

interface DBStructure {
  tests: { id: string; name: string; maxScore: number; dateCreated: string }[];
  students: {
    username: string;
    passwordHash: string;
    classGroup: string;
    academicYear: string;
    nickname: string;
    hasChangedPassword?: boolean;
  }[];
  scores: {
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
  }[];
}

let dbCache: DBStructure = {
  tests: [
    { id: "t-default-1", name: "Introductory Mechanics", maxScore: 50, dateCreated: "2026-06-21" },
    { id: "t-default-2", name: "Genetics Fundamental", maxScore: 30, dateCreated: "2026-06-22" },
    { id: "t-default-3", name: "Kinematics Analysis", maxScore: 100, dateCreated: "2026-06-23" }
  ],
  students: [
    // Pre-seed some mock students for beautiful visual initial preview
    {
      username: "student1",
      passwordHash: hashPassword("1234"),
      classGroup: "A",
      academicYear: "26-27",
      nickname: "Midnight Cougar"
    },
    {
      username: "student2",
      passwordHash: hashPassword("1234"),
      classGroup: "B",
      academicYear: "26-27",
      nickname: "Glow Panther"
    },
    {
      username: "student3",
      passwordHash: hashPassword("1234"),
      classGroup: "A",
      academicYear: "26-27",
      nickname: "Shadow Ocelot"
    }
  ],
  scores: [
    // Pre-seed some mock grades to light up the charts instantly
    {
      id: "s-seed-1",
      studentUsername: "student1",
      studentNickname: "Midnight Cougar",
      testId: "t-default-1",
      testName: "Introductory Mechanics",
      score: 42,
      maxScore: 50,
      percentage: 84.0,
      grade: "A*",
      date: "2026-06-21",
      classGroup: "A",
      academicYear: "26-27"
    },
    {
      id: "s-seed-2",
      studentUsername: "student1",
      studentNickname: "Midnight Cougar",
      testId: "t-default-2",
      testName: "Genetics Fundamental",
      score: 21,
      maxScore: 30,
      percentage: 70.0,
      grade: "A",
      date: "2026-06-22",
      classGroup: "A",
      academicYear: "26-27"
    },
    {
      id: "s-seed-3",
      studentUsername: "student2",
      studentNickname: "Glow Panther",
      testId: "t-default-1",
      testName: "Introductory Mechanics",
      score: 29,
      maxScore: 50,
      percentage: 58.0,
      grade: "B",
      date: "2026-06-21",
      classGroup: "B",
      academicYear: "26-27"
    },
    {
      id: "s-seed-4",
      studentUsername: "student2",
      studentNickname: "Glow Panther",
      testId: "t-default-2",
      testName: "Genetics Fundamental",
      score: 14,
      maxScore: 30,
      percentage: 46.67,
      grade: "C",
      date: "2026-06-22",
      classGroup: "B",
      academicYear: "26-27"
    },
    {
      id: "s-seed-5",
      studentUsername: "student3",
      studentNickname: "Shadow Ocelot",
      testId: "t-default-1",
      testName: "Introductory Mechanics",
      score: 18,
      maxScore: 50,
      percentage: 36.0,
      grade: "D",
      date: "2026-06-21",
      classGroup: "A",
      academicYear: "26-27"
    }
  ]
};

// Cryptography helper
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Nickname generation system: Sleek, high-privacy wild cat identifiers
const prefixes = [
  "Shadow", "Midnight", "Vortex", "Neon", "Cosmic", "Stealth", "Savage", "Phantom", 
  "Glow", "Silent", "Sleek", "Hyper", "Solar", "Jade", "Abyss", "Ember", "Frost", 
  "Electric", "Whisper", "Stalker", "Alpha", "Omega", "Viper", "Onyx", "Rogue"
];
const cats = [
  "Panther", "Leopard", "Cheetah", "Jaguar", "Cougar", "Ocelot", "Lynx", "Bobcat", 
  "Caracal", "Puma", "Serval", "Margay", "Jaguarundi", "Onyx", "Tigon", "Liger"
];

function generateNickname(existingNicknames: string[]): string {
  let attempts = 0;
  while (attempts < 1000) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const nickname = `${prefix} ${cat}`;
    if (!existingNicknames.includes(nickname)) {
      return nickname;
    }
    attempts++;
  }
  return `Wild Panther ${Math.floor(Math.random() * 900) + 100}`;
}

// Automatic Grade determination matching grade boundaries
function determineGrade(percentage: number): string {
  if (percentage >= 76.00) return "A*";
  if (percentage >= 66.67) return "A";
  if (percentage >= 56.00) return "B";
  if (percentage >= 45.33) return "C";
  if (percentage >= 34.67) return "D";
  if (percentage >= 24.00) return "E";
  return "U";
}

// Local caching parameters to prevent JSONBin race conditions and API rate-limiting
let dbLoadedOnce = false;
let lastDbFetchTime = 0;
const CACHE_TTL_MS = 15000; // Cache database from JSONBin for at most 15 seconds
let lastJsonBinError: string | null = null;

// Database loader with intelligent cloud-sync or local fallback
async function loadDB(bypassCache = false): Promise<DBStructure> {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;

  // If already loaded and cache TTL hasn't expired, return from memory immediately (high perf!)
  if (!bypassCache && dbLoadedOnce && (Date.now() - lastDbFetchTime < CACHE_TTL_MS)) {
    return dbCache;
  }

  if (apiKey && binId) {
    try {
      console.log(`[DB] Syncing with JSONBin (${binId})...`);
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          "X-Master-Key": apiKey
        }
      });
      if (response.ok) {
        const body: any = await response.json();
        if (body.record && Array.isArray(body.record.students)) {
          dbCache = body.record;
          dbLoadedOnce = true;
          lastDbFetchTime = Date.now();
          lastJsonBinError = null; // Clear error on success
          // Synchronize local backup
          try {
            fs.writeFileSync(dbFilePath, JSON.stringify(dbCache, null, 2), "utf-8");
          } catch (_) {}
          return dbCache;
        } else {
          // If the bin exists but has no students record, auto-initialize it with our seed data!
          console.log("[DB] JSONBin bin found but uninitialized. Initializing cloud bin with seed data...");
          const success = await saveDB(dbCache);
          if (success) {
            dbLoadedOnce = true;
            lastDbFetchTime = Date.now();
            lastJsonBinError = null;
            return dbCache;
          } else {
            lastJsonBinError = "Cloud bin is empty and auto-initialization failed.";
          }
        }
      } else {
        let errMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody && errBody.message) {
            errMsg += `: ${errBody.message}`;
          }
        } catch (_) {}
        lastJsonBinError = errMsg;
        console.error(`[DB] JSONBin returned status ${response.status}. Using cached/local data instead.`);
      }
    } catch (err: any) {
      lastJsonBinError = `Fetch error: ${err.message || err}`;
      console.error("[DB] JSONBin fetch failed, using local backup:", err);
    }
  }

  // Local storage backup
  try {
    if (fs.existsSync(dbFilePath)) {
      const dataStr = fs.readFileSync(dbFilePath, "utf-8");
      const parsed = JSON.parse(dataStr);
      if (Array.isArray(parsed.students)) {
        dbCache = parsed;
        dbLoadedOnce = true;
        lastDbFetchTime = Date.now();
      }
    } else {
      // If we are on Vercel/serverless and the tmp file doesn't exist yet, try to copy it from pre-bundle
      const bundlePath = path.join(process.cwd(), "data-store.json");
      if (process.env.VERCEL && fs.existsSync(bundlePath)) {
        try {
          const bundleData = fs.readFileSync(bundlePath, "utf-8");
          const parsed = JSON.parse(bundleData);
          if (Array.isArray(parsed.students)) {
            fs.writeFileSync(dbFilePath, bundleData, "utf-8");
            dbCache = parsed;
            dbLoadedOnce = true;
            lastDbFetchTime = Date.now();
            return dbCache;
          }
        } catch (copyErr) {
          console.error("[DB] Failed copy from package bundle to tmp directory:", copyErr);
        }
      }
      fs.writeFileSync(dbFilePath, JSON.stringify(dbCache, null, 2), "utf-8");
      dbLoadedOnce = true;
      lastDbFetchTime = Date.now();
    }
  } catch (err) {
    console.error("[DB] Local storage error:", err);
  }

  return dbCache;
}

// Database synchronizer
async function saveDB(data: DBStructure): Promise<boolean> {
  // Update local memory cache instantly
  dbCache = data;
  dbLoadedOnce = true;
  lastDbFetchTime = Date.now(); // Ensures immediately following reads get memory data

  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  let synced = true;

  if (apiKey && binId) {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": apiKey
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        let errMsg = `PUT ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody && errBody.message) {
            errMsg += `: ${errBody.message}`;
          }
        } catch (_) {}
        lastJsonBinError = errMsg;
        console.error(`[DB] JSONBin write failed: ${response.status}`);
        synced = false;
      } else {
        lastJsonBinError = null; // Clear error on successful save
      }
    } catch (err: any) {
      lastJsonBinError = `PUT Crash: ${err.message || err}`;
      console.error("[DB] JSONBin write crash:", err);
      synced = false;
    }
  }

  // Always back up locally
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Local backup write crash:", err);
    // If we have JSONBin credentials active, the cloud update was completed.
    // Therefore, do not make the overall update report failure due to local filesystem read-only restrictions.
    if (!apiKey || !binId) {
      synced = false;
    }
  }

  return synced;
}

// Register middlewares and routes synchronously at the module level
// Use express json parser
app.use(express.json());

// Log all API hits
app.use((req, res, next) => {
  console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Prevent API caching globally across all /api routes
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Base configuration info
app.get("/api/config-status", async (req, res) => {
  const isUsingJsonBin = !!(process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID);
  if (isUsingJsonBin && !dbLoadedOnce) {
    try {
      await loadDB();
    } catch (_) {}
  }
  res.json({
    success: true,
    hasJsonBin: isUsingJsonBin,
    binId: process.env.JSONBIN_BIN_ID || null,
    defaultTeacherUsername: TEACHER_USERNAME,
    defaultTeacherPassword: TEACHER_PASSWORD,
    jsonBinError: lastJsonBinError,
  });
});

// 1. REGISTER STUDENT
app.post("/api/auth/register", async (req, res) => {
  res.status(403).json({ error: "Registration is restricted to preloaded student rosters. Self-registration is disabled." });
});

// 2. LOGIN (BOTH TEACHER & STUDENT)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password/PIN are required." });
      return;
    }

    const trimmedUser = username.trim();
    
    // Check Teacher Credentials
    if (trimmedUser.toLowerCase() === TEACHER_USERNAME.toLowerCase() && password === TEACHER_PASSWORD) {
      res.status(200).json({
        success: true,
        role: "teacher",
        user: {
          username: TEACHER_USERNAME,
          nickname: "Alpha Director"
        }
      });
      return;
    }

    // Check Student Credentials from loading db
    const db = await loadDB(true);
    const student = db.students.find(s => s.username.toLowerCase() === trimmedUser.toLowerCase());
    if (!student) {
      res.status(401).json({ error: "Invalid username or password/PIN" });
      return;
    }

    const testHash = hashPassword(password);
    if (student.passwordHash !== testHash) {
      res.status(401).json({ error: "Invalid username or password/PIN" });
      return;
    }

    res.status(200).json({
      success: true,
      role: "student",
      user: {
        username: student.username,
        classGroup: student.classGroup,
        academicYear: student.academicYear,
        nickname: student.nickname,
        needsPasswordChange: student.hasChangedPassword !== true
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5 CHANGE STUDENT PASSWORD
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
      res.status(400).json({ error: "Username, current password, and new password are required." });
      return;
    }

    const db = await loadDB(true);
    const student = db.students.find(s => s.username.toLowerCase() === username.trim().toLowerCase());
    if (!student) {
      res.status(404).json({ error: "Student not found." });
      return;
    }

    if (student.passwordHash !== hashPassword(currentPassword)) {
      res.status(401).json({ error: "Incorrect current password." });
      return;
    }

    student.passwordHash = hashPassword(newPassword);
    student.hasChangedPassword = true;
    await saveDB(db);

    res.json({
      success: true,
      message: "Password updated successfully!"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET ALL AVAILABLE TEST TEMPLATES
app.get("/api/tests", async (req, res) => {
  try {
    const db = await loadDB(true);
    res.json({ success: true, tests: db.tests });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CREATE A TEST TEMPLATE (TEACHER CONTROL)
app.post("/api/tests", async (req, res) => {
  try {
    const { name, maxScore } = req.body;
    if (!name || !maxScore) {
      res.status(400).json({ error: "Test name and maximum possible score are required." });
      return;
    }

    const db = await loadDB(true);
    const id = "t-" + Date.now();
    const newTest = {
      id,
      name: name.trim(),
      maxScore: Number(maxScore),
      dateCreated: new Date().toISOString().split("T")[0]
    };

    db.tests.push(newTest);
    await saveDB(db);

    res.json({ success: true, test: newTest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE A TEST TEMPLATE (TEACHER CONTROL)
app.delete("/api/tests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await loadDB(true);
    const initialLength = db.tests.length;
    
    db.tests = db.tests.filter(t => t.id !== id);
    const deletedFromSeed = initialLength !== db.tests.length;

    // Also clean up any recorded scores linked to this test template
    db.scores = db.scores.filter(s => s.testId !== id);

    await saveDB(db);
    res.json({ success: true, deleted: deletedFromSeed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SUBMIT STUDENT SCORE
app.post("/api/scores", async (req, res) => {
  try {
    const { studentUsername, testId, score, date } = req.body;
    if (!studentUsername || !testId || score === undefined || !date) {
      res.status(400).json({ error: "Missing score details." });
      return;
    }

    const db = await loadDB(true);
    const student = db.students.find(s => s.username === studentUsername);
    if (!student) {
      res.status(404).json({ error: "Student profile not found." });
      return;
    }

    const test = db.tests.find(t => t.id === testId);
    if (!test) {
      res.status(404).json({ error: "Test template not found." });
      return;
    }

    const maxScore = test.maxScore;
    const rawScore = Number(score);
    const percentage = Number(((rawScore / maxScore) * 100).toFixed(2));
    const grade = determineGrade(percentage);

    const id = "s-" + Date.now();
    const scoreEntry = {
      id,
      studentUsername: student.username,
      studentNickname: student.nickname,
      testId: test.id,
      testName: test.name,
      score: rawScore,
      maxScore,
      percentage,
      grade,
      date,
      classGroup: student.classGroup,
      academicYear: student.academicYear,
    };

    // Ensure no duplicate score for the same student on the same test template
    db.scores = db.scores.filter(
      s => !(s.studentUsername === student.username && s.testId === test.id)
    );

    db.scores.push(scoreEntry);
    await saveDB(db);

    res.json({ success: true, score: scoreEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.15 DELETE A STUDENT (TEACHER ACTION)
app.post("/api/teacher/delete-student", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: "Missing username for student deletion." });
      return;
    }
    const db = await loadDB(true);
    const initialLength = db.students.length;
    db.students = db.students.filter(s => s.username.toLowerCase() !== username.toLowerCase().trim());
    
    // Also clean up scores or keep them? Let's clean up scores for a cleaner slate
    db.scores = db.scores.filter(sc => sc.studentUsername.toLowerCase() !== username.toLowerCase().trim());
    
    if (db.students.length === initialLength) {
      res.status(404).json({ error: "Student not found in database rosters." });
      return;
    }
    await saveDB(db);
    res.json({ success: true, message: "Student profile and matching scores purged successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.16 REASSIGN STUDENT ACADEMIC GROUP (TEACHER ACTION)
app.post("/api/teacher/reassign-student-group", async (req, res) => {
  try {
    const { username, classGroup } = req.body;
    if (!username || !classGroup) {
      res.status(400).json({ error: "Missing academic handle or target group." });
      return;
    }
    const db = await loadDB(true);
    const student = db.students.find(s => s.username.toLowerCase() === username.toLowerCase().trim());
    if (!student) {
      res.status(404).json({ error: "Student not found." });
      return;
    }
    student.classGroup = classGroup.trim();

    // Also update classGroup in previous scores so reports match
    db.scores.forEach(sc => {
      if (sc.studentUsername.toLowerCase() === username.toLowerCase().trim()) {
        sc.classGroup = classGroup.trim();
      }
    });

    await saveDB(db);
    res.json({ success: true, message: `Student group updated to ${classGroup}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.2 BULK IMPORT STUDENTS (TEACHER CONTROL)
app.post("/api/teacher/import-students", async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      res.status(400).json({ error: "Invalid array of student rows." });
      return;
    }

    const db = await loadDB(true);
    let importedCount = 0;
    let duplicateCount = 0;

    for (const item of students) {
      // Support email / username
      const email = (item.email || item.username || item["student email"] || item["student's email"] || "").trim();
      if (!email) continue;

      const emailLower = email.toLowerCase();
      const exists = db.students.some(s => s.username.toLowerCase() === emailLower);
      if (exists) {
        duplicateCount++;
        continue;
      }

      const classGroup = (item.classGroup || item.class || "A").trim();
      const academicYear = (item.academicYear || item.year || "26-27").trim();
      const nickname = (item.nickname || "").trim() || generateNickname(db.students.map(s => s.nickname));

      db.students.push({
        username: email,
        passwordHash: hashPassword("1234"),
        classGroup,
        academicYear,
        nickname,
        hasChangedPassword: false
      });
      importedCount++;
    }

    if (importedCount > 0) {
      await saveDB(db);
    }

    res.json({
      success: true,
      importedCount,
      duplicateCount,
      message: `Successfully imported ${importedCount} student accounts with default password '1234'. Skipped ${duplicateCount} duplicates.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.4 BULK IMPORT TESTS / ASSESSMENT TEMPLATES (TEACHER CONTROL)
app.post("/api/teacher/import-assessments", async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests)) {
      res.status(400).json({ error: "Invalid array of templates provided." });
      return;
    }

    const db = await loadDB(true);
    let importedCount = 0;
    let duplicateCount = 0;

    for (const t of tests) {
      let name = t.name || t.assessmentName || t.assessemntName || t["assessment name"] || t["assessemnt name"];
      let maxScore = t.maxScore || t.maxMarks || t["max marks"] || t.limit || t.marks;

      if (!name || maxScore === undefined) continue;

      const cleanName = name.trim();
      const limitMarks = Number(maxScore);

      const dup = db.tests.find(x => x.name.toLowerCase() === cleanName.toLowerCase());
      if (dup) {
        duplicateCount++;
        continue;
      }

      const id = "t-" + Date.now() + Math.floor(Math.random() * 1000);
      db.tests.push({
        id,
        name: cleanName,
        maxScore: limitMarks,
        dateCreated: new Date().toISOString().split("T")[0]
      });
      importedCount++;
    }

    if (importedCount > 0) {
      await saveDB(db);
    }

    res.json({
      success: true,
      importedCount,
      duplicateCount,
      message: `Successfully imported ${importedCount} assessment templates. Skipped ${duplicateCount} duplicates.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.5 BULK IMPORT EXCEL/CSV DATA (TEACHER CONTROL) - EXCLUDING DUPLICATES
app.post("/api/teacher/bulk-import", async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      res.status(400).json({ error: "Invalid array of rows provided." });
      return;
    }

    const db = await loadDB(true);
    let importedCount = 0;
    let duplicateCount = 0;

    for (const row of rows) {
      // Robust flexible key mapping to find matching values
      let studentEmail = row.studentsEmailAddress || row.studentEmailAddress || row.studentEmail || row.studentUsername || row.username || row.email || row["student's email address"] || row["students email address"] || row["student email"] || row["students email"];
      let testName = row.assessmentName || row.assessemntName || row.testName || row["assessment name"] || row["assessemnt name"] || row.test || row.name;
      let maxScore = row.maxMarks || row["max marks"] || row.maxScore || row.limit || row.marks;
      let score = row.actualMarks || row["actual marks"] || row.rawScore || row.score || row.mark || row.actualScore || row.actualMark;
      let date = row.date || row.dateCreated;

      if (!studentEmail || !testName || score === undefined) {
        continue;
      }

      const cleanEmail = String(studentEmail).trim();
      const cleanTestName = String(testName).trim();
      const rawScore = Number(score);
      const limitMarks = Number(maxScore || 100);
      const assessDate = date ? String(date).trim() : new Date().toISOString().split("T")[0];

      // 1. Ensure / Find Student
      let student = db.students.find(s => s.username.toLowerCase() === cleanEmail.toLowerCase());
      if (!student) {
        student = db.students.find(s => s.nickname.toLowerCase() === cleanEmail.toLowerCase());
      }
      if (!student) {
        // Skip because only preloaded students are authorized
        continue;
      }

      // 2. Ensure / Find Test template
      let test = db.tests.find(t => t.name.toLowerCase() === cleanTestName.toLowerCase());
      if (!test) {
        test = {
          id: "t-" + Date.now() + Math.floor(Math.random() * 1000),
          name: cleanTestName,
          maxScore: limitMarks,
          dateCreated: assessDate
        };
        db.tests.push(test);
      }

      // 3. Duplicate check - EXCLUDE DUPLICATES (case insensitive)
      const exists = db.scores.some(
        s => s.studentUsername.toLowerCase() === student!.username.toLowerCase() && s.testId === test!.id
      );

      if (exists) {
        duplicateCount++;
        continue;
      }

      const percentage = Number(((rawScore / test.maxScore) * 100).toFixed(2));
      const grade = determineGrade(percentage);
      const scoreId = "s-" + Date.now() + Math.random().toString(36).substring(4, 7);

      const scoreEntry = {
        id: scoreId,
        studentUsername: student.username,
        studentNickname: student.nickname,
        testId: test.id,
        testName: test.name,
        score: rawScore,
        maxScore: test.maxScore,
        percentage,
        grade,
        date: assessDate,
        classGroup: student.classGroup,
        academicYear: student.academicYear
      };

      db.scores.push(scoreEntry);
      importedCount++;
    }

    if (importedCount > 0) {
      await saveDB(db);
    }

    res.json({
      success: true,
      importedCount,
      duplicateCount,
      message: `Successfully imported ${importedCount} records. Excluded ${duplicateCount} duplicate records.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET SCORES FOR STUDENT OR TEACHER
app.get("/api/scores", async (req, res) => {
  try {
    const { studentUsername } = req.query;
    const db = await loadDB(true);

    if (studentUsername) {
      // Return scores belonging to this specific student
      const filtered = db.scores.filter(s => s.studentUsername === studentUsername);
      res.json({ success: true, scores: filtered });
    } else {
      // Return all scores for teacher module
      res.json({ success: true, scores: db.scores });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DELETE STUDENT SCORE
app.delete("/api/scores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await loadDB(true);
    db.scores = db.scores.filter(s => s.id !== id);
    await saveDB(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. TEACHER ANALYTICS & DASHBOARD METRICS
app.get("/api/teacher/dashboard", async (req, res) => {
  try {
    const db = await loadDB(true);
    
    // Return student database list (without hashes) for easy listing and metrics calculation
    const studentsList = db.students.map(s => ({
      username: s.username,
      nickname: s.nickname,
      classGroup: s.classGroup,
      academicYear: s.academicYear
    }));

    res.json({
      success: true,
      tests: db.tests,
      students: studentsList,
      scores: db.scores,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Integration for Hot Middleware serving
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  (async () => {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[SERVER] Black Panther Test Tracker booted elegantly on port ${PORT}`);
      });
    } catch (err) {
      console.error("[SERVER] Failed to start Vite dev server:", err);
    }
  })();
} else if (!process.env.VERCEL) {
  // In production, serve absolute path files containing bundled React SPA
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Black Panther Test Tracker booted elegantly on port ${PORT}`);
  });
}

export default app;
