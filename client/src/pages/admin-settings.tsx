import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SystemSettings, defaultSystemSettings, defaultGradingScale } from "@shared/schema";
import {
  Settings,
  Save,
  Printer,
  Eye,
  EyeOff,
  Layout,
  Award,
  HelpCircle,
  ShieldAlert,
  Hourglass,
  Info,
  Upload,
  Trash2,
  Building,
  GraduationCap,
  Bell,
  Database,
  Lock,
  RefreshCw,
  FileText,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load Settings from server/firestore
  const { data: serverSettings, isLoading, isError } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  // Settings state initialized with default fallback, updated once loaded
  const [formData, setFormData] = useState<SystemSettings>({ ...defaultSystemSettings });
  const [activeTab, setActiveTab] = useState<string>("general");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [changeDiff, setChangeDiff] = useState<{ field: string; from: string; to: string }[]>([]);

  // Update local state when server settings are retrieved
  useEffect(() => {
    if (serverSettings) {
      // Ensure all fields are fully populated (filling in defaults for any missing properties)
      setFormData({
        ...defaultSystemSettings,
        ...serverSettings,
      });
    }
  }, [serverSettings]);

  // Mutation for saving settings
  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: SystemSettings) => {
      return apiRequest<SystemSettings>("POST", "/api/settings", updatedSettings);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
      setFormData(data);
      // Dispatch a storage event so reactive components know settings changed locally
      window.dispatchEvent(new Event("storage"));
      
      toast({
        title: "Settings Saved Successfully",
        description: "Global CBT rules, security profiles, and school branding configurations have been updated.",
      });
      setIsConfirmOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Settings",
        description: error.message || "An unexpected error occurred while writing configurations.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Loading System Settings Configuration...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500" />
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">Settings Connection Offline</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Failed to fetch system configurations from the database.
          </p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/settings"] })} className="bg-indigo-600 hover:bg-indigo-700 font-extrabold text-white">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
        </Button>
      </div>
    );
  }

  // Handle local state updates helper
  const updateField = (key: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Image upload handler
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "schoolLogo" | "signaturePrincipal" | "signatureTeacher" | "signatureOfficer"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (PNG, JPG, SVG).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 200 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size must be under 200KB to ensure smooth database replication.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateField(fieldName, event.target.result as string);
        toast({
          title: "Image Uploaded",
          description: `${fieldName.replace(/([A-Z])/g, " $1")} loaded in memory. Save settings to apply.`,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Field validation and save trigger
  const handlePreSaveValidation = () => {
    // 1. Validations
    if (!formData.schoolName.trim()) {
      toast({ title: "Validation Error", description: "Institution Name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!formData.currentSession.trim()) {
      toast({ title: "Validation Error", description: "Current Academic Session is required (e.g. 2025/2026).", variant: "destructive" });
      return;
    }
    if (formData.defaultDuration < 1) {
      toast({ title: "Validation Error", description: "Default exam duration must be at least 1 minute.", variant: "destructive" });
      return;
    }
    if (formData.defaultAttempts < 1) {
      toast({ title: "Validation Error", description: "Default attempts must be at least 1.", variant: "destructive" });
      return;
    }
    if (formData.timerWarning < 1 || formData.timerWarning > 60) {
      toast({ title: "Validation Error", description: "Timer Warning must be between 1 and 60 minutes.", variant: "destructive" });
      return;
    }
    if (formData.conceptStrengthThreshold < 1 || formData.conceptStrengthThreshold > 100) {
      toast({ title: "Validation Error", description: "Concept Strength Threshold must be between 1% and 100%.", variant: "destructive" });
      return;
    }
    if (formData.conceptFocusThreshold < 1 || formData.conceptFocusThreshold > 100) {
      toast({ title: "Validation Error", description: "Focus Area Threshold must be between 1% and 100%.", variant: "destructive" });
      return;
    }
    if (formData.passingThreshold < 1 || formData.passingThreshold > 100) {
      toast({ title: "Validation Error", description: "Global Passing Score Fallback must be between 1% and 100%.", variant: "destructive" });
      return;
    }
    if (formData.minPasswordLength < 4) {
      toast({ title: "Validation Error", description: "Minimum password length must be at least 4.", variant: "destructive" });
      return;
    }
    if (formData.sessionTimeoutAdmin < 1 || formData.sessionTimeoutStudent < 1) {
      toast({ title: "Validation Error", description: "Session timeouts must be at least 1 minute.", variant: "destructive" });
      return;
    }

    // 2. Build the change summary/diff list
    const original = serverSettings || defaultSystemSettings;
    const diffs: { field: string; from: string; to: string }[] = [];

    const friendlyFieldNames: Record<string, string> = {
      schoolName: "Institution Name",
      schoolLogo: "Institution Logo",
      schoolAddress: "Institution Address",
      schoolContact: "Institution Contact Info",
      currentSession: "Academic Session",
      termStart: "Term Start Date",
      termEnd: "Term End Date",
      schoolMotto: "Render School Motto",
      defaultDuration: "Default Exam Duration",
      defaultAttempts: "Default Exam Attempts",
      defaultRandomizationEnabled: "Default Question Randomization",
      defaultNegativeMarkingEnabled: "Negative Marking Enabled",
      defaultNegativeMarkingValue: "Negative Marking Score Penalty",
      resultApprovalRequired: "Result Approval Workflow",
      rankingMethod: "Position Ranking Scope",
      omitExamTitles: "Omit Exam Titles on Transcripts",
      scoreFormat: "Score Output Format",
      showResultButton: "Allow Students to View Performance Scores",
      hideCompleted: "Hide Completed Exams from Portal",
      passingThreshold: "Global Passing Score Fallback",
      reportSignature: "Branded Verification Signatures",
      signaturePrincipal: "Principal Signature",
      signatureTeacher: "Class Teacher Signature",
      signatureOfficer: "Exam Officer Signature",
      minPasswordLength: "Minimum Password Length",
      passwordComplexityRequired: "Password Complexity Enforced",
      sessionTimeoutAdmin: "Admin Session Timeout",
      sessionTimeoutStudent: "Student Session Timeout",
      twoFactorAdminEnabled: "Admin 2FA Verification",
      ipWhitelist: "Admin IP Whitelist Restriction",
      emailNotificationsEnabled: "Email Notifications",
      smsNotificationsEnabled: "SMS Alerts",
      disconnectGracePeriod: "Student Offline Grace Period",
      heartbeatInterval: "Proctor Heartbeat Interval",
      tabSwitchDetectionEnabled: "Malpractice Tab-Switch Check",
      autoSubmitOnExpiryGracePeriod: "Auto-Submit Grace Window",
      dataRetentionPeriodDays: "Logs Data Retention Days",
      backupFrequency: "Data Backup Schedule",
      testModeEnabled: "Test/Demo Sandbox Mode",
      auditLogVerbosity: "Audit Log Verbosity Level",
      auditLogRetentionDays: "Audit Log Retention Days",
      analysisMode: "Analytics Computation Trigger",
      timerWarning: "Red-Alert Timer Warning Limit",
      conceptStrengthThreshold: "Psychometrics Strength Cutoff",
      conceptFocusThreshold: "Psychometrics Weakness Cutoff",
    };

    Object.keys(formData).forEach((rawKey) => {
      const key = rawKey as keyof SystemSettings;
      let fromVal = original[key];
      let toVal = formData[key];

      // Format arrays/objects for comparison
      if (typeof fromVal === "object" && fromVal !== null) {
        fromVal = JSON.stringify(fromVal);
      }
      if (typeof toVal === "object" && toVal !== null) {
        toVal = JSON.stringify(toVal);
      }

      if (fromVal !== toVal) {
        const friendlyName = friendlyFieldNames[key] || String(key);
        let fromStr = String(original[key]);
        let toStr = String(formData[key]);

        // Mask base64 strings
        if (typeof original[key] === "string" && original[key].startsWith("data:image")) {
          fromStr = "[Signature/Logo Image Present]";
        } else if (!original[key]) {
          fromStr = "[Empty]";
        }
        if (typeof formData[key] === "string" && formData[key].startsWith("data:image")) {
          toStr = "[Signature/Logo Image Present]";
        } else if (!formData[key]) {
          toStr = "[Empty]";
        }

        diffs.push({
          field: friendlyName,
          from: fromStr,
          to: toStr,
        });
      }
    });

    if (diffs.length === 0) {
      toast({
        title: "No Changes Detected",
        description: "Your local settings modifications match the current active server settings.",
      });
      return;
    }

    setChangeDiff(diffs);
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    saveMutation.mutate(formData);
  };

  // Reset current tab inputs to match server settings
  const handleDiscardChanges = () => {
    if (serverSettings) {
      setFormData({
        ...defaultSystemSettings,
        ...serverSettings,
      });
      toast({
        title: "Changes Discarded",
        description: "Settings restored to the latest values retrieved from the database.",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
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
            Manage global CBT configurations, institution branding assets, exam parameters, security defaults, and audit logs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleDiscardChanges}
            disabled={saveMutation.isPending}
            className="border-slate-200 hover:bg-slate-50 dark:border-slate-800 text-xs font-bold rounded-xl px-4"
          >
            Discard
          </Button>
          <Button
            onClick={handlePreSaveValidation}
            disabled={saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl px-5 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
          >
            <Save className="h-4 w-4" /> Save System Settings
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/40 dark:border-slate-850/40">
          <TabsTrigger value="general" className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
            <Building className="h-4 w-4" /> General & Branding
          </TabsTrigger>
          <TabsTrigger value="exams" className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
            <GraduationCap className="h-4 w-4" /> Exam & Grading
          </TabsTrigger>
          <TabsTrigger value="security" className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
            <Lock className="h-4 w-4" /> Security & Session
          </TabsTrigger>
          <TabsTrigger value="system" className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
            <Database className="h-4 w-4" /> Notifications & Ops
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: GENERAL & BRANDING ─── */}
        <TabsContent value="general" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left side parameters */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <Building className="h-4.5 w-4.5 text-blue-500" /> Institution Profile Configuration
                  </CardTitle>
                  <CardDescription className="text-xs">Configure the basic credentials of your school used for printed letterheads.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Institution Name</label>
                      <Input
                        value={formData.schoolName}
                        onChange={(e) => updateField("schoolName", e.target.value)}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-bold"
                        placeholder="Faith Immaculate Academy"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Contact Number</label>
                      <Input
                        value={formData.schoolContact || ""}
                        onChange={(e) => updateField("schoolContact", e.target.value)}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-bold"
                        placeholder="+234 800 123 4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mailing Address</label>
                    <Input
                      value={formData.schoolAddress || ""}
                      onChange={(e) => updateField("schoolAddress", e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 font-medium"
                      placeholder="123 Academy Road, Faith City"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Academic Session</label>
                      <Input
                        value={formData.currentSession}
                        onChange={(e) => updateField("currentSession", e.target.value)}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-bold"
                        placeholder="2025/2026"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Term Start Date</label>
                      <Input
                        type="date"
                        value={formData.termStart || ""}
                        onChange={(e) => updateField("termStart", e.target.value)}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Term End Date</label>
                      <Input
                        type="date"
                        value={formData.termEnd || ""}
                        onChange={(e) => updateField("termEnd", e.target.value)}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transcript Branding Toggles */}
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <Printer className="h-4.5 w-4.5 text-blue-500" /> Result Printout Layout Branding
                  </CardTitle>
                  <CardDescription className="text-xs">Adjust how candidate result sheets are customized dynamically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Render Slogan & Slogan Headers</span>
                      <span className="text-xs text-slate-500 block">Include school slogan address inside printing documents.</span>
                    </div>
                    <Switch
                      checked={formData.schoolMotto}
                      onCheckedChange={(checked) => updateField("schoolMotto", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Omit Specific Examination Title</span>
                      <span className="text-xs text-slate-500 block">Remove exam title headers on PDF scorecards for generic transcripts.</span>
                    </div>
                    <Switch
                      checked={formData.omitExamTitles}
                      onCheckedChange={(checked) => updateField("omitExamTitles", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Display Official Signatures Footer</span>
                      <span className="text-xs text-slate-500 block">Append validation fields and uploaded signature badges to reports.</span>
                    </div>
                    <Switch
                      checked={formData.reportSignature}
                      onCheckedChange={(checked) => updateField("reportSignature", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Allow Students to See Results</span>
                      <span className="text-xs text-slate-500 block">Allow students to view their exam percentages, grades, and scorecard reviews.</span>
                    </div>
                    <Switch
                      checked={formData.showResultButton}
                      onCheckedChange={(checked) => updateField("showResultButton", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Hide Completed Exams from Portal</span>
                      <span className="text-xs text-slate-500 block">Remove exam cards from the student portal dashboard after submission.</span>
                    </div>
                    <Switch
                      checked={formData.hideCompleted}
                      onCheckedChange={(checked) => updateField("hideCompleted", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* School Logo upload card */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col justify-between h-full">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                    <Layout className="h-4.5 w-4.5 text-blue-500" /> School Logo Emblem
                  </CardTitle>
                  <CardDescription className="text-xs">Upload school emblem for documents.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 flex-grow space-y-4">
                  {formData.schoolLogo ? (
                    <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center h-48 w-full">
                      <img src={formData.schoolLogo} alt="School Logo" className="max-h-full max-w-full object-contain" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => updateField("schoolLogo", "")}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-950 dark:hover:bg-rose-900"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 cursor-pointer bg-slate-50/20 hover:bg-slate-50/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/50 transition-all duration-300 w-full h-48">
                      <Upload className="h-8 w-8 text-slate-400 mb-3 animate-bounce" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Upload Logo</span>
                      <span className="text-[10px] text-slate-400 mt-1">PNG, JPG or SVG (Max 200KB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "schoolLogo")}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Verification Signatures Card */}
          {formData.reportSignature && (
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden animate-in fade-in duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Printer className="h-4.5 w-4.5 text-blue-500" /> Verification Signature Files
                </CardTitle>
                <CardDescription className="text-xs">Upload official digital signatures which will be rendered in the document footer.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3 pt-4">
                {/* Principal Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Principal Signature</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Under "Principal's Signature"</span>
                  </div>
                  <div className="mt-2">
                    {formData.signaturePrincipal ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[90px]">
                        <img src={formData.signaturePrincipal} alt="Principal Signature" className="max-h-16 max-w-full object-contain" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateField("signaturePrincipal", "")}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-4 cursor-pointer min-h-[90px] text-center bg-slate-50/20">
                        <Upload className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-500">Upload PNG</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "signaturePrincipal")} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Class Teacher Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Class Teacher Signature</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Under "Form Master Signature"</span>
                  </div>
                  <div className="mt-2">
                    {formData.signatureTeacher ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[90px]">
                        <img src={formData.signatureTeacher} alt="Teacher Signature" className="max-h-16 max-w-full object-contain" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateField("signatureTeacher", "")}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-4 cursor-pointer min-h-[90px] text-center bg-slate-50/20">
                        <Upload className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-500">Upload PNG</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "signatureTeacher")} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Exam Officer Signature */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Exam Officer Signature</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Under "Exam Officer Signature"</span>
                  </div>
                  <div className="mt-2">
                    {formData.signatureOfficer ? (
                      <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[90px]">
                        <img src={formData.signatureOfficer} alt="Officer Signature" className="max-h-16 max-w-full object-contain" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateField("signatureOfficer", "")}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-4 cursor-pointer min-h-[90px] text-center bg-slate-50/20">
                        <Upload className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-500">Upload PNG</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "signatureOfficer")} />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TAB 2: EXAM & GRADING ─── */}
        <TabsContent value="exams" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-indigo-650" />
              <CardHeader>
                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4.5 w-4.5 text-emerald-500" /> General Exam Templates & Rules
                </CardTitle>
                <CardDescription className="text-xs">Specify default conditions for creating new examinations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Default Duration</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={formData.defaultDuration}
                        onChange={(e) => updateField("defaultDuration", Number(e.target.value))}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-extrabold text-right"
                      />
                      <span className="text-xs font-bold text-slate-450">Min</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Default Allowed Attempts</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.defaultAttempts}
                      onChange={(e) => updateField("defaultAttempts", Number(e.target.value))}
                      className="rounded-xl border-slate-200 dark:border-slate-800 font-extrabold text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Default Question Randomization</span>
                    <span className="text-xs text-slate-500 block">Exams randomize questions by default.</span>
                  </div>
                  <Switch
                    checked={formData.defaultRandomizationEnabled}
                    onCheckedChange={(checked) => updateField("defaultRandomizationEnabled", checked)}
                  />
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Default Negative Marking</span>
                      <span className="text-xs text-slate-500 block">Deduct points from total score for incorrect answers.</span>
                    </div>
                    <Switch
                      checked={formData.defaultNegativeMarkingEnabled}
                      onCheckedChange={(checked) => updateField("defaultNegativeMarkingEnabled", checked)}
                    />
                  </div>

                  {formData.defaultNegativeMarkingEnabled && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 animate-in slide-in-from-top-2 duration-300">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Penalty value per incorrect answer</span>
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.defaultNegativeMarkingValue}
                          onChange={(e) => updateField("defaultNegativeMarkingValue", Number(e.target.value))}
                          className="rounded-xl border-slate-200 dark:border-slate-800 font-extrabold text-right"
                        />
                        <span className="text-xs font-bold text-slate-400">Pts</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-teal-500 to-indigo-650" />
              <CardHeader>
                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-teal-500" /> Result & Grading Workflows
                </CardTitle>
                <CardDescription className="text-xs">Adjust how student scores are processed and published.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Position Calculation Method</label>
                  <Select
                    value={formData.rankingMethod}
                    onValueChange={(val) => updateField("rankingMethod", val)}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-850">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="class-wide">Class-wide (Across all subjects)</SelectItem>
                      <SelectItem value="subject-wide">Subject-wide (Ranked within exam variants)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-105 dark:border-slate-800/40 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Require Result Approval Workflow</span>
                    <span className="text-xs text-slate-500 block">Auto-publish vs. Requires admin sign-off before student reviews.</span>
                  </div>
                  <Switch
                    checked={formData.resultApprovalRequired}
                    onCheckedChange={(checked) => updateField("resultApprovalRequired", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Score Output Format</span>
                    <Select
                      value={formData.scoreFormat}
                      onValueChange={(val) => updateField("scoreFormat", val)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-[11px] rounded-lg border-slate-200 dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="points">Raw Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Pass Fallback</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.passingThreshold}
                        onChange={(e) => updateField("passingThreshold", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800 p-1"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Strength Cutoff</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.conceptStrengthThreshold}
                        onChange={(e) => updateField("conceptStrengthThreshold", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800 p-1"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Focus Cutoff</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.conceptFocusThreshold}
                        onChange={(e) => updateField("conceptFocusThreshold", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800 p-1"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editable Grade Boundaries Scale */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-indigo-500" /> Grade Boundary Scale Configuration
              </CardTitle>
              <CardDescription className="text-xs">Modify minimum and maximum percentages assigned to letter grades globally.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 uppercase tracking-widest font-black">
                      <th className="py-2.5 px-4">Letter Grade</th>
                      <th className="py-2.5 px-4 text-center">Minimum Threshold (%)</th>
                      <th className="py-2.5 px-4 text-center">Maximum Cutoff (%)</th>
                      <th className="py-2.5 px-4 text-center">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.defaultGradingScale || defaultGradingScale).map((scaleItem, idx) => {
                      const isValid = scaleItem.minScore <= scaleItem.maxScore && scaleItem.minScore >= 0 && scaleItem.maxScore <= 100;
                      return (
                        <tr key={scaleItem.grade} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-black text-slate-700 dark:text-slate-300 text-sm">{scaleItem.grade}</td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={scaleItem.minScore}
                              onChange={(e) => {
                                const newScale = [...(formData.defaultGradingScale || defaultGradingScale)];
                                newScale[idx].minScore = Math.max(0, Math.min(100, Number(e.target.value)));
                                updateField("defaultGradingScale", newScale);
                              }}
                              className="h-8 max-w-[120px] mx-auto rounded-lg text-right font-bold text-xs"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={scaleItem.maxScore}
                              onChange={(e) => {
                                const newScale = [...(formData.defaultGradingScale || defaultGradingScale)];
                                newScale[idx].maxScore = Math.max(0, Math.min(100, Number(e.target.value)));
                                updateField("defaultGradingScale", newScale);
                              }}
                              className="h-8 max-w-[120px] mx-auto rounded-lg text-right font-bold text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isValid ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-450 font-bold text-[10px]">
                                Valid Scale Range
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-955/30 dark:text-rose-400 font-bold text-[10px]">
                                Invalid Cutoffs
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: SECURITY & SESSION RULES ─── */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Session limits */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-indigo-650" />
              <CardHeader>
                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Lock className="h-4.5 w-4.5 text-amber-500" /> Authentication & Credential Policies
                </CardTitle>
                <CardDescription className="text-xs">Enforce strict credentials rules for administrator and candidate profiles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Min Password Length</label>
                    <Input
                      type="number"
                      min="4"
                      value={formData.minPasswordLength}
                      onChange={(e) => updateField("minPasswordLength", Number(e.target.value))}
                      className="rounded-xl border-slate-200 dark:border-slate-800 font-extrabold text-right"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">IP Access Whitelist</label>
                    <Input
                      value={formData.ipWhitelist || ""}
                      onChange={(e) => updateField("ipWhitelist", e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 font-medium"
                      placeholder="e.g. 192.168.1.1, 10.0.0.*"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Enforce Complex Password Rules</span>
                    <span className="text-xs text-slate-500 block">Require mixed characters, symbols, and numbers on user passwords.</span>
                  </div>
                  <Switch
                    checked={formData.passwordComplexityRequired}
                    onCheckedChange={(checked) => updateField("passwordComplexityRequired", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Two-Factor Admin Login Verification</span>
                    <span className="text-xs text-slate-500 block">Request verification codes for admin logins.</span>
                  </div>
                  <Switch
                    checked={formData.twoFactorAdminEnabled}
                    onCheckedChange={(checked) => updateField("twoFactorAdminEnabled", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Admin Session Expire</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        value={formData.sessionTimeoutAdmin}
                        onChange={(e) => updateField("sessionTimeoutAdmin", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs text-slate-450 font-bold">Min</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Student Portal Timeout</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        value={formData.sessionTimeoutStudent}
                        onChange={(e) => updateField("sessionTimeoutStudent", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs text-slate-450 font-bold">Min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proctoring behavior */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-red-500 to-indigo-650" />
              <CardHeader>
                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500" /> Exam Session & Malpractice Proctoring
                </CardTitle>
                <CardDescription className="text-xs">Adjust how student portal locks down and monitors active assessments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Tab-Switch Malpractice Alert</span>
                    <span className="text-xs text-slate-500 block">Track and lock session when candidate exits active tab during exam.</span>
                  </div>
                  <Switch
                    checked={formData.tabSwitchDetectionEnabled}
                    onCheckedChange={(checked) => updateField("tabSwitchDetectionEnabled", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Heartbeat Packet Ping</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        value={formData.heartbeatInterval}
                        onChange={(e) => updateField("heartbeatInterval", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs text-slate-450 font-bold">Sec</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Disconnect Flag Grace</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        value={formData.disconnectGracePeriod}
                        onChange={(e) => updateField("disconnectGracePeriod", Number(e.target.value))}
                        className="h-8 rounded-lg text-right text-xs font-bold border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs text-slate-450 font-bold">Sec</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Auto-Submit Expiry Behavior</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Provide grace duration (in seconds) to submit final questions.</span>
                    <div className="flex items-center gap-2 max-w-[120px]">
                      <Input
                        type="number"
                        min="0"
                        value={formData.autoSubmitOnExpiryGracePeriod}
                        onChange={(e) => updateField("autoSubmitOnExpiryGracePeriod", Number(e.target.value))}
                        className="rounded-xl border-slate-200 dark:border-slate-800 font-extrabold text-right"
                      />
                      <span className="text-xs font-bold text-slate-400">Sec</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 4: NOTIFICATIONS & MAINTENANCE ─── */}
        <TabsContent value="system" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* Notification templates */}
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-650" />
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <Bell className="h-4.5 w-4.5 text-violet-500" /> Messaging & Alert Customization
                  </CardTitle>
                  <CardDescription className="text-xs">Configure notifications triggers and personalize messages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Notifications</span>
                      <Switch
                        checked={formData.emailNotificationsEnabled}
                        onCheckedChange={(checked) => updateField("emailNotificationsEnabled", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">SMS Notifications</span>
                      <Switch
                        checked={formData.smsNotificationsEnabled}
                        onCheckedChange={(checked) => updateField("smsNotificationsEnabled", checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-800/60">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Exam Published Alert Template</span>
                        <span className="text-[10px] text-indigo-500 font-bold">Variables: {"{examTitle}"}, {"{classLevel}"}, {"{duration}"}</span>
                      </div>
                      <Textarea
                        rows={2}
                        value={formData.notificationTemplates?.examPublished || ""}
                        onChange={(e) => {
                          const updated = { ...formData.notificationTemplates, examPublished: e.target.value };
                          updateField("notificationTemplates", updated);
                        }}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Results Released Alert Template</span>
                        <span className="text-[10px] text-indigo-500 font-bold">Variables: {"{examTitle}"}</span>
                      </div>
                      <Textarea
                        rows={2}
                        value={formData.notificationTemplates?.resultsReleased || ""}
                        onChange={(e) => {
                          const updated = { ...formData.notificationTemplates, resultsReleased: e.target.value };
                          updateField("notificationTemplates", updated);
                        }}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit settings */}
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-violet-500" /> System Audits & Diagnostic Logging
                  </CardTitle>
                  <CardDescription className="text-xs">Adjust how user activity logging compiles in the database.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Audit Log Verbosity</label>
                      <Select
                        value={formData.auditLogVerbosity}
                        onValueChange={(val) => updateField("auditLogVerbosity", val)}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (Auth, Exam Actions)</SelectItem>
                          <SelectItem value="verbose">Verbose (Includes Student Heartbeats)</SelectItem>
                          <SelectItem value="debug">Debug (All queries & REST payload traces)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Log Purge Schedule</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={formData.auditLogRetentionDays}
                          onChange={(e) => updateField("auditLogRetentionDays", Number(e.target.value))}
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-right font-extrabold"
                        />
                        <span className="text-xs font-bold text-slate-450">Days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ops and Backups */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden h-full flex flex-col justify-between">
                <div>
                  <div className="h-2 bg-gradient-to-r from-pink-500 to-indigo-650" />
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                      <Database className="h-4.5 w-4.5 text-pink-500" /> Database Ops & Backups
                    </CardTitle>
                    <CardDescription className="text-xs">Configure database retention policies.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Results Retention Purge</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={formData.dataRetentionPeriodDays}
                          onChange={(e) => updateField("dataRetentionPeriodDays", Number(e.target.value))}
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-right font-extrabold text-xs"
                        />
                        <span className="text-xs text-slate-450 font-bold">Days</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Backup Frequency</label>
                      <Select
                        value={formData.backupFrequency}
                        onValueChange={(val) => updateField("backupFrequency", val)}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily Auto-Backup</SelectItem>
                          <SelectItem value="weekly">Weekly Auto-Backup</SelectItem>
                          <SelectItem value="monthly">Monthly Auto-Backup</SelectItem>
                          <SelectItem value="none">Disabled (No Backup)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 mt-4">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">Test Sandbox Mode</span>
                        <span className="text-[10px] text-slate-400 block">Isolate fake QA attempts from reports.</span>
                      </div>
                      <Switch
                        checked={formData.testModeEnabled}
                        onCheckedChange={(checked) => updateField("testModeEnabled", checked)}
                      />
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── CONFIRMATION & DIFF DIALOG ─── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-indigo-500" /> Confirm Settings Modifications
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please review the summary of changes before they are committed to the central database:
            </DialogDescription>
          </DialogHeader>

          {/* Diff list representation */}
          <div className="my-4 max-h-60 overflow-y-auto space-y-3 pr-2 border-y border-slate-100 dark:border-slate-800/80 py-4">
            {changeDiff.map((diffItem, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block">{diffItem.field}</span>
                <div className="grid grid-cols-2 gap-2 text-slate-500 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Previous</span>
                    <span className="font-medium line-through decoration-rose-500/50 block truncate">{diffItem.from}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 uppercase font-bold block">Updated</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{diffItem.to}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl px-5"
            >
              {saveMutation.isPending ? "Saving..." : "Confirm & Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
