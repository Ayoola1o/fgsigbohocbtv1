import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { Question } from "@shared/schema";

export interface TheorySlot {
    id: string;
    label: string; // e.g., "1", "1a", "1ai"
    level: 1 | 2 | 3;
    questionId?: string;
    children: TheorySlot[];
}

export const generateStructure = (settings: {
    totalMainQuestions: number;
    includeAlphabet: boolean;
    includeRoman: boolean;
    randomizeComplexity: boolean;
}, availableQuestions?: Question[]): TheorySlot[] => {
    const { totalMainQuestions, includeAlphabet, includeRoman, randomizeComplexity } = settings;
    const generatedStructure: TheorySlot[] = [];

    // Clone available questions if provided so we can take from it
    const questionPool = availableQuestions ? [...availableQuestions] : [];
    // Shuffle the pool for randomness
    if (questionPool.length > 0) {
        for (let i = questionPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionPool[i], questionPool[j]] = [questionPool[j], questionPool[i]];
        }
    }

    const pickQuestion = () => {
        if (questionPool.length === 0) return undefined;
        return questionPool.pop()?.id;
    };

    for (let i = 1; i <= totalMainQuestions; i++) {
        const mainId = i.toString();
        const mainSlot: TheorySlot = {
            id: mainId,
            label: mainId,
            level: 1,
            children: [],
            questionId: pickQuestion()
        };

        if (includeAlphabet) {
            const numSub = randomizeComplexity ? Math.floor(Math.random() * 3) + 1 : 2;
            for (let j = 0; j < numSub; j++) {
                const subLabel = String.fromCharCode(97 + j);
                const subSlot: TheorySlot = {
                    id: `${mainId}${subLabel}`,
                    label: subLabel,
                    level: 2,
                    children: [],
                    questionId: pickQuestion()
                };

                if (includeRoman) {
                    const numNested = randomizeComplexity ? Math.floor(Math.random() * 4) + 1 : 2;
                    const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
                    for (let k = 0; k < numNested; k++) {
                        const nestedLabel = romanNumerals[k] || (k + 1).toString();
                        subSlot.children.push({
                            id: `${subSlot.id}${nestedLabel}`,
                            label: nestedLabel,
                            level: 3,
                            children: [],
                            questionId: pickQuestion()
                        });
                    }
                }
                mainSlot.children.push(subSlot);
            }
        }
        generatedStructure.push(mainSlot);
    }
    return generatedStructure;
};

export function TheoryStructureEditor({
    structure,
    onChange,
    availableQuestions
}: {
    structure: TheorySlot[];
    onChange: (newStructure: TheorySlot[]) => void;
    availableQuestions: Question[];
}) {
    const addMainQuestion = () => {
        const newId = (structure.length + 1).toString();
        const newQuestion: TheorySlot = {
            id: newId,
            label: newId,
            level: 1,
            children: []
        };
        onChange([...structure, newQuestion]);
    };

    const removeMainQuestion = (index: number) => {
        const newStructure = structure.filter((_, i) => i !== index);
        const reindexed = newStructure.map((q, i) => ({
            ...q,
            id: (i + 1).toString(),
            label: (i + 1).toString()
        }));
        onChange(reindexed);
    };

    const addSubPart = (mainIndex: number) => {
        const main = structure[mainIndex];
        const subLabel = String.fromCharCode(97 + (main.children?.length || 0));
        const newSub: TheorySlot = {
            id: `${main.id}${subLabel}`,
            label: subLabel,
            level: 2,
            children: []
        };

        const newStructure = structure.map((m, idx) =>
            idx === mainIndex ? { ...m, children: [...(m.children || []), newSub] } : m
        );
        onChange(newStructure);
    };

    const addNestedPart = (mainIndex: number, subIndex: number) => {
        const main = structure[mainIndex];
        const sub = main.children[subIndex];
        const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
        const nestedLabel = romanNumerals[sub.children?.length || 0] || ((sub.children?.length || 0) + 1).toString();
        const newNested: TheorySlot = {
            id: `${sub.id}${nestedLabel}`,
            label: nestedLabel,
            level: 3,
            children: []
        };

        const newStructure = structure.map((m, mIdx) => {
            if (mIdx !== mainIndex) return m;
            return {
                ...m,
                children: m.children.map((s, sIdx) =>
                    sIdx === subIndex ? { ...s, children: [...(s.children || []), newNested] } : s
                )
            };
        });
        onChange(newStructure);
    };

    const updateQuestionId = (mIdx: number, sIdx?: number, nIdx?: number, value?: string) => {
        const newStructure = structure.map((m, curMIdx) => {
            if (curMIdx !== mIdx) return m;
            if (sIdx === undefined) return { ...m, questionId: value };

            return {
                ...m,
                children: m.children.map((s, curSIdx) => {
                    if (curSIdx !== sIdx) return s;
                    if (nIdx === undefined) return { ...s, questionId: value };

                    return {
                        ...s,
                        children: s.children.map((n, curNIdx) =>
                            curNIdx === nIdx ? { ...n, questionId: value } : n
                        )
                    };
                })
            };
        });
        onChange(newStructure);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Question Structure</h4>
                <Button type="button" size="sm" onClick={addMainQuestion}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Main Question
                </Button>
            </div>

            <div className="space-y-4">
                {structure.map((main, mIdx) => (
                    <Card key={main.id} className="border-l-4 border-l-primary hover-elevate transition-all">
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <Badge variant="default" className="text-lg font-bold px-3">Question {main.label}</Badge>
                                <div className="w-64">
                                    <select
                                        className="w-full border rounded px-2 py-1 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                                        value={main.questionId || ""}
                                        onChange={(e) => updateQuestionId(mIdx, undefined, undefined, e.target.value)}
                                    >
                                        <option value="">Select Question...</option>
                                        {availableQuestions.map(q => (
                                            <option key={q.id} value={q.id}>{q.questionText.substring(0, 50)}...</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => addSubPart(mIdx)}>
                                    Add Part (a, b)
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeMainQuestion(mIdx)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                            {main.children && main.children.map((sub, sIdx) => (
                                <div key={sub.id} className="ml-8 space-y-2 border-l-2 border-l-secondary/50 pl-4 py-2 bg-secondary/5 rounded-r-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-semibold px-2">({sub.label})</Badge>
                                            <div className="w-64">
                                                <select
                                                    className="w-full border rounded px-2 py-1 text-xs bg-background"
                                                    value={sub.questionId || ""}
                                                    onChange={(e) => updateQuestionId(mIdx, sIdx, undefined, e.target.value)}
                                                >
                                                    <option value="">Select Question...</option>
                                                    {availableQuestions.map(q => (
                                                        <option key={q.id} value={q.id}>{q.questionText.substring(0, 40)}...</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addNestedPart(mIdx, sIdx)}>
                                            Add Sub-part (i, ii)
                                        </Button>
                                    </div>

                                    {sub.children && sub.children.map((nested, nIdx) => (
                                        <div key={nested.id} className="ml-8 flex items-center gap-3 border-l border-l-muted pl-4 py-1">
                                            <Badge variant="outline" className="text-xs font-mono">{nested.label}.</Badge>
                                            <div className="w-64">
                                                <select
                                                    className="w-full border rounded px-1 py-0.5 text-xs bg-background"
                                                    value={nested.questionId || ""}
                                                    onChange={(e) => updateQuestionId(mIdx, sIdx, nIdx, e.target.value)}
                                                >
                                                    <option value="">Select Question...</option>
                                                    {availableQuestions.map(q => (
                                                        <option key={q.id} value={q.id}>{q.questionText.substring(0, 30)}...</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
