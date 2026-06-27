import { useProjectionStore } from "../../store/projectionStore";
import type { Verse } from "../../api/bible";

export default function QueuePanel({ onClose }: { onClose: () => void }) {
  const queue = useProjectionStore((s) => s.queue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);
  const projectNext = useProjectionStore((s) => s.projectNext);
  const projectVerse = useProjectionStore((s) => s.projectVerse);

  const handleRemove = (index: number) => {
    removeFromQueue(index);
    if (queue.length <= 1) onClose();
  };

  const handleProject = (verse: Verse) => {
    projectVerse(verse);
    onClose();
  };

  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 4px)",
      width: 320, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
      background: "#0A0F1E", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      zIndex: 50,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#475569", textTransform: "uppercase" }}>
          Queue ({queue.length})
        </span>
        <button onClick={onClose} style={{ fontSize: 11, color: "#64748B", background: "none", border: "none", cursor: "pointer" }}>
          Close
        </button>
      </div>

      <div style={{ maxHeight: 288, overflowY: "auto" }}>
        {queue.length === 0 ? (
          <p style={{ padding: "24px 12px", textAlign: "center", fontSize: 11, color: "#475569", margin: 0 }}>Queue is empty</p>
        ) : (
          queue.map((v, i) => (
            <div key={`${v.reference || v.ref}-${i}`} style={{
              display: "flex", gap: 8, padding: "8px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              transition: "background 0.15s",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#C9973A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v.reference || v.ref}
                </span>
                <p style={{ fontSize: 11, color: "rgba(241,249,255,0.7)", lineHeight: 1.4, margin: "2px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {v.text}
                </p>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingTop: 1 }}>
                {i === 0 && (
                  <button
                    onClick={() => handleProject(v)}
                    style={{ height: 20, borderRadius: 3, background: "#C9973A", padding: "0 6px", fontSize: 9, fontWeight: 600, color: "#080D1C", border: "none", cursor: "pointer" }}
                  >
                    Go
                  </button>
                )}
                <button
                  onClick={() => handleRemove(i)}
                  style={{ height: 20, borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)", padding: "0 6px", fontSize: 9, color: "#64748B", background: "transparent", cursor: "pointer" }}
                >
                  &times;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => { projectNext(); onClose(); }}
            style={{ flex: 1, height: 28, borderRadius: 4, background: "#C9973A", fontSize: 10, fontWeight: 600, color: "#080D1C", border: "none", cursor: "pointer" }}
          >
            Project Next
          </button>
        </div>
      )}
    </div>
  );
}
