import React from 'react';
import { Printer, FileText, Users, Calendar, Award, GraduationCap } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface PrintReportTemplateProps {
    reportType: 'score-sheet' | 'result-report' | 'exam-paper';
    schoolInfo: {
        name: string;
        address: string;
        motto: string;
        logoText: string;
    };
    metadata: {
        class: string;
        exam: string;
        date: string;
        session: string;
    };
    results: Array<{
        id: string;
        name: string; // For exam-paper, this is the question text
        class: string;
        subject: string; // For exam-paper, this could be options type (e.g., 'mcq', 'theory') or options text
        score: number;
        total?: number;
        percentage?: number;
        passed?: boolean;
        options?: string[]; // Added for exam-paper options
    }>;
    onPrint?: () => void;
    showPrintButton?: boolean;
}

export const PrintReportTemplate: React.FC<PrintReportTemplateProps> = ({
    reportType,
    schoolInfo,
    metadata,
    results,
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

    return (
        <div className="min-h-screen bg-transparent p-0 sm:p-2 flex flex-col items-center font-sans print:p-0">
            {/* Control Panel - Hidden during print */}
            {showPrintButton && (
                <div className="w-full max-w-4xl bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 print:hidden mx-auto">
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 flex items-center gap-2">
                            <FileText size={18} /> {reportType === 'score-sheet' ? 'Score Sheet' : reportType === 'exam-paper' ? 'Question Paper' : 'Result Report'}
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

            {/* Main Report Document */}
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none p-[10mm] sm:p-[15mm] border border-gray-200 print:border-none min-h-[297mm] flex flex-col mx-auto">

                {/* Header Section */}
                <div className="flex items-center border-b-4 border-blue-900 pb-4 mb-6">
                    {/* School Logo Area at Top Left */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-2xl sm:text-3xl border-2 border-blue-900 shadow-sm overflow-hidden shrink-0">
                        {schoolInfo.logoText}
                    </div>

                    <div className="flex-1 text-center pr-24 sm:pr-28">
                        <h1 className="text-xl sm:text-3xl font-black text-blue-900 tracking-tight leading-none mb-1 uppercase">{schoolInfo.name}</h1>
                        <p className="text-xs sm:text-sm font-bold text-gray-600 tracking-[0.1em] sm:tracking-[0.2em] mb-2">{schoolInfo.address}</p>
                        <div className="inline-block bg-blue-50 px-4 sm:px-6 py-1 rounded-full border border-blue-200">
                            <span className="text-[10px] sm:text-xs font-bold text-blue-800 italic uppercase">Motto: {schoolInfo.motto}</span>
                        </div>
                    </div>
                </div>

                {/* Report Title Banner */}
                <div className="bg-gray-900 text-white text-center py-2 mb-6">
                    <h2 className="text-sm sm:text-lg font-bold tracking-widest uppercase">
                        {reportType === 'score-sheet' ? 'OFFICIAL EXAMINATION SCORE SHEET' : reportType === 'exam-paper' ? 'EXAMINATION QUESTION PAPER' : 'STUDENT PERFORMANCE REPORT'}
                    </h2>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 mb-8 text-xs sm:text-sm">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="text-gray-500 flex items-center gap-2 font-medium uppercase"><GraduationCap size={14} /> Class:</span>
                        <span className="font-bold text-gray-800">{metadata.class}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="text-gray-500 flex items-center gap-2 font-medium uppercase"><Calendar size={14} /> Date:</span>
                        <span className="font-bold text-gray-800">{metadata.date}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1 col-span-2">
                        <span className="text-gray-500 flex items-center gap-2 font-medium uppercase">
                            {reportType === 'score-sheet' ? <Award size={14} /> : <FileText size={14} />}
                            {reportType === 'score-sheet' ? 'Subject / Examination:' : 'Academic Session:'}
                        </span>
                        <span className="font-bold text-gray-800 italic underline">
                            {reportType === 'score-sheet' ? metadata.exam : metadata.session}
                        </span>
                    </div>
                </div>

                {/* Results / Questions Table */}
                <div className="flex-1">
                    {reportType === 'exam-paper' ? (
                        <div className="space-y-6">
                            {results.map((q, index) => (
                                <div key={index} className="space-y-2 pb-4 border-b border-gray-100 last:border-0 page-break-inside-avoid">
                                    <div className="flex gap-3">
                                        <span className="font-bold shrink-0">{index + 1}.</span>
                                        <div className="space-y-3 flex-1">
                                            <p className="text-sm sm:text-base font-medium leading-relaxed">{q.name}</p>
                                            {q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 pl-2">
                                                    {q.options.map((option, optIndex) => (
                                                        <div key={optIndex} className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">
                                                                {String.fromCharCode(65 + optIndex)}.
                                                            </span>
                                                            <span className="text-sm">{option}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-400 px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider w-8 sm:w-12">S/N</th>
                                    <th className="border border-gray-400 px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                        {reportType === 'score-sheet' ? 'Student Name' : 'Subject'}
                                    </th>
                                    <th className="border border-gray-400 px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider w-20 sm:w-24">
                                        {reportType === 'score-sheet' ? 'ID No.' : 'Questions'}
                                    </th>
                                    <th className="border border-gray-400 px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                        {reportType === 'score-sheet' ? 'Examination Title' : 'Correct'}
                                    </th>
                                    <th className="border border-gray-400 px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider w-20 sm:w-24">Score (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((res, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm text-center font-mono">{index + 1}</td>
                                        <td className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-bold uppercase">
                                            {reportType === 'score-sheet' ? res.name : res.subject}
                                        </td>
                                        <td className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm text-gray-600 font-mono">
                                            {reportType === 'score-sheet' ? res.id : res.total || '-'}
                                        </td>
                                        <td className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm uppercase">
                                            {reportType === 'score-sheet' ? res.subject : res.score}
                                        </td>
                                        <td className={`border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm text-center font-bold ${res.percentage !== undefined ? (res.percentage >= 40 ? 'text-green-700' : 'text-red-600') : (res.score >= 40 ? 'text-green-700' : 'text-red-600')}`}>
                                            {res.percentage !== undefined ? res.percentage.toFixed(0) : res.score}%
                                        </td>
                                    </tr>
                                ))}
                                {/* Padding rows for professional look - reduced for result reports */}
                                {[...Array(Math.max(0, (reportType === 'score-sheet' ? 12 : 6) - results.length))].map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-8 sm:h-10">
                                        <td className="border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2"></td>
                                        <td className="border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2"></td>
                                        <td className="border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2"></td>
                                        <td className="border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2"></td>
                                        <td className="border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-gray-300 font-mono">---</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer/Signatures */}
                <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-6 sm:gap-12 text-center pb-6 sm:pb-8">
                    <div className="flex flex-col items-center">
                        <div className="w-full border-t-2 border-gray-800 mb-1"></div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-700">Form Master Signature</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-t-2 border-gray-800 mb-1"></div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-700">Exam Officer Signature</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-t-2 border-gray-800 mb-1 italic font-serif text-blue-900 font-bold text-[10px] sm:text-sm">Approved</div>
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
