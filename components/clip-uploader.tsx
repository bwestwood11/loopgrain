"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { completeClipUpload, startClipUpload, submitProject } from "@/app/dashboard/actions";
import { formatBytes, formatDuration } from "@/lib/format";
import { MAX_CLIP_BYTES, MAX_CLIP_SECONDS, MAX_CLIPS_PER_PROJECT } from "@/lib/pricing";

// Files go from the browser straight to R2 with presigned URLs; Vercel
// functions can't accept request bodies anywhere near phone-video size.

const CONCURRENCY = 3;

const TYPES_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

type Item = {
  key: string;
  name: string;
  size: number;
  duration: number | null;
  status: "checking" | "queued" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
  retryable?: boolean;
  clipId?: string;
};

function contentTypeOf(file: File) {
  if (file.type.startsWith("video/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_BY_EXT[ext] ?? null;
}

// Browsers can't read every codec (HEVC .mov in Chrome on Windows, for one),
// so an unreadable length is allowed through and checked by the editor.
function readDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 10_000);
    video.src = url;
  });
}

function put(
  url: string,
  file: File,
  contentType: string,
  xhrs: Map<string, XMLHttpRequest>,
  key: string,
  onProgress: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrs.set(key, xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error. Check your connection and retry."));
    xhr.onabort = () => reject(new Error("Cancelled"));
    xhr.onloadend = () => xhrs.delete(key);
    xhr.send(file);
  });
}

