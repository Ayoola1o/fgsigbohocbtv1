import React from 'react';
import { PrintReportTemplate } from "./PrintReportTemplate";

export const ResultTemplate = ({ data, onPrint, showPrintButton = true }: { data: any, onPrint?: () => void, showPrintButton?: boolean }) => {
    return (
        <PrintReportTemplate
            reportType="result-report"
            schoolInfo={{
                name: data.schoolName || "FAITH IMMACULATE ACADEMY",
                address: "IGBOHO, OYO STATE",
                motto: "KNOWLEDGE AND GODLINESS",
                logoText: "FIA"
            }}
            metadata={{
                class: data.candidate.gradeLevel,
                exam: data.examTitle,
                date: data.candidate.date,
                session: data.session || "2025/2026 ACADEMIC SESSION",
                studentName: data.candidate.name,
                studentId: data.candidate.studentId,
            }}
            results={data.subjectBreakdown.map((b: any) => ({
                id: b.questions.toString(),
                name: b.subject,
                class: data.candidate.gradeLevel,
                subject: b.subject,
                score: b.correct,
                total: b.questions,
                percentage: b.percentage,
            }))}
            onPrint={onPrint}
            showPrintButton={showPrintButton}
        />
    );
};
