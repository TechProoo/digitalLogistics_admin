import React, { useState } from "react";
import type { Note } from "../../types/shipment";
import { Plus, Loader2, FileText } from "lucide-react";

interface InternalNotesProps {
  notes: Note[];
  onAddNote: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export const InternalNotes: React.FC<InternalNotesProps> = ({
  notes,
  onAddNote,
  isLoading = false,
}) => {
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.trim()) {
      setError("Please enter a note");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onAddNote(newNote.trim());
      setNewNote("");
    } catch (err) {
      setError("Failed to add note");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3
        className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        style={{ color: "var(--text-secondary)" }}
      >
        <div
          className="h-1 w-8 rounded"
          style={{ backgroundColor: "var(--border-strong)" }}
        />
        Internal Notes
      </h3>

      {/* Previous Notes */}
      {notes.length > 0 && (
        <div
          className="rounded-xl p-5 space-y-3 max-h-64 overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "2px solid var(--border-medium)",
          }}
        >
          {notes.map((note, idx) => (
            <div
              key={note.id}
              className="p-4 rounded-lg transition-all duration-200 hover:translate-x-1 animate-fadeSlideIn"
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-soft)",
                animationDelay: `${idx * 50}ms`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--bg-overlay)" }}
                >
                  <FileText
                    className="w-4 h-4"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium mb-2 leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {note.text}
                  </div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {note.timestamp}
                    {note.admin && (
                      <>
                        <span className="mx-1.5">•</span>
                        <span className="font-semibold">{note.admin}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "2px dashed var(--border-medium)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: "var(--bg-overlay)" }}
          >
            <FileText
              className="w-6 h-6"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            No internal notes yet
          </p>
        </div>
      )}

      {/* Add Note Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-5 rounded-xl"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "2px solid var(--border-medium)",
        }}
      >
        <div>
          <label
            className="block text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Add New Note
          </label>
          <textarea
            placeholder="Enter internal note or observation..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={isSubmitting || isLoading}
            rows={4}
            className="w-full px-4 py-3 rounded-lg font-medium outline-none transition-all duration-200 resize-none focus:ring-2"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
              border: "2px solid var(--border-medium)",
            }}
          />
        </div>

        {error && (
          <div
            className="p-3 rounded-lg text-sm font-semibold animate-shake"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isLoading || !newNote.trim()}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100"
          style={{
            backgroundColor:
              isSubmitting || isLoading || !newNote.trim()
                ? "var(--bg-tertiary)"
                : "var(--text-primary)",
            color:
              isSubmitting || isLoading || !newNote.trim()
                ? "var(--text-secondary)"
                : "var(--text-inverse)",
            border: "2px solid var(--border-strong)",
            cursor:
              isSubmitting || isLoading || !newNote.trim()
                ? "not-allowed"
                : "pointer",
            opacity: isSubmitting || isLoading || !newNote.trim() ? 0.5 : 1,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding Note...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Add Note
            </>
          )}
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.3s ease-out backwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--bg-overlay);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
