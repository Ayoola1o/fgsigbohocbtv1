import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Printer, Eye, EyeOff, Layout, Award, HelpCircle, ShieldAlert, Hourglass, Info, Upload, Trash2 } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  
  // Settings States
  const [scoreFormat, setScoreFormat] = useState<"points" | "percentage">("percentage");
  const [removeTitle, setRemoveTitle] = useState<boolean>(false);
  const [reportSignature, setReportSignature] = useState<boolean>(true);
  const [schoolMotto, setSchoolMotto] = useState<boolean>(true);
  
  // Custom states requested by user
  const [showResultButton, setShowResultButton] = useState<boolean>(true);
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [signaturePrincipal, setSignaturePrincipal] = useState<string>("");
  const [signatureTeacher, setSignatureTeacher] = useState<string>("");
  const [signatureOfficer, setSignatureOfficer] = useState<string>("");
  const [analysisMode, setAnalysisMode] = useState<"automatic" | "manual" | string>("automatic");

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

    // Load custom settings
    const savedShowResultButton = localStorage.getItem("fia_cbt_settings_show_result_button");
    if (savedShowResultButton !== null) {
      setShowResultButton(savedShowResultButton === "true");
    }

    const savedHideCompleted = localStorage.getItem("fia_cbt_settings_hide_completed");
    if (savedHideCompleted !== null) {
      setHideCompleted(savedHideCompleted === "true");
    }

    const savedSigPrincipal = localStorage.getItem("fia_cbt_settings_signature_principal");
    if (savedSigPrincipal !== null) {
      setSignaturePrincipal(savedSigPrincipal);
    }

    const savedSigTeacher = localStorage.getItem("fia_cbt_settings_signature_teacher");
    if (savedSigTeacher !== null) {
      setSignatureTeacher(savedSigTeacher);
    }

    const savedSigOfficer = localStorage.getItem("fia_cbt_settings_signature_officer");
    if (savedSigOfficer !== null) {
      setSignatureOfficer(savedSigOfficer);
    }

    const savedAnalysisMode = localStorage.getItem("fia_cbt_settings_analysis_mode");
    if (savedAnalysisMode !== null) {
      setAnalysisMode(savedAnalysisMode);
    }
  }, []);

  const handleSignatureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setSignature: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, or SVG).",
        variant: "destructive",
      });
      return;
    }

    // Limit size to ~500KB to prevent localStorage exceeding 5MB quota
    if (file.size > 500 * 1024) {
      toast({
        title: "File Too Large",
        description: "Signature image must be under 500KB to ensure smooth synchronization.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignature(event.target.result as string);
        toast({
          title: "Image Uploaded",
          description: "Signature loaded successfully. Click 'Save System Settings' to apply.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = () => {
    localStorage.setItem("fia_cbt_settings_score_format", scoreFormat);
    localStorage.setItem("fia_cbt_settings_remove_title", String(removeTitle));
    localStorage.setItem("fia_cbt_settings_report_signature", String(reportSignature));
    localStorage.setItem("fia_cbt_settings_school_motto", String(schoolMotto));
    localStorage.setItem("fia_cbt_settings_cheat_protection", String(cheatProtection));
    localStorage.setItem("fia_cbt_settings_passing_threshold", String(passingThreshold));
    localStorage.setItem("fia_cbt_settings_timer_warning", String(timerWarning));
    
    // Save custom settings
    localStorage.setItem("fia_cbt_settings_show_result_button", String(showResultButton));
    localStorage.setItem("fia_cbt_settings_hide_completed", String(hideCompleted));
    localStorage.setItem("fia_cbt_settings_signature_principal", signaturePrincipal);
    localStorage.setItem("fia_cbt_settings_signature_teacher", signatureTeacher);
    localStorage.setItem("fia_cbt_settings_signature_officer", signatureOfficer);
    localStorage.setItem("fia_cbt_settings_analysis_mode", analysisMode);

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

              {/* Allow Students to See Results Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Allow Students to View Performance Scores</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    When active, students can view their cumulative percentages, grades, and detailed question-by-question result logs.
                  </span>
                </div>
                <Switch 
                  checked={showResultButton}
                  onCheckedChange={setShowResultButton}
                />
              </div>

              {/* Hide Completed Exams Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Hide Completed Exams from Portal</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Automatically filter out and remove exam cards from the student's available exam list immediately after submission.
                  </span>
                </div>
                <Switch 
                  checked={hideCompleted}
                  onCheckedChange={setHideCompleted}
                />
              </div>

            </CardContent>
          </Card>

          {/* Official Verification Signatures & Credentials Card */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden animate-in fade-in duration-300">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
                <Printer className="h-4.5 w-4.5 text-indigo-500" /> Official Verification Signatures & Stamps
              </CardTitle>
              <CardDescription className="text-xs">Upload institutional signatures and stamps to append automatically to printed student report scorecards.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Principal Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Principal Signature</span>
                    <span className="text-xs text-slate-500 block">Appears in footer under "Principal's Stamp".</span>
                  </div>
                  <div className="space-y-3 mt-2">
                    {signaturePrincipal ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[100px]">
                        <img src={signaturePrincipal} alt="Principal Signature" className="max-h-20 max-w-full object-contain" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSignaturePrincipal("")} 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-950/80 dark:hover:bg-rose-900/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 cursor-pointer bg-slate-50/20 hover:bg-slate-50/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/50 transition-all duration-300 min-h-[100px]">
                        <Upload className="h-6 w-6 text-slate-400 mb-2 animate-bounce" />
                        <span className="text-xs font-bold text-slate-500">Upload Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleSignatureUpload(e, setSignaturePrincipal)} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Form Master / Class Teacher Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Class Teacher Signature</span>
                    <span className="text-xs text-slate-500 block">Appears in footer under "Form Master Signature".</span>
                  </div>
                  <div className="space-y-3 mt-2">
                    {signatureTeacher ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[100px]">
                        <img src={signatureTeacher} alt="Class Teacher Signature" className="max-h-20 max-w-full object-contain" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSignatureTeacher("")} 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-955/80 dark:hover:bg-rose-900/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 cursor-pointer bg-slate-50/20 hover:bg-slate-50/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/50 transition-all duration-300 min-h-[100px]">
                        <Upload className="h-6 w-6 text-slate-400 mb-2 animate-bounce" />
                        <span className="text-xs font-bold text-slate-500">Upload Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleSignatureUpload(e, setSignatureTeacher)} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Exam Officer Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Exam Officer Signature</span>
                    <span className="text-xs text-slate-500 block">Appears in footer under "Exam Officer Signature".</span>
                  </div>
                  <div className="space-y-3 mt-2">
                    {signatureOfficer ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[100px]">
                        <img src={signatureOfficer} alt="Exam Officer Signature" className="max-h-20 max-w-full object-contain" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSignatureOfficer("")} 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-955/80 dark:hover:bg-rose-900/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 cursor-pointer bg-slate-50/20 hover:bg-slate-50/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/50 transition-all duration-300 min-h-[100px]">
                        <Upload className="h-6 w-6 text-slate-400 mb-2 animate-bounce" />
                        <span className="text-xs font-bold text-slate-500">Upload Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleSignatureUpload(e, setSignatureOfficer)} 
                        />
                      </label>
                    )}
                  </div>
                </div>
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
              
              {/* Analysis Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/45 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all duration-300">
                <div className="space-y-1 pr-4">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Analytics Computation Mode</span>
                  <span className="text-xs text-slate-500 leading-relaxed block">
                    Choose whether the psychometrics engine automatically runs on page load/filter change, or runs manually when clicking "Run Analysis".
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-bold ${analysisMode === "manual" ? "text-indigo-650" : "text-slate-400"}`}>Manual</span>
                  <Switch 
                    checked={analysisMode === "automatic"}
                    onCheckedChange={(checked) => setAnalysisMode(checked ? "automatic" : "manual")}
                  />
                  <span className={`text-xs font-bold ${analysisMode === "automatic" ? "text-indigo-650" : "text-slate-400"}`}>Auto</span>
                </div>
              </div>

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
