"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ questions, onSelect, disabled = false }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-6 py-4">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="group relative overflow-hidden rounded-lg border border-[var(--accent-gold)]/20 bg-black/40 px-3 py-1.5 text-[11px] font-medium transition-all hover:border-[var(--accent-gold)]/50 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-40"

        >
          <span className="relative z-10 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent-gold-light)] italic font-serif">
            {q}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[var(--accent-gold)]/5 to-transparent transition-transform duration-500 group-hover:translate-x-0" />
        </button>
      ))}
    </div>
  );
}
