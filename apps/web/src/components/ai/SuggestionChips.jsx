import React from 'react';

export const SuggestionChips = ({ screenContext, onSelectPrompt }) => {
  const getChips = () => {
    const screen = screenContext?.screen;
    switch (screen) {
      case 'JobDetails':
        return [
          "Log 2 hours for today",
          "Add $45 for materials",
          "Summarize this job",
          "Mark job as completed"
        ];
      case 'ClientDetails':
        return [
          "Show all jobs for this client",
          "Schedule a new job",
          "Summarize client history"
        ];
      case 'JobList':
        return [
          "How many open jobs do we have?",
          "Schedule a new repair job",
          "List jobs in progress"
        ];
      case 'Dashboard':
      default:
        return [
          "Summarize today's business",
          "How many active clients do we have?",
          "Create a new residential client",
          "What jobs are currently open?"
        ];
    }
  };

  const chips = getChips();

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPrompt(chip)}
          className="text-xs font-medium whitespace-nowrap bg-white border border-gray-200 text-gray-700 hover:border-primary hover:text-black px-3 py-1.5 rounded-full shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-primary text-[14px]">bolt</span>
          <span>{chip}</span>
        </button>
      ))}
    </div>
  );
};
