import React from 'react';
import { Printer, BookOpen, AlertCircle, Compass, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { Student } from "@shared/schema";

interface PrintStudyGuideTemplateProps {
    student: Student;
    averageScore: number;
    strengths: string[];
    weaknesses: string[];
    diagnosis: string;
    actionPlan: string[];
    onPrint?: () => void;
    showPrintButton?: boolean;
}

export const PrintStudyGuideTemplate: React.FC<PrintStudyGuideTemplateProps> = ({
    student,
    averageScore,
    strengths,
    weaknesses,
    diagnosis,
    actionPlan,
    onPrint,
    showPrintButton = true
}) => {
    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    // Formatted textbook suggestions based on standard Nigerian curriculum
    const getTextbookSuggestion = (subjectName: string) => {
        const nameLower = subjectName.toLowerCase();
        if (nameLower.includes("math") || nameLower.includes("arithmetic")) {
            return {
                title: "New General Mathematics (NGM) / Essential Mathematics",
                focus: "Quadratic Equations, Algebra Factorization, Trigonometry, and Word Problems",
                exercise: "Solve all practice exercises in Chapter 4 and Chapter 7."
            };
        }
        if (nameLower.includes("english") || nameLower.includes("literature")) {
            return {
                title: "Excellence in English for Secondary Schools",
                focus: "Concord Rules, Active/Passive Voice, Essay Formats, and Comprehension Passages",
                exercise: "Draft one narrative essay weekly and review vocabulary drills in Chapter 9."
            };
        }
        if (nameLower.includes("physics")) {
            return {
                title: "New School Physics for Senior Secondary Schools (P. N. Okeke)",
                focus: "Equations of Motion, Wave Dynamics, Electric Fields, and Vector Analysis",
                exercise: "Derive the standard kinematics equations and solve the revision problems in Section 2."
            };
        }
        if (nameLower.includes("chemistry")) {
            return {
                title: "New School Chemistry (Osei Yaw Ababio)",
                focus: "Gas Laws, Stoichiometry, Periodic Table trends, and Balancing Redox equations",
                exercise: "Solve 15 stoichiometry molar conversion calculations on page 142."
            };
        }
        if (nameLower.includes("biology")) {
            return {
                title: "Modern Biology for Senior Secondary Schools (Sarojini T. Ramalingam)",
                focus: "Cell Structure, Genetics and Monohybrid Crosses, Transpiration, and Digestive Systems",
                exercise: "Draw and label a plant cell membrane and outline the carbon cycle stages."
            };
        }
        if (nameLower.includes("science")) {
            return {
                title: "Basic Science for Junior Secondary Schools",
                focus: "Matter transformations, Kinetic Theory, Living and Non-living habitats",
                exercise: "Complete the self-assessment test at the end of Module 3."
            };
        }
        return {
            title: `Recommended Class Textbook for ${subjectName}`,
            focus: "General Syllabus Guidelines and past exam session papers",
            exercise: "Complete 10 past questions from the Question Bank under supervised timings."
        };
    };

    return (
        <div className="min-h-screen bg-transparent p-0 sm:p-2 flex flex-col items-center font-sans print:p-0">
            {/* Control Panel - Hidden during print */}
            {showPrintButton && (
                <div className="w-full max-w-4xl bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 print:hidden mx-auto">
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold border border-indigo-100 flex items-center gap-2">
                            <BookOpen size={18} /> Personalized Study Path Guide
                        </div>
                    </div>

                    <Button
                        onClick={handlePrint}
                        className="bg-indigo-650 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-md transition-transform active:scale-95"
                    >
                        <Printer size={18} /> Print Study Guide
                    </Button>
                </div>
            )}

            {/* Main Document Layout */}
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none p-[10mm] sm:p-[15mm] border border-gray-200 print:border-none min-h-[297mm] flex flex-col mx-auto text-slate-800">
                {/* School Header */}
                <div className="flex items-center border-b-4 border-indigo-900 pb-4 mb-5">
                    <div className="w-20 h-20 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-black text-2xl border-2 border-indigo-900 shadow-sm shrink-0">
                        FIA
                    </div>
                    <div className="flex-1 text-center pr-20">
                        <h1 className="text-xl sm:text-2xl font-black text-indigo-900 tracking-tight leading-none mb-1 uppercase">FAITH IMMACULATE ACADEMY</h1>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-550 tracking-[0.1em] mb-1">KNOWLEDGE AND GODLINESS • IGBOHO, OYO STATE</p>
                        <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-0.5 rounded-full">
                            Cognitive Diagnosis & Remediation Engine
                        </span>
                    </div>
                </div>

                {/* Title */}
                <div className="bg-indigo-950 text-white text-center py-1.5 mb-5 rounded">
                    <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase">
                        AI-DRIVEN PERSONALIZED REMEDIATION STUDY GUIDE
                    </h2>
                </div>

                {/* Student Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between border-b border-slate-200 pb-1 pr-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Candidate:</span>
                        <span className="font-extrabold text-indigo-950">{student.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1 pl-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Access Passcode:</span>
                        <span className="font-mono font-bold text-slate-700">{student.studentId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1 pr-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Class / Cohort:</span>
                        <span className="font-bold text-slate-800">{student.classLevel}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1 pl-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Academic Standing:</span>
                        <span className="font-black text-emerald-700">{averageScore >= 50 ? "Active Standing" : "Needs Remediation"}</span>
                    </div>
                    <div className="flex justify-between pb-0 pr-2 col-span-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Cumulative Average Score:</span>
                        <span className="font-extrabold text-indigo-700">{averageScore}%</span>
                    </div>
                </div>

                {/* Clinical Diagnosis Section */}
                <div className="space-y-2 mb-6">
                    <h3 className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5 border-b pb-1.5">
                        <Compass className="w-4 h-4 text-indigo-650" /> 1. Pedagogical Diagnosis & Cognitive Standing
                    </h3>
                    <p className="text-[12px] font-semibold text-slate-650 leading-relaxed bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-50/50 italic">
                        "{diagnosis}"
                    </p>
                </div>

                {/* Strengths and Focus Areas */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Concept Strengths (🏅 &ge;70%)
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {strengths.length > 0 ? (
                                strengths.map(s => (
                                    <span key={s} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded">
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">No major syllabus strengths identified.</span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Weakness Zones (⚠️ &lt;50%)
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {weaknesses.length > 0 ? (
                                weaknesses.map(w => (
                                    <span key={w} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded">
                                        {w}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">No urgent revision zones flagged.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Prescribed Textbooks & Revision Prompts */}
                {weaknesses.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <h3 className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5 border-b pb-1.5">
                            <FileText className="w-4 h-4 text-indigo-650" /> 2. Recommended Textbooks & Study Activities
                        </h3>
                        <div className="space-y-2">
                            {weaknesses.map(subject => {
                                const recommendation = getTextbookSuggestion(subject);
                                return (
                                    <div key={subject} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                        <h4 className="text-xs font-extrabold text-indigo-900 uppercase">{subject} Review Protocol</h4>
                                        <p className="text-[11px] text-slate-600">
                                            <strong className="text-slate-700">Textbook:</strong> {recommendation.title}
                                        </p>
                                        <p className="text-[11px] text-slate-600">
                                            <strong className="text-slate-700">Syllabus Focus:</strong> {recommendation.focus}
                                        </p>
                                        <p className="text-[11px] text-slate-700 font-bold bg-indigo-50/40 p-1.5 rounded border border-indigo-150/10 mt-1">
                                            📝 Practice Exercise: {recommendation.exercise}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4-Week Study Schedule Calendar */}
                <div className="space-y-3 mb-6">
                    <h3 className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5 border-b pb-1.5">
                        <Compass className="w-4 h-4 text-indigo-650" /> 3. 4-Week Structured Study Calendar
                    </h3>
                    <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
                        <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/20">
                            <h4 className="font-extrabold text-indigo-900 uppercase mb-1 border-b pb-1">Week 1</h4>
                            <p className="text-[10px] text-slate-600 leading-tight">
                                {weaknesses.length > 0 
                                    ? `Concept breakdown & note summaries in: ${weaknesses[0]}.` 
                                    : "Review core definitions and past questions."}
                            </p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/20">
                            <h4 className="font-extrabold text-indigo-900 uppercase mb-1 border-b pb-1">Week 2</h4>
                            <p className="text-[10px] text-slate-600 leading-tight">
                                {weaknesses.length > 1 
                                    ? `Concept breakdown & note summaries in: ${weaknesses[1]}.`
                                    : weaknesses.length > 0
                                    ? `Attempt textbook practice problems for: ${weaknesses[0]}.`
                                    : "Solve 2 complete CBT mock tests."}
                            </p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/20">
                            <h4 className="font-extrabold text-indigo-900 uppercase mb-1 border-b pb-1">Week 3</h4>
                            <p className="text-[10px] text-slate-600 leading-tight">
                                {weaknesses.length > 0 
                                    ? "Consolidated revision of all Weakness Zones with peer discussion."
                                    : "Read ahead into next term's curriculum."}
                            </p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/20">
                            <h4 className="font-extrabold text-indigo-900 uppercase mb-1 border-b pb-1">Week 4</h4>
                            <p className="text-[10px] text-slate-700 font-bold leading-tight text-emerald-700">
                                🏁 Final mock retake of diagnostic examination inside Student Portal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Self-Assessment Checkpoints */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5 border-b pb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-650" /> 4. Action Plan Checklist
                    </h3>
                    <ul className="space-y-2 text-[11px] font-semibold text-slate-600 pl-4 list-disc">
                        {actionPlan.map((step, index) => (
                            <li key={index} className="leading-relaxed">
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer Signatures */}
                <div className="mt-12 grid grid-cols-2 gap-12 text-center pb-6 border-t border-slate-100 pt-6">
                    <div className="flex flex-col items-center">
                        <div className="w-full border-t border-slate-400 mb-1"></div>
                        <p className="text-[9px] font-bold uppercase text-slate-500">Parent / Guardian Signature & Date</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-t border-slate-400 mb-1"></div>
                        <p className="text-[9px] font-bold uppercase text-slate-500">Form Master / Counselor Signature</p>
                    </div>
                </div>

                {/* Branding Footer */}
                <div className="mt-auto border-t border-gray-100 pt-2 flex justify-between items-center text-[9px] text-gray-400 italic">
                    <span>Generated by Fia CBT Remediation Engine • {new Date().toLocaleDateString()}</span>
                    <span>Class standing: {student.classLevel} ({student.department || "General"})</span>
                </div>
            </div>

            <style>{`
            @media print {
                @page {
                    size: A4;
                    margin: 0;
                }
                body {
                    background: white !important;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .print-hidden {
                    display: none !important;
                }
            }
            `}</style>
        </div>
    );
};
