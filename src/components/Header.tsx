import { Cat, LogOut, Shield, Award, User, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

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
  config: { hasJsonBin: boolean; binId: string | null };
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({
  user,
  onLogout,
  currentPage,
  setCurrentPage,
  config,
  onRefresh,
  isRefreshing
}: HeaderProps) {
  return (
    <header className="border-b border-purple-950 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Brand/Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-900 shadow-lg shadow-purple-500/10">
              <Cat className="h-6 w-6 text-purple-200" />
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
                    onClick={() => setCurrentPage("student-dashboard")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === "student-dashboard"
                        ? "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        : "text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>My Progress</span>
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
            {/* Database Sync Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-[10px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  config.hasJsonBin ? "bg-emerald-500 animate-pulse" : "bg-purple-400"
                }`}
              ></span>
              <span className="font-mono text-neutral-400">
                {config.hasJsonBin ? "Sync: JSONBin" : "Local Database"}
              </span>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-neutral-500 hover:text-purple-400 transition ml-1"
                title="Sync database changes"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {user ? (
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
                  className="flex items-center space-x-1.5 bg-purple-950/80 text-purple-300 hover:bg-purple-900 hover:text-purple-200 border border-purple-800/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95"
                  title="Logout safely"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono text-neutral-500 px-2 py-1 bg-neutral-900 rounded-lg">
                Stealth Ingress Mode
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
                  onClick={() => setCurrentPage("student-dashboard")}
                  className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                    currentPage === "student-dashboard" ? "text-purple-300 font-bold" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <User className="w-4 h-4 mb-0.5" />
                  <span>My Progress</span>
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
