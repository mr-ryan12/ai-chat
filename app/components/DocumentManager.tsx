// Packages
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";

// Utils
import { formatRelativeDate } from "~/utils/format";

// Types
import type { DocumentListItem } from "~/types/document.types";

export default function DocumentManager() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Delete error is held in state (not derived) so it can be cleared when the dialog
  // opens/closes — otherwise a past failure's banner would reappear on reopen.
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Native <dialog> via showModal(): the browser renders it in the top layer
  // (escapes ancestor stacking/containing-block traps — no portal needed), traps
  // focus, restores focus on close, and handles Escape + the ::backdrop overlay.
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Data + mutations go through Remix resource routes via useFetcher, not raw fetch.
  const listFetcher = useFetcher<{
    documents: DocumentListItem[];
    error?: string;
  }>();
  const deleteFetcher = useFetcher<{ success?: boolean; error?: string }>();

  // Derived view state (fetchers are the source of truth — no local mirror).
  const documents = listFetcher.data?.documents ?? [];
  const hasLoaded = listFetcher.data !== undefined;
  const loadError = listFetcher.data?.error ?? null;

  // Which row is mid-delete, read off the in-flight submission's action path.
  const activeDeletePath = deleteFetcher.formAction;
  const deletingId =
    deleteFetcher.state !== "idle" && activeDeletePath
      ? activeDeletePath.split("/").slice(-2)[0]
      : null;

  const open = () => {
    setConfirmId(null);
    setDeleteError(null);
    listFetcher.load("/api/documents");
    dialogRef.current?.showModal();
    // showModal() makes the background inert but does not lock scroll — do it here.
    document.body.style.overflow = "hidden";
  };

  const close = () => dialogRef.current?.close();

  // Reset transient state and release the scroll lock whenever the dialog closes —
  // covers Escape, backdrop click, and the close button via the single native `close`.
  const handleClose = () => {
    setConfirmId(null);
    setDeleteError(null);
    document.body.style.overflow = "";
  };

  // Safety net: if the component unmounts while the dialog is open, restore scroll.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Light dismiss: a click whose target is the <dialog> itself landed on the
  // ::backdrop (the padding gutter), not the card — so close.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  // The list comes from a fetcher.load (not a route loader), so it isn't
  // auto-revalidated by the delete submission — refresh it once per successful delete.
  const reloadedForDelete = useRef(false);
  useEffect(() => {
    if (deleteFetcher.state === "submitting") {
      reloadedForDelete.current = false;
    }
    if (deleteFetcher.state === "idle" && deleteFetcher.data) {
      // Reflect the latest delete result (clears on success, shows the message on error).
      setDeleteError(deleteFetcher.data.error ?? null);
      if (deleteFetcher.data.success && !reloadedForDelete.current) {
        reloadedForDelete.current = true;
        listFetcher.load("/api/documents");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteFetcher.state, deleteFetcher.data]);

  const handleDelete = (id: string) => {
    setConfirmId(null);
    deleteFetcher.submit(null, {
      method: "delete",
      action: `/api/document/${id}/delete`,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Documents"
        className="flex items-center gap-1.5 p-2 md:px-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        aria-label="Documents"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        {/* Visible label on desktop; icon-only on mobile to save header space. */}
        <span className="hidden md:inline text-sm font-medium">Documents</span>
      </button>

      {/* Light dismiss is a mouse-only affordance — keyboard users close via the
          native Escape handling, so a keyboard listener here would be redundant. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onClick={handleBackdropClick}
        aria-label="Your documents"
        className="dialog-animated fixed inset-0 z-50 w-full max-w-none h-full max-h-none items-center justify-center bg-transparent p-4"
      >
        <div className="w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your Documents
            </h2>
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {deleteError && (
              <p
                className="text-sm text-red-600 dark:text-red-400 mb-3"
                role="alert"
              >
                {deleteError}
              </p>
            )}

            {!hasLoaded ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Loading documents…
              </p>
            ) : loadError ? (
              <p
                className="text-sm text-red-600 dark:text-red-400 text-center py-8"
                role="alert"
              >
                {loadError}
              </p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No documents uploaded yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.title ?? "Untitled document"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(doc.createdAt)}
                      </p>
                    </div>

                    {confirmId === doc.id ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(doc.id)}
                        disabled={deletingId === doc.id}
                        className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
                        aria-label={`Delete ${doc.title ?? "document"}`}
                      >
                        {deletingId === doc.id ? (
                          <svg
                            className="w-4 h-4 text-red-500 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