export function ClipUploader({
  projectId,
  uploadedIds,
}: {
  projectId: string;
  uploadedIds: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [submitting, startSubmit] = useTransition();

  const files = useRef(new Map<string, File>());
  const durations = useRef(new Map<string, number | null>());
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const queue = useRef<string[]>([]);
  const active = useRef(0);

  // Finished uploads drop out of this list once the server-rendered clip list includes them.
  const visible = items.filter(
    (i) => !(i.status === "done" && i.clipId && uploadedIds.includes(i.clipId)),
  );
  const busy = items.some((i) => ["checking", "queued", "uploading", "saving"].includes(i.status));

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function upload(key: string) {
    const file = files.current.get(key);
    if (!file) return;
    const contentType = contentTypeOf(file)!;
    try {
      update(key, { status: "uploading", progress: 0 });
      const start = await startClipUpload(projectId, {
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        durationSeconds: durations.current.get(key) ?? null,
      });
      if (!start.ok) throw new Error(start.error);
      if (!files.current.has(key)) return; // cancelled while we were asking for a URL
      update(key, { clipId: start.clipId });

      await put(start.uploadUrl, file, contentType, xhrs.current, key, (progress) =>
        update(key, { progress }),
      );

      update(key, { status: "saving", progress: 1 });
      const done = await completeClipUpload(start.clipId);
      if (!done.ok) throw new Error("We couldn't confirm the upload. Retry to send it again.");

      files.current.delete(key);
      update(key, { status: "done" });
      router.refresh();
    } catch (err) {
      if (!files.current.has(key)) return; // removed by the user mid-upload
      update(key, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
        retryable: true,
      });
    }
  }

  function pump() {
    while (active.current < CONCURRENCY && queue.current.length > 0) {
      const key = queue.current.shift()!;
      active.current++;
      upload(key).finally(() => {
        active.current--;
        pump();
      });
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const slots =
      MAX_CLIPS_PER_PROJECT -
      uploadedIds.length -
      items.filter((i) => i.status !== "error" && i.status !== "done").length;

    const added: Item[] = Array.from(list).map((file, index) => {
      const key = crypto.randomUUID();
      const base = { key, name: file.name, size: file.size, duration: null, progress: 0 };
      if (index >= slots) {
        return {
          ...base,
          status: "error",
          error: `A project can hold up to ${MAX_CLIPS_PER_PROJECT} clips.`,
        };
      }
      if (!contentTypeOf(file))
        return { ...base, status: "error", error: "This isn't a video file." };
      if (file.size > MAX_CLIP_BYTES)
        return { ...base, status: "error", error: "Clips must be under 2 GB." };
      files.current.set(key, file);
      return { ...base, status: "checking" };
    });
    setItems((prev) => [...prev, ...added]);

    // Check lengths before queueing so long clips fail fast instead of after a big upload.
    await Promise.all(
      added
        .filter((i) => i.status === "checking")
        .map(async (item) => {
          const duration = await readDuration(files.current.get(item.key)!);
          if (duration !== null && duration > MAX_CLIP_SECONDS + 0.5) {
            files.current.delete(item.key);
            update(item.key, {
              duration,
              status: "error",
              error: `This clip is ${formatDuration(duration)}. Trim it to ${MAX_CLIP_SECONDS} seconds or less.`,
            });
            return;
          }
          durations.current.set(item.key, duration);
          update(item.key, { duration, status: "queued" });
          queue.current.push(item.key);
          pump();
        }),
    );
  }

  function remove(key: string) {
    files.current.delete(key);
    queue.current = queue.current.filter((k) => k !== key);
    xhrs.current.get(key)?.abort();
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function retry(key: string) {
    if (!files.current.has(key)) return;
    update(key, {
      status: "queued",
      error: undefined,
      retryable: false,
      progress: 0,
      clipId: undefined,
    });
    queue.current.push(key);
    pump();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition focus-within:border-cobalt ${
          dragging ? "border-cobalt bg-[#dfe5ff]" : "border-line bg-paper hover:border-slate"
        }`}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="text-cobalt">
          <rect
            x="11"
            y="4"
            width="18"
            height="32"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M20 26V14m-5 5 5-5 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="mt-3 font-semibold">
          Drop clips here or{" "}
          <span className="text-cobalt underline underline-offset-2">choose files</span>
        </span>
        <span className="mt-1 text-sm text-slate">
          Select several at once. Each clip {MAX_CLIP_SECONDS} seconds or shorter, up to{" "}
          {MAX_CLIPS_PER_PROJECT} per video.
        </span>
        <input
          type="file"
          accept="video/*,.mov,.mp4,.m4v"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {visible.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {visible.map((item) => (
            <li
              key={item.key}
              className="rounded-xl bg-paper px-4 py-3 shadow-[0_1px_0_var(--color-line)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p
                    className={`text-xs ${item.status === "error" ? "text-red-700" : "text-slate"}`}
                  >
                    {item.status === "error"
                      ? item.error
                      : `${formatBytes(item.size)}${item.duration !== null ? ` · ${formatDuration(item.duration)}` : ""} · ${statusText(item)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.status === "error" && item.retryable && (
                    <button
                      type="button"
                      onClick={() => retry(item.key)}
                      className="rounded-full px-3 py-1.5 text-sm font-medium text-cobalt hover:bg-stock"
                    >
                      Retry
                    </button>
                  )}
                  {item.status !== "done" && item.status !== "saving" && (
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      aria-label={`Remove ${item.name}`}
                      className="rounded-full px-3 py-1.5 text-sm font-medium text-slate hover:bg-stock hover:text-ink"
                    >
                      {item.status === "error" ? "Dismiss" : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
              {(item.status === "uploading" || item.status === "saving") && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stock">
                  <div
                    className="h-full rounded-full bg-cobalt transition-[width]"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-2xl bg-ink p-5 text-paper sm:flex sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-paper/70">
          {uploadedIds.length === 0
            ? "Upload at least one clip to send this project to your editor."
            : busy
              ? "Hang tight while your clips finish uploading."
              : `${uploadedIds.length} ${uploadedIds.length === 1 ? "clip" : "clips"} ready. You can't add more once it's sent.`}
        </p>
        <button
          type="button"
          disabled={uploadedIds.length === 0 || busy || submitting}
          onClick={() =>
            startSubmit(async () => {
              setSubmitError(undefined);
              const result = await submitProject(projectId);
              if (result?.error) setSubmitError(result.error);
            })
          }
          className="mt-4 w-full shrink-0 rounded-full bg-caption px-6 py-3 font-semibold text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-caption sm:mt-0 sm:w-auto"
        >
          {submitting ? "Sending…" : "Send to editor"}
        </button>
      </div>
      {submitError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {submitError}
        </p>
      )}
    </div>
  );
}

function statusText(item: Item) {
  switch (item.status) {
    case "checking":
      return "Checking…";
    case "queued":
      return "Waiting…";
    case "uploading":
      return `${Math.round(item.progress * 100)}%`;
    case "saving":
      return "Finishing…";
    default:
      return "Uploaded";
  }
}
