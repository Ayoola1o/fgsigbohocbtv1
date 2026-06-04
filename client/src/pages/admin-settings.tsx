import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Printer, Eye, EyeOff, Layout, Award, HelpCircle, ShieldAlert, Hourglass, Info } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  
  // Settings States
  const [scoreFormat, setScoreFormat] = useState<"points" | "percentage">("percentage");
  const [removeTitle, setRemoveTitle] = useState<boolean>(false);
  const [reportSignature, setReportSignature] = useState<boolean>(true);
  const [schoolMotto, setSchoolMotto] = useState<boolean>(true);
  
  // Advanced Settings
  const [cheatProtection, setCheatProtection] = useState<boolean>(true);
  const [passingThreshold, setPassingThreshold] = useState<number>(50);
  const [timerWarning, setTimerWarning] = useState<number>(5);

  // Load settings on mount
  useEffect(() => {
    const savedScoreFormat = localStorage.getItem("fia_cbt_settings_score_format");
    if (savedScoreFormat === "points" || savedScoreFormat === "percentage") {
      setScoreFormat(savedScoreFormat);
    }
    
    const savedRemoveTitle = localStorage.getItem("fia_cbt_settings_remove_title");
    if (savedRemoveTitle !== null) {
      setRemoveTitle(savedRemoveTitle === "true");
    }

    const savedSignature = localStorage.getItem("fia_cbt_settings_report_signature");
    if (savedSignature !== null) {
      setReportSignature(savedSignature === "true");
    }

    const savedMotto = localStorage.getItem("fia_cbt_settings_school_motto");
    if (savedMotto !== null) {
      setSchoolMotto(savedMotto === "true");
    }

    const savedCheatProtection = localStorage.getItem("fia_cbt_settings_cheat_protection");
    if (savedCheatProtection !== null) {
      setCheatProtection(savedCheatProtection === "true");
    }

    const savedPassingThreshold = localStorage.getItem("fia_cbt_settings_passing_threshold");
    if (savedPassingThreshold !== null) {
      setPassingThreshold(Number(savedPassingThreshold));
    }

    const savedTimerWarning = localStorage.getItem("fia_cbt_settings_timer_warning");
    if (savedTimerWarning !== null) {
      setTimerWarning(Number(savedTimerWarning));
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("fia_cbt_settings_score_format", scoreFormat);
    localStorage.setItem("fia_cbt_settings_remove_title", String(removeTitle));
    localStorage.setItem("fia_cbt_settings_report_signature", String(reportSignature));
    localStorage.setItem("fia_cbt_settings_school_motto", String(schoolMotto));
    localStorage.setItem("fia_cbt_settings_cheat_protection", String(cheatProtection));
    localStorage.setItem("fia_cbt_settings_passing_threshold", String(passingThreshold));
    localStorage.setItem("fia_cbt_settings_timer_warning", String(timerWarning));
    
    // Dispatch a storage event so other open pages reactive components know settings changed
    window.dispatchEvent(new Event("storage"));

    toast({
      title: "Settings Saved Successfully",
      description: "Result scoring metrics, security filters, and printing configurations have been updated globally.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      {/* Title Header */}
      <div className="bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <Settings className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Admin Control Center</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
            Configure default scoring outputs, security criteria, result print parameters, and general system presentation rules.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Quick Information & App Version Cards */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-600" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                <Layout className="h-4.5 w-4.5 text-indigo-500" /> Print Engine
              </CardTitle>
              <CardDescription className="text-xs">
                 Faith Immaculate Academy High-Fidelity PDF Generation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 leading-relaxed space-y-3">
              <p>
                Adjust settings to dynamically re-format print layouts in real-time. Changes affect both batch consolidated scorecards and direct print sheets.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <span className="font-bold block text-slate-700 dark:text-slate-305 mb-1">⚡ Hot Reload:</span>
                Toggling scoring criteria dynamically formats print elements without reloading the page session.
              </div>
            </CardContent>
          </Card>

          {/* App Version Card */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-emerald-500" /> App Version
              </CardTitle>
              <CardDescription className="text-xs">
                 System Metadata & Status Details
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-505 leading-relaxed space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <span className="font-extrabold text-slate-600 dark:text-slate-400">Build Version:</span>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-[11px] border border-indigo-100/30">
                  V 5.7.4
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <span className="font-extrabold text-slate-600 dark:text-slate-400">Environment:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">Production</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <span className="font-extrabold text-slate-600 dark:text-slate-400">Sync Engine:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Firestore
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Actual Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
                <Printer className="h-4.5 w-4.5 text-indigo-500" /> Result Printout Configurations
              </CardTitle>
              <CardDescription className="text-xs">Manage how candidate scores and examination parameters compile on print report cards.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Score Format Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Score Format Presentation</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Choose whether student report card scores compile as a **Percentage (e.g. 75%)** or **Raw points achieved (e.g. 15 / 20)**.
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-bold ${scoreFormat === "points" ? "text-indigo-650" : "text-slate-400"}`}>Points</span>
                  <Switch 
                    checked={scoreFormat === "percentage"}
                    onCheckedChange={(checked) => setScoreFormat(checked ? "percentage" : "points")}
                  />
                  <span className={`text-xs font-bold ${scoreFormat === "percentage" ? "text-indigo-650" : "text-slate-400"}`}>Percent</span>
                </div>
              </div>

              {/* Omit Examination Title Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Omit Exam Titles in Result Sheets</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    When enabled, the header and cells showing the specific Examination Title are removed from printed reports to generate generic subject transcripts.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {removeTitle ? <EyeOff className="h-4.5 w-4.5 text-rose-500 mr-1" /> : <Eye className="h-4.5 w-4.5 text-indigo-500 mr-1" />}
                  <Switch 
                    checked={removeTitle}
                    onCheckedChange={setRemoveTitle}
                  />
                </div>
              </div>

              {/* Show Principal/Proctor Signatures */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Include Branded Verification Signatures</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Append formal signature validation fields ("Principal Signature" & "Proctor Stamp") to the footer of printed results.
                  </span>
                </div>
                <Switch 
                  checked={reportSignature}
                  onCheckedChange={setReportSignature}
                />
              </div>

              {/* Show School Motto */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Render School Slogan & Motto Headers</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Render the Faith Immaculate Academy institutional slogan ("Knowledge and Godliness") and address details inside document letterheads.
                  </span>
                </div>
                <Switch 
                  checked={schoolMotto}
                  onCheckedChange={setSchoolMotto}
                />
              </div>

            </CardContent>
          </Card>

          {/* Advanced Examination configurations */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
                <ShieldAlert className="h-4.5 w-4.5 text-indigo-500" /> General Examination & Security Rules
              </CardTitle>
              <CardDescription className="text-xs">Configure exam timer criteria, threshold warnings, and candidate browser security settings.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Cheat Protection Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Enforce Tab-Switch Cheat Protection</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    When active, a warning alert is displayed whenever the student navigates away from the active browser window during examinations.
                  </span>
                </div>
                <Switch 
                  checked={cheatProtection}
                  onCheckedChange={setCheatProtection}
                />
              </div>

              {/* Passing Score Fallback Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Global Passing Score Fallback (%)</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Sets the passing percentage cutoff to determine success metrics when an exam doesn't configure custom threshold rules.
                  </span>
                </div>
                <div className="flex items-center gap-2 max-w-[120px] sm:max-w-none w-full sm:w-28 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={passingThreshold}
                    onChange={(e) => setPassingThreshold(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="font-extrabold text-right rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Timer Warning Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Timer Warning Alert Duration (Min)</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Remaining duration (in minutes) at which the exam countdown timer highlights in red warning state during exams.
                  </span>
                </div>
                <div className="flex items-center gap-2 max-w-[120px] sm:max-w-none w-full sm:w-28 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={timerWarning}
                    onChange={(e) => setTimerWarning(Math.max(1, Math.min(60, Number(e.target.value))))}
                    className="font-extrabold text-right rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400">Min</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800/40">
                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Global Settings Mode
                </span>
                <Button 
                  onClick={handleSaveSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl px-6 flex items-center gap-2 shadow-lg shadow-indigo-500/10 transition-transform active:scale-95"
                >
                  <Save className="h-4 w-4" /> Save System Settings
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
