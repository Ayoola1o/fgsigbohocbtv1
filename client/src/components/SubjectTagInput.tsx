import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, BookOpen, Check } from "lucide-react";
import type { Question } from "@shared/schema";

interface SubjectTagInputProps {
  value: string;
  onChange: (newValue: string) => void;
  availableQuestions?: Question[];
  placeholder?: string;
}

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Animal Husbandry",
  "Yoruba",
  "Hausa",
  "Igbo",
  "Economics",
  "Government",
  "Commerce",
  "Financial Accounting",
  "Civic Education",
  "Computer Studies",
  "Literature in English",
  "CRS / Christian Religious Knowledge",
  "IRS / Islamic Religious Knowledge",
  "Further Mathematics",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Business Studies",
  "Home Economics",
  "Cultural and Creative Arts (CCA)",
  "Physical and Health Education (PHE)"
];

export const SubjectTagInput: React.FC<SubjectTagInputProps> = ({
  value,
  onChange,
  availableQuestions = [],
  placeholder = "Select or type subject name..."
}) => {
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Parse current selected tags array
  const selectedTags = useMemo(() => {
    if (!value) return [];
    return value.split(",").map(s => s.trim()).filter(Boolean);
  }, [value]);

  // Extract all unique subjects from Question Bank + Defaults
  const allKnownSubjects = useMemo(() => {
    const fromQuestions = availableQuestions.map(q => q.subject?.trim()).filter(Boolean);
    const combined = Array.from(new Set([...fromQuestions, ...DEFAULT_SUBJECTS]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [availableQuestions]);

  // Available subjects not yet selected
  const unselectedSubjects = useMemo(() => {
    const lowerSelected = new Set(selectedTags.map(t => t.toLowerCase()));
    return allKnownSubjects.filter(subj => !lowerSelected.has(subj.toLowerCase()));
  }, [allKnownSubjects, selectedTags]);

  const updateTags = (newTags: string[]) => {
    onChange(newTags.join(", "));
  };

  const addTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    const lowerSelected = new Set(selectedTags.map(t => t.toLowerCase()));
    if (lowerSelected.has(trimmed.toLowerCase())) return;

    updateTags([...selectedTags, trimmed]);
    setCustomSubjectInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const updated = selectedTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    updateTags(updated);
  };

  return (
    <div className="space-y-2.5">
      {/* Selected Subject Badges */}
      <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center">
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <Badge
              key={tag}
              className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 group transition-all text-xs"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:bg-indigo-200/50 dark:hover:bg-indigo-900/60 rounded-full p-0.5 transition-colors text-indigo-600 dark:text-indigo-400"
                title={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-slate-400 font-medium italic px-1">
            No subjects added yet. Select from dropdown below or type a custom subject.
          </span>
        )}
      </div>

      {/* Add Subject Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Dropdown Selector */}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              addTag(e.target.value);
            }
          }}
          className="border rounded-xl px-3 py-1.5 bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9 font-bold text-slate-700 dark:text-slate-300 flex-1"
        >
          <option value="">+ Add Subject from Question Bank...</option>
          {unselectedSubjects.map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>

        {/* Custom Subject Input */}
        <div className="flex gap-1.5 flex-1">
          <Input
            value={customSubjectInput}
            onChange={(e) => setCustomSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(customSubjectInput);
              }
            }}
            placeholder="Or type new custom subject..."
            className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTag(customSubjectInput)}
            disabled={!customSubjectInput.trim()}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
};
