import { LogOut, Shield, Award, User, BookOpen } from "lucide-react";
import { motion } from "motion/react";
// @ts-ignore
import pantherLogo from "../assets/images/panther_logo_1782473515224.jpg";

interface HeaderProps {
  user: {
    username: string;
    nickname: string;
    classGroup?: string;
    academicYear?: string;
    role: "student" | "teacher";
  } | null;
  onLogout: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  config: { hasSupabase: boolean; supabaseUrl: string | null };
  onRefresh: () => void;
  isRefreshing: boolean;
  studentTab?: "my-progress" | "wild-cat-arena" | "revision-progress";
  setStudentTab?: (tab: "my-progress" | "wild-cat-arena" | "revision-progress") => void;
}

export default function Header({
  user,
  onLogout,
  currentPage,
  setCurrentPage,
  config,
  onRefresh,
  isRefreshing,
  studentTab,
  setStudentTab
}: HeaderProps) {
  return (
    <header className="border-b border-purple-950 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Brand/Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 overflow-hidden border border-purple-950">
              <img
                src={pantherLogo}
                alt="Black Panther"
                className="h-full w-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
              {/* Outer glow ring representing panther stealth */}
              <span className="absolute -inset-0.5 rounded-xl bg-purple-500/20 blur opacity-30 animate-pulse"></span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
                Black Panther
              </h1>
              <span className="font-mono text-[10px] tracking-wider text-purple-400 uppercase font-bold">
                Test Tracker
              </span>
            </div>
          </div>

          {/* Navigation Links (If Logged In) */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {user.role === "student" && (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage("student-dashboard");
                      if (setStudentTab) setStudentTab("my-progress");
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "student-dashboard" && studentTab === "my-progress"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>My Progress</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage("student-dashboard");
                      if (setStudentTab) setStudentTab("revision-progress");
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "student-dashboard" && studentTab === "revision-progress"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Revision Progress</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage("leaderboard")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "leaderboard"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Wild Cat Arena</span>
                  </button>
                </>
              )}
              {user.role === "teacher" && (
                <>
                  <button
                    onClick={() => setCurrentPage("teacher-dashboard")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "teacher-dashboard"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Command Center</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage("leaderboard")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "leaderboard"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Wild Cat Arena</span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Right Action / Status Area */}
          <div className="flex items-center space-x-3">
            {user && (
              <div className="flex items-center space-x-3 pl-2 border-l border-neutral-800">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {user.nickname}
                  </p>
                  <p className="text-[10px] font-mono text-purple-400 capitalize">
                    {user.role} {user.classGroup ? `• Group ${user.classGroup}` : ""}
                  </p>
                </div>
                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 bg-purple-950/80 text-purple-300 hover:bg-purple-900 hover:text-purple-200 border border-purple-800/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 animate-in fade-in"
                  title="Logout safely"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav Links Container */}
        {user && (
          <div className="flex md:hidden border-t border-purple-950/50 py-2 justify-around">
            {user.role === "student" && (
              <>
                <button
                  id="mobile-btn-progress"
                  onClick={() => {
                    setCurrentPage("student-dashboard");
                    if (setStudentTab) setStudentTab("my-progress");
                  }}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "student-dashboard" && studentTab === "my-progress" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <User className="w-4 h-4 mb-0.5" />
                  <span>My Progress</span>
                </button>
                <button
                  id="mobile-btn-revision"
                  onClick={() => {
                    setCurrentPage("student-dashboard");
                    if (setStudentTab) setStudentTab("revision-progress");
                  }}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "student-dashboard" && studentTab === "revision-progress" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <BookOpen className="w-4 h-4 mb-0.5" />
                  <span>Revision</span>
                </button>
                <button
                  id="mobile-btn-leaderboard"
                  onClick={() => setCurrentPage("leaderboard")}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "leaderboard" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Award className="w-4 h-4 mb-0.5" />
                  <span>Wild Cat Arena</span>
                </button>
              </>
            )}
            {user.role === "teacher" && (
              <>
                <button
                  id="mobile-btn-teacher"
                  onClick={() => setCurrentPage("teacher-dashboard")}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "teacher-dashboard" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Shield className="w-4 h-4 mb-0.5" />
                  <span>Command Center</span>
                </button>
                <button
                  id="mobile-btn-leaderboard-teacher"
                  onClick={() => setCurrentPage("leaderboard")}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "leaderboard" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Award className="w-4 h-4 mb-0.5" />
                  <span>Wild Cat Arena</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
