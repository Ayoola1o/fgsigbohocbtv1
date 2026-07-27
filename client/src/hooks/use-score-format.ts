import { useState, useEffect, useCallback } from "react";

export type ScoreFormat = "points" | "percentage";

export function useScoreFormat(): {
  scoreFormat: ScoreFormat;
  formatScore: (score?: number, totalPoints?: number, percentage?: number) => string;
} {
  const [scoreFormat, setScoreFormat] = useState<ScoreFormat>(() => {
    const saved = localStorage.getItem("fia_cbt_settings_score_format");
    return saved === "points" ? "points" : "percentage";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("fia_cbt_settings_score_format");
      setScoreFormat(saved === "points" ? "points" : "percentage");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const formatScore = useCallback(
    (score?: number, totalPoints?: number, percentage?: number): string => {
      const safeScore = score ?? 0;
      const safeTotal = totalPoints ?? 0;
      const safePct = percentage ?? (safeTotal > 0 ? Math.round((safeScore / safeTotal) * 100) : 0);

      if (scoreFormat === "points") {
        if (safeTotal > 0) {
          return `${safeScore} / ${safeTotal}`;
        }
        return `${safeScore}`;
      }

      return `${safePct}%`;
    },
    [scoreFormat]
  );

  return { scoreFormat, formatScore };
}
