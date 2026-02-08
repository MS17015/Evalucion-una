"use client";

import { useState, useEffect } from "react";
import { StudentLogin } from "@/components/StudentLogin";
import { PromptEvaluationDashboard } from "@/components/PromptEvaluationDashboard";

export default function Home() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedName = localStorage.getItem("uees_student_name");
    if (storedName) {
      setStudentName(storedName);
    }
  }, []);

  const handleLogin = (name: string) => {
    localStorage.setItem("uees_student_name", name);
    setStudentName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem("uees_student_name");
    setStudentName(null);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      {!studentName ? (
        <StudentLogin onLogin={handleLogin} />
      ) : (
        <PromptEvaluationDashboard 
          studentName={studentName} 
          onLogout={handleLogout} 
        />
      )}
    </main>
  );
}
