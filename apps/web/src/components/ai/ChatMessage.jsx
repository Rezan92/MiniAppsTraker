import React from 'react';
import { Link } from 'react-router-dom';

export const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  // Formatter for bullets, bold text, and paragraphs
  const formatText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc mb-1">
            {formatInline(line.substring(2))}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="mb-1 leading-relaxed">
          {formatInline(line)}
        </p>
      );
    });
  };

  const formatInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-black text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-sm">
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm transition-all ${
          isUser
            ? 'bg-gray-900 text-white rounded-br-xs'
            : isError
            ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-xs'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
        }`}
      >
        <div className="font-body-md text-sm">{formatText(message.content)}</div>

        {/* Action Link Badges if entities were created */}
        {!isUser && message.mutations && message.mutations.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
            {message.mutations.map((mut, i) => {
              if (mut.type === 'jobs' && mut.entityId) {
                return (
                  <Link
                    key={i}
                    to={`/jobs/${mut.entityId}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-black rounded text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">work</span>
                    <span>View Job</span>
                  </Link>
                );
              }
              if (mut.type === 'clients' && mut.entityId) {
                return (
                  <Link
                    key={i}
                    to={`/clients/${mut.entityId}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-black rounded text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    <span>View Client</span>
                  </Link>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Timestamp and Sync Status */}
        <div className={`text-[10px] mt-1.5 flex items-center gap-1.5 ${isUser ? 'text-gray-400 justify-end' : 'text-gray-400'}`}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.mutations && message.mutations.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] border border-emerald-200">
              <span className="material-symbols-outlined text-[12px]">sync</span> Synced
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-0.5 border border-gray-300">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      )}
    </div>
  );
};
