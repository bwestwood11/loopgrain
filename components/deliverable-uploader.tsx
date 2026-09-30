"use client";

import { useState } from "react";
import { completeDeliverableUpload, startDeliverableUpload } from "@/app/admin/actions";
import { formatBytes } from "@/lib/format";

// Uploads the finished edit straight to R2, then records it as the next version
// and marks the project delivered.

type State =
  | { phase: "idle" }
  | { phase: "uploading"; name: string; size: number; progress: number }
  | { phase: "saving"; name: string }
  | { phase: "error"; message: string };

function put(url: string, file: File, contentType: string, onProgress: (f: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error. Check the R2 CORS policy and retry."));
    xhr.send(file);
  });
}

export function DeliverableUploader({
  projectId,
  nextVersion,
}: {
  projectId: string;
  nextVersion: number;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const busy = state.phase === "uploading" || state.phase === "saving";

  async function upload(file: File) {
    const contentType = file.type || "video/mp4";
    try {
      setState({ phase: "uploading", name: file.name, size: file.size, progress: 0 });
      const start = await startDeliverableUpload(projectId, { fileName: file.name, contentType });
      if (!start.ok) throw new Error(start.error);
      await put(start.uploadUrl, file, contentType, (progress) =>
        setState({ phase: "uploading", name: file.name, size: file.size, progress }),
      );
      setState({ phase: "saving", name: file.name });
      const done = await completeDeliverableUpload(projectId, start.storageKey);
      if (!done.ok) throw new Error(done.error);
      setState({ phase: "idle" });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition focus-within:border-cobalt ${
          busy ? "border-line opacity-70" : "cursor-pointer border-line bg-paper hover:border-slate"
        }`}
      >
        <span className="font-semibold">
          {nextVersion === 1 ? "Upload the finished edit" : `Upload v${nextVersion}`}
        </span>
        <span className="mt-1 text-sm text-slate">
          The customer can watch and download it as soon as it&apos;s uploaded.
        </span>
        <input
          type="file"
          accept="video/*"
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </label>

      {state.phase === "uploading" && (
        <div className="mt-3" aria-live="polite">
          <p className="text-sm">
            {state.name} · {formatBytes(state.size)} · {Math.round(state.progress * 100)}%
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stock">
            <div
              className="h-full rounded-full bg-cobalt transition-[width]"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
      {state.phase === "saving" && (
        <p className="mt-3 text-sm" aria-live="polite">
          Delivering {state.name}…
        </p>
      )}
      {state.phase === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {state.message}
        </p>
      )}
    </div>
  );
}
