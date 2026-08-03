import React from 'react';
import { Printer, FileText, Users, Calendar, Award, GraduationCap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface MissingExamRow {
    studentName: string;
    studentId: string;
    class: string;
    department?: string;
    subject: string;
    examTitle: string;
    status: 'No Result Found' | 'Not Started' | 'Incomplete';
}

export interface CumulativeBroadsheetRow {
    subject: string;
    term1Pct?: number | null;
    term2Pct?: number | null;
    term3Pct?: number | null;
    cumulativePct: number;
    grade: string;
    position?: string;
    isMissing?: boolean;
}

export interface TermTableData {
    term: string;
    results: Array<{
        subject: string;
        score: number;
        total: number;
        percentage: number;
        grade: string;
        position?: string;
    }>;
}

export interface PrintReportTemplateProps {
    reportType: 
        | 'score-sheet' 
        | 'result-report' 
        | 'exam-paper' 
        | 'consolidated-portfolio' 
        | 'consolidated-broadsheet'
        | 'missing-exam-report'
        | 'student-term-breakdown'
        | 'student-cumulative-broadsheet';
    schoolInfo: {
        name: string;
        address: string;
        motto: string;
        logoText: string;
        logoUrl?: string;
    };
    metadata: {
        class: string;
        exam: string;
        date: string;
        session: string;
        studentName?: string;
        studentId?: string;
        department?: string;
        term?: string;
    };
    results?: Array<{
        id: string;
        name: string;
        class: string;
        subject: string;
        score: number;
        total?: number;
        percentage?: number;
        passed?: boolean;
        options?: string[];
        position?: string;
    }>;
    matrixHeaders?: string[];
    matrixRows?: Array<{
        studentId: string;
        name: string;
        class: string;
        department?: string;
        position?: string;
        scores: Record<string, { score: number; total: number; percentage: number }>;
        cumulativeTotalScore: number;
        cumulativeTotalPoints: number;
        cumulativePercentage: number;
        passed: boolean;
    }>;
    missingExamRows?: MissingExamRow[];
    missingExamScope?: 'student' | 'subject' | 'class' | 'school';
    termTables?: TermTableData[];
    cumulativeRows?: CumulativeBroadsheetRow[];
    includePosition?: boolean;
    onPrint?: () => void;
    showPrintButton?: boolean;
}

export const PrintReportTemplate: React.FC<PrintReportTemplateProps> = ({
    reportType,
    schoolInfo,
    metadata,
    results = [],
    matrixHeaders = [],
    matrixRows = [],
    missingExamRows = [],
    missingExamScope = 'class',
    termTables = [],
    cumulativeRows = [],
    includePosition = false,
    onPrint,
    showPrintButton = true
}) => {
    const omitExamTitlesSetting = localStorage.getItem("fia_cbt_settings_remove_title") === "true";
    const principalSignatureSetting = localStorage.getItem("fia_cbt_settings_report_signature") !== "false";
    const schoolSloganSetting = localStorage.getItem("fia_cbt_settings_school_motto") !== "false";
    const scoreFormatSetting = localStorage.getItem("fia_cbt_settings_score_format") || "percentage";

    // Load signature image assets
    const principalSigBase64 = localStorage.getItem("fia_cbt_settings_signature_principal") || "";
    const teacherSigBase64 = localStorage.getItem("fia_cbt_settings_signature_teacher") || "";
    const officerSigBase64 = localStorage.getItem("fia_cbt_settings_signature_officer") || "";

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const getReportTitle = () => {
        switch (reportType) {
            case 'score-sheet': return 'Official Score Sheet';
            case 'exam-paper': return 'Question Paper';
            case 'consolidated-portfolio': return 'Consolidated Student Portfolio';
            case 'consolidated-broadsheet': return 'Class Academic Broadsheet';
            case 'missing-exam-report': 
                return missingExamScope === 'student' ? 'Student Missing Exam Report'
                     : missingExamScope === 'subject' ? 'Subject Missing Exam Report'
                     : missingExamScope === 'school' ? 'School-Wide Missing Exam Report'
                     : 'Class Missing Exam Audit Report';
            case 'student-term-breakdown': return 'Student Multi-Term Performance Breakdown';
            case 'student-cumulative-broadsheet': return 'Annual Cumulative Academic Broadsheet';
            default: return 'Result Report';
        }
    };

    return (
        <div className="min-h-screen bg-transparent p-0 sm:p-2 flex flex-col items-center font-sans print:p-0">
            {/* Control Panel - Hidden during print */}
            {showPrintButton && (
                <div className="w-full max-w-4xl bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 print:hidden mx-auto">
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 flex items-center gap-2">
                            <FileText size={18} /> {getReportTitle()}
                        </div>
                    </div>

                    <Button
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-md transition-transform active:scale-95"
                    >
                        <Printer size={18} /> Print Official Document
                    </Button>
                </div>
            )}

            {/* Official Report Card Canvas */}
            <div className="w-full max-w-4xl bg-white p-6 sm:p-10 border border-gray-300 shadow-lg rounded-none print:shadow-none print:border-none print:w-full print:p-0 my-0 mx-auto flex flex-col min-h-[1050px]">
                
                {/* Header / School Crest */}
                <div className="border-b-2 border-gray-800 pb-4 mb-6 text-center relative">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        {schoolInfo.logoUrl ? (
                            <img src={schoolInfo.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
                        ) : (
                            <div className="h-14 w-14 bg-blue-900 text-white rounded-full flex items-center justify-center font-black text-xl border-2 border-yellow-400">
                                {schoolInfo.logoText || 'FIA'}
                            </div>
                        )}
                        <div className="text-center">
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide">
                                {schoolInfo.name || 'Faith Immaculate Academy'}
                            </h1>
                            <p className="text-xs text-gray-600 font-medium">{schoolInfo.address || '123 Academy Way, Faith City'}</p>
                            {schoolSloganSetting && (
                                <p className="text-[11px] text-blue-800 font-serif italic">{schoolInfo.motto || 'Knowledge, Virtue & Excellence'}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-6 py-1 rounded-full mt-1">
                        {getReportTitle()}
                    </div>
                </div>

                {/* Metadata Summary Banner */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <span className="text-gray-500 font-bold uppercase block text-[9px]">Class / Level</span>
                        <span className="font-bold text-gray-900">{metadata.class || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold uppercase block text-[9px]">Exam / Subject</span>
                        <span className="font-bold text-gray-900">{metadata.exam || 'All Subjects'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold uppercase block text-[9px]">Academic Session</span>
                        <span className="font-bold text-gray-900">{metadata.session || '2025/2026'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold uppercase block text-[9px]">Date Generated</span>
                        <span className="font-bold text-gray-900">{metadata.date || new Date().toLocaleDateString()}</span>
                    </div>
                    {metadata.studentName && (
                        <div className="col-span-2">
                            <span className="text-gray-500 font-bold uppercase block text-[9px]">Student Name / ID</span>
                            <span className="font-extrabold text-blue-900">{metadata.studentName} ({metadata.studentId || 'N/A'})</span>
                        </div>
                    )}
                    {metadata.department && (
                        <div>
                            <span className="text-gray-500 font-bold uppercase block text-[9px]">Department</span>
                            <span className="font-bold text-gray-900">{metadata.department}</span>
                        </div>
                    )}
                    {metadata.term && (
                        <div>
                            <span className="text-gray-500 font-bold uppercase block text-[9px]">Academic Term</span>
                            <span className="font-bold text-gray-900">{metadata.term}</span>
                        </div>
                    )}
                </div>

                {/* CONTENT AREA BASED ON REPORT TYPE */}
                <div className="flex-1">

                    {/* 1. MISSING EXAM REPORT (4 Scopes) */}
                    {reportType === 'missing-exam-report' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg border border-amber-200">
                                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                                    <AlertTriangle size={16} />
                                    <span>Total Unattempted / Incomplete Records: {missingExamRows.length}</span>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                                    Scope: {missingExamScope.toUpperCase()}
                                </span>
                            </div>

                            <table className="w-full border-collapse border border-gray-300 text-left">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-800 text-[10px] sm:text-xs font-bold uppercase">
                                        <th className="border border-gray-300 px-3 py-2 text-center w-10">#</th>
                                        <th className="border border-gray-300 px-3 py-2">Student Name</th>
                                        <th className="border border-gray-300 px-3 py-2">Student ID</th>
                                        <th className="border border-gray-300 px-3 py-2">Class / Dept</th>
                                        <th className="border border-gray-300 px-3 py-2">Missing Subject / Exam</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {missingExamRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="border border-gray-300 p-6 text-center text-green-700 font-bold text-xs">
                                                <CheckCircle2 size={24} className="mx-auto mb-1 text-green-600" />
                                                All enrolled students have completed their scheduled examinations.
                                            </td>
                                        </tr>
                                    ) : (
                                        missingExamRows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 text-xs">
                                                <td className="border border-gray-300 px-3 py-2 text-center font-mono">{idx + 1}</td>
                                                <td className="border border-gray-300 px-3 py-2 font-bold uppercase text-gray-900">{row.studentName}</td>
                                                <td className="border border-gray-300 px-3 py-2 font-mono text-gray-600">{row.studentId}</td>
                                                <td className="border border-gray-300 px-3 py-2">{row.class} {row.department ? `(${row.department})` : ''}</td>
                                                <td className="border border-gray-300 px-3 py-2 font-semibold text-blue-900">{row.subject} ({row.examTitle})</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                        row.status === 'No Result Found' ? 'bg-red-100 text-red-700 border border-red-200' 
                                                        : row.status === 'Not Started' ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                                        : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 2. TYPE A: STUDENT TERM-BY-TERM BREAKDOWN */}
                    {reportType === 'student-term-breakdown' && (
                        <div className="space-y-6">
                            {termTables.map((tTable, tIdx) => (
                                <div key={tIdx} className="border border-gray-300 rounded-lg overflow-hidden">
                                    <div className="bg-blue-900 text-white font-bold text-xs uppercase px-4 py-2 flex justify-between">
                                        <span>{tTable.term} Examination Results</span>
                                        <span>{tTable.results.length} Subjects Recorded</span>
                                    </div>
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 font-bold uppercase text-[10px] text-gray-700 border-b border-gray-300">
                                                <th className="p-2 border-r text-center w-8">#</th>
                                                <th className="p-2 border-r text-left">Subject</th>
                                                <th className="p-2 border-r text-center">Raw Score</th>
                                                <th className="p-2 border-r text-center">Percentage</th>
                                                <th className="p-2 border-r text-center">Grade</th>
                                                {includePosition && <th className="p-2 text-center">Position</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tTable.results.map((r, rIdx) => (
                                                <tr key={rIdx} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="p-2 border-r text-center font-mono">{rIdx + 1}</td>
                                                    <td className="p-2 border-r font-bold text-gray-900">{r.subject}</td>
                                                    <td className="p-2 border-r text-center font-mono">{r.score} / {r.total}</td>
                                                    <td className="p-2 border-r text-center font-bold text-blue-900">{r.percentage.toFixed(1)}%</td>
                                                    <td className="p-2 border-r text-center font-black">{r.grade}</td>
                                                    {includePosition && <td className="p-2 text-center font-bold text-gray-700">{r.position || '—'}</td>}
                                                </tr>
                                            ))}
                                            {tTable.results.length > 0 && (() => {
                                                const totalScore = tTable.results.reduce((a, r) => a + r.score, 0);
                                                const totalMax = tTable.results.reduce((a, r) => a + r.total, 0);
                                                const avgPct = tTable.results.reduce((a, r) => a + r.percentage, 0) / tTable.results.length;
                                                return (
                                                    <tr className="bg-gray-900 text-white font-black text-[10px]">
                                                        <td className="p-2 border-r text-center" colSpan={2}>Term Total / Average</td>
                                                        <td className="p-2 border-r text-center">{totalScore} / {totalMax}</td>
                                                        <td className="p-2 border-r text-center text-yellow-300">{avgPct.toFixed(1)}%</td>
                                                        <td className="p-2 border-r text-center">{avgPct >= 75 ? 'A' : avgPct >= 60 ? 'B' : avgPct >= 50 ? 'C' : avgPct >= 45 ? 'D' : avgPct >= 40 ? 'E' : 'F'}</td>
                                                        {includePosition && <td className="p-2 text-center">—</td>}
                                                    </tr>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. TYPE B: STUDENT CUMULATIVE BROADSHEET */}
                    {reportType === 'student-cumulative-broadsheet' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs flex justify-between items-center text-blue-900 font-bold">
                                <span>Normalized Percentage Summary across 3 Terms</span>
                                {includePosition && <span>Position Ranking Scope: {metadata.department && metadata.department !== 'General' ? `Department (${metadata.department})` : 'Class-Wide'}</span>}
                            </div>
                            <table className="w-full border-collapse border border-gray-300 text-xs">
                                <thead>
                                    <tr className="bg-gray-900 text-white font-bold uppercase text-[10px]">
                                        <th className="border border-gray-700 p-2 text-center w-8">#</th>
                                        <th className="border border-gray-700 p-2 text-left">Subject</th>
                                        <th className="border border-gray-700 p-2 text-center">1st Term %</th>
                                        <th className="border border-gray-700 p-2 text-center">2nd Term %</th>
                                        <th className="border border-gray-700 p-2 text-center">3rd Term %</th>
                                        <th className="border border-gray-700 p-2 text-center bg-blue-800">Cumulative %</th>
                                        <th className="border border-gray-700 p-2 text-center">Grade</th>
                                        {includePosition && <th className="border border-gray-700 p-2 text-center">Position</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cumulativeRows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-2 border border-gray-300 text-center font-mono">{idx + 1}</td>
                                            <td className="p-2 border border-gray-300 font-bold text-gray-900">{row.subject}</td>
                                            <td className="p-2 border border-gray-300 text-center font-mono">{row.term1Pct !== null && row.term1Pct !== undefined ? `${row.term1Pct.toFixed(1)}%` : <span className="text-gray-400 font-normal">N/A</span>}</td>
                                            <td className="p-2 border border-gray-300 text-center font-mono">{row.term2Pct !== null && row.term2Pct !== undefined ? `${row.term2Pct.toFixed(1)}%` : <span className="text-gray-400 font-normal">N/A</span>}</td>
                                            <td className="p-2 border border-gray-300 text-center font-mono">{row.term3Pct !== null && row.term3Pct !== undefined ? `${row.term3Pct.toFixed(1)}%` : <span className="text-gray-400 font-normal">N/A</span>}</td>
                                            <td className="p-2 border border-gray-300 text-center font-extrabold text-blue-900 bg-blue-50/40">{row.cumulativePct !== undefined ? `${row.cumulativePct.toFixed(1)}%` : '—'}</td>
                                            <td className="p-2 border border-gray-300 text-center font-black text-gray-900">{row.grade}</td>
                                            {includePosition && <td className="p-2 border border-gray-300 text-center font-bold text-gray-700">{row.position || '—'}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 4. CONSOLIDATED CLASS/DEPT BROADSHEET MATRIX */}
                    {reportType === 'consolidated-broadsheet' && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-[10px] sm:text-xs">
                                <thead>
                                    <tr className="bg-gray-900 text-white font-bold uppercase text-[9px]">
                                        <th className="border border-gray-700 p-2 text-center w-8">#</th>
                                        <th className="border border-gray-700 p-2 text-left">Student Name</th>
                                        <th className="border border-gray-700 p-2 text-center">ID</th>
                                        {includePosition && <th className="border border-gray-700 p-2 text-center bg-blue-800">Rank</th>}
                                        {matrixHeaders.map((hdr, hIdx) => (
                                            <th key={hIdx} className="border border-gray-700 p-2 text-center">{hdr}</th>
                                        ))}
                                        <th className="border border-gray-700 p-2 text-center bg-gray-800">Avg %</th>
                                        <th className="border border-gray-700 p-2 text-center bg-gray-800">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixRows.map((mRow, mIdx) => (
                                        <tr key={mIdx} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-1.5 border border-gray-300 text-center font-mono">{mIdx + 1}</td>
                                            <td className="p-1.5 border border-gray-300 font-bold text-gray-900 uppercase">{mRow.name}</td>
                                            <td className="p-1.5 border border-gray-300 text-center font-mono text-gray-600">{mRow.studentId}</td>
                                            {includePosition && <td className="p-1.5 border border-gray-300 text-center font-black text-blue-900 bg-blue-50/50">{mRow.position || '—'}</td>}
                                            {matrixHeaders.map((hdr, hIdx) => {
                                                const sData = mRow.scores[hdr];
                                                return (
                                                    <td key={hIdx} className="p-1.5 border border-gray-300 text-center font-mono">
                                                        {sData ? `${sData.percentage.toFixed(0)}%` : <span className="text-gray-300">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-1.5 border border-gray-300 text-center font-black text-blue-900">{mRow.cumulativePercentage.toFixed(1)}%</td>
                                            <td className="p-1.5 border border-gray-300 text-center font-bold">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${mRow.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {mRow.passed ? 'PASSED' : 'FAILED'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 5. STANDARD SCORE SHEET & RESULT REPORT (FALLBACK) */}
                    {(reportType === 'score-sheet' || reportType === 'result-report' || reportType === 'consolidated-portfolio') && (
                        <table className="w-full border-collapse border border-gray-300 text-left text-xs">
                            <thead>
                                <tr className="bg-gray-100 text-gray-800 text-[10px] sm:text-xs font-bold uppercase">
                                    <th className="border border-gray-300 p-2 text-center w-8">#</th>
                                    <th className="border border-gray-300 p-2">{reportType === 'score-sheet' ? 'Student Name' : 'Subject / Assessment'}</th>
                                    <th className="border border-gray-300 p-2">{reportType === 'score-sheet' ? 'Student ID' : 'Max Score'}</th>
                                    <th className="border border-gray-300 p-2">{reportType === 'score-sheet' ? 'Subject' : 'Score Obtained'}</th>
                                    <th className="border border-gray-300 p-2 text-center">
                                        {reportType === 'score-sheet' ? 'Score / Grade' : (scoreFormatSetting === 'percentage' ? 'Score (%)' : 'Score (Correct / Total)')}
                                    </th>
                                    {includePosition && <th className="border border-gray-300 p-2 text-center">Position</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((res, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-2 text-center font-mono">{index + 1}</td>
                                        <td className="border border-gray-300 p-2 font-bold uppercase text-gray-900">{res.name}</td>
                                        <td className="border border-gray-300 p-2 font-mono text-gray-600">{reportType === 'score-sheet' ? res.id : res.total || '-'}</td>
                                        <td className="border border-gray-300 p-2 uppercase font-semibold text-blue-900">{reportType === 'score-sheet' ? (omitExamTitlesSetting ? '____________________' : res.subject) : res.score}</td>
                                        <td className={`border border-gray-300 p-2 text-center font-bold ${res.percentage !== undefined ? (res.percentage >= 40 ? 'text-green-700' : 'text-red-600') : (res.score >= 40 ? 'text-green-700' : 'text-red-600')}`}>
                                            {reportType === 'score-sheet'
                                                ? (scoreFormatSetting === 'percentage' 
                                                    ? `${res.percentage !== undefined ? res.percentage.toFixed(0) : res.score}%`
                                                    : (res.total !== undefined && res.total > 0 ? `${res.score} / ${res.total}` : `${res.score}`)
                                                  )
                                                : (scoreFormatSetting === 'percentage'
                                                    ? `${res.percentage !== undefined ? res.percentage.toFixed(0) : ((res.score / (res.total || 1)) * 100).toFixed(0)}%`
                                                    : `${res.score}/${res.total ?? '-'}`
                                                  )
                                            }
                                        </td>
                                        {includePosition && <td className="border border-gray-300 p-2 text-center font-bold text-gray-700">{res.position || '—'}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer / Signatures */}
                <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-6 sm:gap-12 text-center pb-6 sm:pb-8">
                    <div className="flex flex-col items-center justify-end">
                        <div className="h-12 flex items-end justify-center mb-1">
                            {teacherSigBase64 ? (
                                <img src={teacherSigBase64} alt="Form Master Signature" className="max-h-12 max-w-full object-contain" />
                            ) : (
                                <div className="h-6" />
                            )}
                        </div>
                        <div className="w-full border-t-2 border-gray-800 mb-1"></div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-700">Form Master Signature</p>
                    </div>
                    <div className="flex flex-col items-center justify-end">
                        <div className="h-12 flex items-end justify-center mb-1">
                            {officerSigBase64 ? (
                                <img src={officerSigBase64} alt="Exam Officer Signature" className="max-h-12 max-w-full object-contain" />
                            ) : (
                                <div className="h-6" />
                            )}
                        </div>
                        <div className="w-full border-t-2 border-gray-800 mb-1"></div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-700">Exam Officer Signature</p>
                    </div>
                    <div className="flex flex-col items-center justify-end">
                        <div className="h-12 flex items-end justify-center mb-1">
                            {principalSignatureSetting ? (
                                principalSigBase64 ? (
                                    <img src={principalSigBase64} alt="Principal Signature" className="max-h-12 max-w-full object-contain" />
                                ) : (
                                    <span className="italic font-serif text-blue-900 font-bold text-[10px] sm:text-sm">Approved</span>
                                )
                            ) : (
                                <div className="h-6" />
                            )}
                        </div>
                        <div className="w-full border-t-2 border-gray-800 mb-1"></div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-700">Principal's Stamp</p>
                    </div>
                </div>

                {/* Branding Footer */}
                <div className="mt-auto border-t border-gray-200 pt-2 flex justify-between items-center text-[8px] sm:text-[10px] text-gray-400 italic">
                    <span>Official Document - {schoolInfo.name} CBT Portal • {new Date().toLocaleDateString()}</span>
                    <span>Page 1 of 1</span>
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
