import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Sparkles, FileText, HelpCircle, BarChart3, GraduationCap, 
  TrendingUp, Settings, PlusCircle, Download, AlertTriangle, Play, CheckCircle, Info 
} from "lucide-react";

export default function AdminDocumentation() {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", title: "1. Introduction", icon: BookOpen },
    { id: "examination", title: "2. Examination Control", icon: FileText },
    { id: "questionbank", title: "3. Question Bank", icon: HelpCircle },
    { id: "results", title: "4. Results Handling", icon: BarChart3 },
    { id: "students", title: "5. Student Registration", icon: GraduationCap },
    { id: "analysis", title: "6. Cognitive Analytics", icon: TrendingUp },
    { id: "changelog", title: "7. System Release History", icon: Info },
  ];

  const handleScroll = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500 max-w-6xl">
      
      {/* Anchored Documentation Navigation Sidebar */}
      <div className="w-full md:w-64 shrink-0 md:sticky md:top-24 h-fit space-y-4">
        <div className="bg-glass border border-slate-100 dark:border-slate-800/80 p-4.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 px-2">
            <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Manual Sections
            </span>
          </div>
          <nav className="space-y-1">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleScroll(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-300
                    ${isActive 
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
                    }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-500" : "text-slate-400"}`} />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Version Banner */}
        <div className="p-4 bg-gradient-to-tr from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl text-white border border-indigo-950 shadow-md">
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">cbt admin engine</span>
          <h4 className="text-sm font-black mt-1">Faith Immaculate Academy</h4>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-indigo-300 font-bold">Active Build</span>
            <Badge className="bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 font-black border border-indigo-500/20 text-[10px] py-0.5 px-2">
              V 5.7.9
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-12 pb-24">
        
        {/* Title Header */}
        <div className="bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Support documentation</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
              CBT Operations Manual
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
              Comprehensive administrator reference guide outlining examination controls, importing questions, and analyzing cognitive indicators.
            </p>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <section id="intro" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-100">1. Introduction to the CBT System</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <p>
              The Faith Immaculate Academy Computer-Based Testing (CBT) portal is built on a modern **offline-first cloud-synchronized database structure**. It integrates client-side local caching with real-time Google Firestore collections.
            </p>
            <p>
              This ensures that student exam progress is continuously saved to the client browser's local state, protecting against sudden electrical grid interruptions, local area network disruptions, or internet connectivity issues. If a student loses their connection mid-exam, the CBT client shifts seamlessly into offline operation, storing answers and tracking timing locally until connection returns.
            </p>

            {/* System Workflow Visual Diagram */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 my-6 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block mb-4 text-center">System Integration & Data Flow Diagram</span>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* Step 1: Input Sources */}
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col items-center text-center">
                  <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">1. Ingestion Sources</span>
                  <p className="text-[10px] text-slate-500 mt-1">Manual input or unstructured .docx/.txt uploads</p>
                </div>

                {/* Arrow / Line */}
                <div className="hidden md:flex justify-center text-slate-300 dark:text-slate-700">
                  <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                {/* Step 2: Processing AI */}
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col items-center text-center">
                  <div className="h-9 w-9 rounded-full bg-pink-50 dark:bg-pink-950/60 flex items-center justify-center text-pink-500 mb-2">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">2. Smart Importer</span>
                  <p className="text-[10px] text-slate-500 mt-1">Gemini AI parses text using structured JSON schema</p>
                </div>

                {/* Arrow / Line */}
                <div className="hidden md:flex justify-center text-slate-300 dark:text-slate-700">
                  <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                {/* Step 3: Local Caching & Sync */}
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col items-center text-center">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-500 mb-2">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">3. Local Sync & Db</span>
                  <p className="text-[10px] text-slate-500 mt-1">Saves to IndexedDB local cache & syncs to Firestore</p>
                </div>
              </div>

              <div className="flex justify-center my-4 text-slate-300 dark:text-slate-700">
                <svg className="w-6 h-6 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">A. Multi-Subject CBT Session</span>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Splits session workspace into layout sections. Real-time question navigation sidebar tracks completions and indicators per subject.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-md bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">B. O(N) Cognitive Analytics</span>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Processes raw test submissions into psychometric averages, Item Difficulty (P-Index), Discrimination (D-Index), and telemetry speed guessing flags.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-md bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-500">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">C. Diagnostic Study Guides</span>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Compares student strengths against cohort mastery indices (radar charts) and compiles print-ready A4 Diagnostic study plans.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <Card className="border border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm rounded-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Robust Offline Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs">
                  Student sessions auto-save answers locally. Submission routines race against network connection timers and fall back to cache if firebase takes over 10 seconds.
                </CardContent>
              </Card>

              <Card className="border border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm rounded-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" /> Psychometric Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs">
                  Features a server-side statistical module that analyzes responses to compute Item Difficulty (P-Index) and Item Discrimination (D-Index) indicators.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 2: Examination */}
        <section id="examination" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">2. Examination Setup & Controls</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">A. Creating & Editing Examinations</h3>
            <p>
              To create an exam, navigate to the **Exams** tab in the administrator console and click **"Create Exam Card"**. Give the exam an accurate name (e.g., *SS3 Physics - Term 3*), specify the duration in minutes, select the target class level, and set the target term.
            </p>
            <p>
              Exams can be set as **Objectives** (Multiple Choice/True-False) or **Theory** (structured essay/descriptive slot layouts).
            </p>
            <div className="p-3 bg-indigo-50/50 dark:bg-slate-900 rounded-xl border border-indigo-100/30 dark:border-slate-800 flex gap-3 text-xs">
              <Info className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <span className="font-extrabold text-indigo-800 dark:text-indigo-400 block">Interactive Question Bank Linker:</span>
                Instead of simple manual input, you can browse questions inline directly within the exam view using the embedded **Question Bank Linker**. It queries questions matching the class, term, and subject automatically. Admins can search keywords, filter, and link/unlink questions singly or in bulk using the "Select All" / "Clear All" shortcuts.
              </div>
            </div>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">B. Combining Multiple Exams (Consolidated / Multi-Subject Exams)</h3>
            <p>
              If a student must take multiple subjects back-to-back under a single testing session (e.g. *Science Block* containing Biology, Chemistry, and Physics subsections), administrators can select questions belonging to different subjects.
            </p>
            <div className="p-3 bg-emerald-50/50 dark:bg-slate-900 rounded-xl border border-emerald-100/30 dark:border-slate-800 flex gap-3 text-xs">
              <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-extrabold text-emerald-800 dark:text-emerald-400 block">Smart Multi-Subject Sidebar UI (Student Workspace):</span>
                If the exam contains multiple subjects, the student workspace automatically adapts to a responsive 12-column split-grid layout:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Sidebar Subject Selector:</strong> Renders on the left side, allowing students to select which subject section to take first.</li>
                  <li><strong>Progress Counters:</strong> Shows live tracking of answered questions per subject (e.g., <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">15/20 Completed</code>).</li>
                  <li><strong>Completion Indicators:</strong> Displays visual green checkmark tags for completed sections.</li>
                  <li><strong>Filtered Navigation:</strong> The numeric question index map displays only the active subject's questions, reducing clutter.</li>
                </ul>
              </div>
            </div>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">C. Activating & Deactivating Exams (Switching On/Off)</h3>
            <p>
              Exams have an **"Active Status"** toggle switch.
            </p>
            <div className="p-3 bg-amber-50/50 dark:bg-amber-955/10 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <span className="font-extrabold text-amber-800 dark:text-amber-300 block">Security Protocol:</span>
                Inactive exams are hidden from the student portal. Turn exams **"ON"** only when candidates sit at their testing terminals, and switch them **"OFF"** immediately once the testing block completes.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Question Bank */}
        <section id="questionbank" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <HelpCircle className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">3. Question Bank & Smart Importer</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">A. Manual Question Entry</h3>
            <p>
              Inside the **Questions** tab, click **"Add Single Question"** to open the card designer. Select the question type:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Multiple Choice:</strong> Input 4 choices and click the radio option next to the correct answer.</li>
              <li><strong>True/False:</strong> Select the default correct state (True or False).</li>
              <li><strong>Short Answer / Theory:</strong> Input the grading outline (correct key phrase criteria).</li>
            </ul>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">B. AI-Powered Smart Question Importer</h3>
            <p>
              To bypass tedious manual inputs, administrators can leverage the advanced **Smart Question Importer**:
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block flex items-center gap-1">
                <Sparkles className="h-4 w-4 animate-pulse" /> Gemini AI Document Ingestion Engine
              </span>
              <p className="text-xs text-slate-505">
                The smart importer supports **direct file uploads** as well as raw text copy-pasting. Teachers can upload Microsoft Word (`.docx`) exam papers or text files (`.txt`).
              </p>
              <ul className="list-decimal pl-4.5 text-xs text-slate-505 dark:text-slate-405 space-y-1">
                <li><strong>Raw Extraction:</strong> If a `.docx` file is selected, the server uses <code>mammoth.js</code> to extract clean text.</li>
                <li><strong>Structured AI Parsing:</strong> The text is submitted to Google Gemini API using structured JSON schemas, which extract question texts, options, difficulty indices, correct answers, and marks.</li>
                <li><strong>Validation Grid Editor:</strong> Before items are written to Firestore, they are rendered in an interactive dialog list. Here, instructors can view parsed values, click inputs to edit text or adjust fields, use the trash button to prune items, and confirm validation.</li>
                <li><strong>Database Batch Write:</strong> Clicking <strong>"Commit Questions"</strong> performs a clean batch write to update the catalog.</li>
              </ul>
            </div>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">C. Question Filters (Class, Term Cards)</h3>
            <p>
              The Question Bank toolbar displays real-time filtering count badges. Click on a specific **Class Level** (e.g. JS1, SS3) or **Term filter** (e.g. First, Third) to instantly isolate questions. This prevents editing duplicate items across classrooms.
            </p>
          </div>
        </section>

        {/* Section 4: Results */}
        <section id="results" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">4. Results Log & Score Reporting</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">A. Sorting & Searching Results</h3>
            <p>
              The **Results** page houses the master exam logs. Use the search field to locate student records by passcode, name, or exam subject. You can sort the tables by:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500">
              <li><strong>Date Submitted:</strong> Latest scores appear at the top.</li>
              <li><strong>Score Percentage:</strong> Ascending or descending order.</li>
              <li><strong>Status:</strong> Isolate Passed vs Failed student attempts.</li>
            </ul>

            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-200 mt-4">B. Resetting Student Sessions</h3>
            <p>
              If a candidate experiences an authorized reset (e.g., student had a documented medical issue during the exam), administrators can delete or reset the exam result.
            </p>
            <p className="text-xs">
              Click the **Trash/Reset** icon next to the student's result record. This removes the final score and deletes the active exam session locks in Firestore, allowing the student to use their passcode to start the exam fresh.
            </p>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">C. Score Sheets & Printable AI-Driven Study Guides</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2 text-xs">
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block flex items-center gap-1">
                <Download className="h-4 w-4" /> Score sheets & Consolidated Broadsheets
              </span>
              <p>
                From the Results dashboard, admins can search, filter, and batch print scores.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Result View Toggles:</strong> Go to settings to toggle whether scores render as raw points (e.g., <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">42</code>) or percentages (e.g., <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">84%</code>) on final exports. Admins can also toggle the visibility of the examination titles.</li>
                <li><strong>Consolidated PDF Broadsheet:</strong> Generate batch downloads for an entire class or department filtered by exam.</li>
                <li><strong>A4 Printable Diagnostic Study Guide:</strong> Inside any student result view, clicking <strong>"Print Study Guide"</strong> compiles a customized A4-formatted PDF. It includes cognitive timelines, strength highlights, focus area items, and a structured study timeline mapped by the system's psychometrics.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5: Student Registration */}
        <section id="students" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">5. Student Profiles & Registrations</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">A. Student Registration Models</h3>
            <p>
              To add candidates to the school roster, navigate to the **Students** tab. You can register students using two options:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Single Registry:</strong> Click <strong>"Add Student"</strong>, enter their name, gender, class level, department (Science, Arts, Commercial, or General), and assign a secure passcode.</li>
              <li><strong>Bulk Import (CSV/Excel):</strong> Click <strong>"Bulk Registry"</strong>, download the excel layout template, fill out student details, and drop the completed file. The app automatically compiles and saves all student profiles to Firestore.</li>
            </ul>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">B. Student Profile & Exam Logs</h3>
            <p>
              Clicking a student's row opens their **Individual Profile Screen**. Here you can inspect their gender, class, passcode, overall average grade, pass rate, and full chronological test history with detailed scorecards.
            </p>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">C. Exam-Specific Blocking Toggles</h3>
            <p>
              To prevent a specific student from entering a particular test (e.g. due to class discrepancies or unpaid fees), admins can manage exam blocks:
            </p>
            <p className="text-xs">
              Open the student's profile, scroll to the **Active Exam Permissions** list, and toggle the lock switch next to the specific examination. When locked, that student will receive a blocked notification if they attempt to open the test from their portal.
            </p>
          </div>
        </section>

        {/* Section 6: Analytics */}
        <section id="analysis" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">6. Cognitive Analytics Engine</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <p>
              The **FIA CBT Psychometric Engine** automatically processes all submitted examination answers, calculating diagnostic indicators for cognitive evaluation.
            </p>

            <div className="space-y-4 mt-2">
              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">A. Difficulty Index (P-Index)</span>
                <p className="text-xs leading-relaxed text-slate-500">
                  Calculates the proportion of students who answered a specific question correctly.
                </p>
                <div className="text-[11px] font-bold text-slate-455 pt-1.5 flex flex-wrap gap-4">
                  <span>🔴 Hard: P-Index &lt; 0.30</span>
                  <span>🟢 Sweet Spot: 0.30 &le; P-Index &le; 0.70</span>
                  <span>🔵 Easy: P-Index &gt; 0.70</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">B. Discrimination Index (D-Index)</span>
                <p className="text-xs leading-relaxed text-slate-500">
                  Measures the difference between the correct response rate of high-performing students (top 27% cohort) versus low-performing students (bottom 27% cohort).
                </p>
                <div className="text-[11px] font-bold text-slate-455 pt-1.5 flex flex-wrap gap-4">
                  <span>🟢 Positive Discrimination (&gt; 0.20): Question successfully differentiates skilled candidates.</span>
                  <span>🟡 Flawed / Weak (&le; 0.20): Indicates potential phrasing ambiguity.</span>
                  <span>🔴 Negative Discrimination (&lt; 0): Low-performing students scored higher than high-performers, indicating key errors.</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">C. Speed Guessing Flags</span>
                <p className="text-xs leading-relaxed text-slate-500">
                  Tracks telemetry pacing parameters. If a student checks a question and logs an answer in **under 4 seconds**, the system flags this as speed guessing, indicating pacing issues, disengagement, or possible collusion.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">D. Topic Mastery & Grade Curves</span>
                <p className="text-xs leading-relaxed text-slate-505">
                  Aggregates student response metrics to trace overall mastery vectors by subject and plots a standardized bell curve of all examination results.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">E. Cohort Benchmarks & Academic Trajectories</span>
                <p className="text-xs leading-relaxed text-slate-500">
                  Student Profiles integrate Recharts visualizers to detail cohort status:
                </p>
                <ul className="list-disc pl-5 text-[11px] text-slate-500 space-y-0.5">
                  <li><strong>Cohort Mastery Radar Chart:</strong> Direct comparison mapping student scores against the class/department average across subjects to highlight learning gaps.</li>
                  <li><strong>Historical Trajectory Area Graph:</strong> A chronologically plotted area graph tracking score variance and learning growth curves over terms.</li>
                </ul>
              </div>

              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/25 dark:border-indigo-900/20 space-y-1">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block uppercase">F. High-Performance Calculations</span>
                <p className="text-xs leading-relaxed text-slate-550">
                  Dashboard charts run on highly-optimized <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">O(N)</code> Map-based calculations. By replacing nested linear iteration loops with hash maps, analytical charts render instantly even with large sets of school data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Release History */}
        <section id="changelog" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <Info className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100">7. System Release & Build History</h2>
          </div>
          
          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <p>
              The build pipeline history details cumulative releases and functional updates retrieved from the repository push logs:
            </p>

            <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6 space-y-8 ml-2 mt-4">
              {/* Release v5.7.9 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-950">
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Build v5.7.9 <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Active Build</Badge>
                  </h3>
                  <span className="text-xs font-bold text-slate-400">June 2026</span>
                </div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">Candidate Security, Result Controls & Signatures</p>
                <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li><strong>Exam Re-attempt Lockout:</strong> Enforces zero-latency local storage locking hooks (`fia_submitted_exam_*`) to block student re-entry on form submits.</li>
                  <li><strong>Verification Signatures:</strong> Dynamic settings uploads for Principal, Class Teacher, and Exam Officer Base64 signatures.</li>
                  <li><strong>Print Verification:</strong> Embedded high-resolution verification signatures on official printed student report scorecards.</li>
                  <li><strong>Result Visibility Toggle:</strong> Dynamic admin controls toggling candidate access to Performance Sheets.</li>
                </ul>
              </div>

              {/* Release v5.7.7 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/50 ring-4 ring-white dark:ring-slate-950">
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Build v5.7.7
                  </h3>
                  <span className="text-xs font-bold text-slate-400">May 2026</span>
                </div>
                <p className="text-xs font-semibold text-indigo-650 dark:text-indigo-405 mt-0.5">Left-side Multi-subject Navigation Panel & Serverless Optimization</p>
                <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li><strong>Multi-subject Testing Sidebar:</strong> Added a sleek left-side subject navigation bar inside exam sessions to allow candidates to swap active exam sheets.</li>
                  <li><strong>Vercel ESM Bundling:</strong> Resolved serverless path loading bugs via a custom script compile tool using `esbuild`.</li>
                  <li><strong>Active/Inactive Filter:</strong> Injected filter controls into the Examination Management Board to filter active/inactive exams.</li>
                  <li><strong>Documentation Uplift:</strong> Rebuilt the system operations manual to reflect active configurations.</li>
                </ul>
              </div>

              {/* Release v5.7.4 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/30 ring-4 ring-white dark:ring-slate-950">
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Build v5.7.4
                  </h3>
                  <span className="text-xs font-bold text-slate-400">April 2026</span>
                </div>
                <p className="text-xs font-semibold text-indigo-600/75 dark:text-indigo-400/80 mt-0.5">Firebase Analytics, Profile Charts & UI/UX Revamp</p>
                <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li><strong>Visual Trajectory Models:</strong> Integrated Recharts analytics for cohort master comparison radar charts and historical performance grids.</li>
                  <li><strong>Telemetry Pacing:</strong> Added telemetry filters to track speeding flags and suspicious student paces under 4 seconds.</li>
                  <li><strong>UI UX Overhaul:</strong> Revamped Admin Portal Dashboards with an integrated dark mode theme selector.</li>
                </ul>
              </div>

              {/* Release v5.2.0 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/20 ring-4 ring-white dark:ring-slate-950">
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Build v5.2.0
                  </h3>
                  <span className="text-xs font-bold text-slate-400">March 2026</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 mt-0.5">Smart Question Parser & Report Printers</p>
                <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li><strong>Fia Smart Importer:</strong> Implemented a parser to bulk import exam questions from Word `.docx` documents.</li>
                  <li><strong>Consolidated Portfolios:</strong> Enabled multi-exam score printing and cumulative academic standing metrics.</li>
                </ul>
              </div>

              {/* Release v1.0.0 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/10 ring-4 ring-white dark:ring-slate-950">
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Build v1.0.0
                  </h3>
                  <span className="text-xs font-bold text-slate-400">January 2026</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 mt-0.5">Foundation CBT Architecture</p>
                <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li><strong>Authentication Core:</strong> Secured administrator access paths and simple candidate login gates.</li>
                  <li><strong>Exam Session:</strong> Created test timers and Firestore result storage integrations.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
