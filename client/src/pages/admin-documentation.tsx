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
              V 5.7.4
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
              Exams can be set as **Objectives** (Multiple Choice/True-False) or **Theory** (structured essay/descriptive slot layouts). Use the subject filters to search for ready-made questions, and select checkboxes to link questions directly to the exam profile.
            </p>

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">B. Combining Multiple Exams (Consolidated Exams)</h3>
            <p>
              If a student must take multiple subjects back-to-back under a single testing session (e.g. *General Science* containing Biology, Chemistry, and Physics subsections), administrators can:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li>Create a master Exam Card named with the consolidated subject title.</li>
              <li>Filter the question bank and check boxes for questions belonging to each sub-discipline.</li>
              <li>The CBT engine will merge all selected question IDs into a single linear test map or structured outline for the candidate.</li>
            </ul>

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
              To bypass manual input, click **"Import Questions"** on the questions catalog toolbar:
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-xs block flex items-center gap-1">
                <Sparkles className="h-4 w-4 animate-pulse" /> Gemini AI Integration Engine
              </span>
              <p className="text-xs text-slate-505">
                You can toggle between the <strong>Local Regex Engine</strong> (quick parses of basic markdown lists) and <strong>Gemini AI Smart Importer</strong>. The Gemini AI engine uses Google's advanced LLM to scan, extract, and clean text documents (PDFs, Word clippings, unstructured logs) into typed questions.
              </p>
              <ul className="list-decimal pl-4.5 text-xs text-slate-505 dark:text-slate-405 space-y-1">
                <li>Paste your question text block into the importer window.</li>
                <li>Set the metadata tags: Class, Term, Subject, Exam Type.</li>
                <li>Click <strong>"Extract Questions with Gemini AI ✨"</strong>.</li>
                <li>Preview cards list in the dialog, click the <strong>Trash</strong> icon to prune bad entries, and click <strong>"Commit Questions"</strong>.</li>
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

            <h3 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 mt-4">B. Resetting Student Sessions</h3>
            <p>
              If a candidate experiences an authorized reset (e.g., student had a documented medical issue during the exam), administrators can delete or reset the exam result.
            </p>
            <p className="text-xs">
              Click the **Trash/Reset** icon next to the student's result record. This removes the final score and deletes the active exam session locks in Firestore, allowing the student to use their passcode to start the exam fresh.
            </p>
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
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
