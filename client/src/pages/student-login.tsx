import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !studentId) {
      setError("Please enter both name and student ID");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/students/login", { name, studentId });
      // on success, redirect to student portal
      setLocation("/student-portal");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 bg-cover bg-center bg-no-repeat relative px-4 overflow-hidden font-sans"
      style={{ backgroundImage: 'url("/login-bg.jpg")' }}
    >
      {/* Dynamic Background Glow Overlay */}
      <div className="absolute inset-0 bg-slate-950/80 dark:bg-slate-950/90 z-0 backdrop-blur-[2px]" />
      
      {/* Decorative Light Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none z-0" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-600">
        <Card className="shadow-2xl bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10 dark:border-slate-805/65 rounded-3xl overflow-hidden">
          <CardContent className="p-8 sm:p-10">
            {/* School Branding */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-indigo-650/20 mb-4 animate-bounce">
                FIA
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Faith Immaculate Academy
              </h1>
              <p className="text-indigo-200/60 text-xs uppercase tracking-widest font-black mt-1">
                Knowledge and Godliness
              </p>
              <div className="h-0.5 w-12 bg-indigo-500/30 rounded-full mt-4" />
            </div>

            <p className="text-slate-350 text-center text-sm font-semibold mb-6">
              Enter details below to access your CBT Portal
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-slate-200 text-xs font-bold uppercase tracking-wider">
                  Full Candidate Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full registered name"
                  className="mt-2 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-455 focus-visible:ring-indigo-550 rounded-xl focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <Label htmlFor="studentId" className="text-slate-200 text-xs font-bold uppercase tracking-wider">
                  Student Portal passcode ID
                </Label>
                <Input
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter your student passcode ID"
                  className="mt-2 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-455 focus-visible:ring-indigo-550 rounded-xl focus:border-indigo-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-rose-350 text-xs font-bold text-center bg-rose-955/25 border border-rose-900/35 p-3 rounded-xl animate-in shake duration-300">
                  {error}
                </p>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 bg-white hover:bg-slate-100 text-indigo-950 font-extrabold shadow-lg rounded-xl transition-all duration-200 hover:scale-[1.01]"
              >
                {loading ? "Logging in..." : "Access Candidate Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
