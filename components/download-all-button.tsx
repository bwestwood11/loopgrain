"use client";

// Starts each download in turn. Chrome asks once to allow multiple downloads.
export function DownloadAllButton({ urls }: { urls: string[] }) {
  return (
    <button
      type="button"
      onClick={() =>
        urls.forEach((url, i) =>
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = url;
            a.click();
          }, i * 600),
        )
      }
      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-cobalt"
    >
      Download all ({urls.length})
    </button>
  );
}
