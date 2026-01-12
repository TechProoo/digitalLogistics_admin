import React, { useState } from "react";
import type { ShipmentCheckpoint } from "../../types/shipment";
import { formatTimestamp } from "../../types/shipment";
import { MapPin, Send, Loader2 } from "lucide-react";

interface CheckpointListProps {
  checkpoints: ShipmentCheckpoint[];
  onAddCheckpoint: (location: string, description: string) => Promise<void>;
  isLoading?: boolean;
}

export const CheckpointList: React.FC<CheckpointListProps> = ({
  checkpoints,
  onAddCheckpoint,
  isLoading = false,
}) => {
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location.trim() || !description.trim()) {
      setError("Please fill in all fields");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onAddCheckpoint(location.trim(), description.trim());
      setLocation("");
      setDescription("");
    } catch (err) {
      setError("Failed to add checkpoint");
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
        Checkpoint Updates
      </h3>

      {/* Previous Checkpoints */}
      {checkpoints.length > 0 && (
        <div
          className="rounded-xl p-5 space-y-4 max-h-80 overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "2px solid var(--border-medium)",
          }}
        >
          {checkpoints.map((checkpoint, idx) => (
            <div
              key={checkpoint.id}
              className="flex gap-4 p-4 rounded-lg transition-all duration-200 hover:translate-x-1"
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-soft)",
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--bg-overlay)" }}
              >
                <MapPin
                  className="w-5 h-5"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-sm mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {checkpoint.location}
                </div>
                <div
                  className="text-sm mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {checkpoint.description}
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {formatTimestamp(checkpoint.timestamp)}
                  {checkpoint.adminName && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span className="font-semibold">
                        {checkpoint.adminName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Checkpoint Form */}
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
            Location
          </label>
          <input
            type="text"
            placeholder="e.g., Denver Hub, JFK Airport"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting || isLoading}
            className="w-full px-4 py-3 rounded-lg font-medium outline-none transition-all duration-200 focus:ring-2"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
              border: "2px solid var(--border-medium)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Description
          </label>
          <textarea
            placeholder="Checkpoint details and notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting || isLoading}
            rows={3}
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
          disabled={
            isSubmitting || isLoading || !location.trim() || !description.trim()
          }
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100"
          style={{
            backgroundColor:
              isSubmitting ||
              isLoading ||
              !location.trim() ||
              !description.trim()
                ? "var(--bg-tertiary)"
                : "var(--text-primary)",
            color:
              isSubmitting ||
              isLoading ||
              !location.trim() ||
              !description.trim()
                ? "var(--text-secondary)"
                : "var(--text-inverse)",
            border: "2px solid var(--border-strong)",
            cursor:
              isSubmitting ||
              isLoading ||
              !location.trim() ||
              !description.trim()
                ? "not-allowed"
                : "pointer",
            opacity:
              isSubmitting ||
              isLoading ||
              !location.trim() ||
              !description.trim()
                ? 0.5
                : 1,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding Checkpoint...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Add Checkpoint Update
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
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .space-y-4 > div {
          animation: fadeSlideIn 0.4s ease-out backwards;
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
