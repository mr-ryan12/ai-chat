// Packages
import { useState, useEffect, useRef } from "react";
import { Link, useFetcher } from "@remix-run/react";

// Utils
import { formatRelativeDate, truncateText } from "~/utils/format";

// Types
import type { Conversation } from "~/types/conversation.types";

interface ConversationSidebarProps {
  conversations: Conversation[] | null;
  currentConversationId?: string;
  onNewConversation: () => void;
  onConversationSelect: (id: string) => void;
  onActiveConversationDeleted?: () => void;
  isMobile?: boolean;
}

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onNewConversation,
  onActiveConversationDeleted,
  isMobile = false,
}: ConversationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const deleteFetcher = useFetcher<{ success?: boolean; error?: string }>();
  const renameFetcher = useFetcher<{
    success?: boolean;
    title?: string;
    error?: string;
  }>();
  const deletedActiveRef = useRef(false);
  // Which card is being renamed, plus the in-progress input value.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Focus + select the rename input when editing begins (via a ref effect rather
  // than the autoFocus prop, which jsx-a11y disallows).
  const editInputRef = useRef<HTMLInputElement>(null);
  // Show the new title immediately while the rename round-trips + revalidates,
  // keyed by conversation id. Cleared once the fetcher settles.
  const [optimisticTitles, setOptimisticTitles] = useState<
    Record<string, string>
  >({});
  // Escape cancels without saving: set before unmounting the input so the unmount's
  // blur doesn't submit. Enter, by contrast, blurs the input and lets blur save.
  const skipBlurSubmitRef = useRef(false);
  // One-shot guard so the settle handler (clear optimistic + alert on error) runs
  // once per result, not on every unrelated re-render.
  const renameHandledRef = useRef(false);
  // Whether the current settled delete result has already been handled. Guards
  // against re-handling on unrelated re-renders (the effect's callback dep changes
  // identity each render), which would otherwise loop the failure alert().
  const handledResultRef = useRef(false);

  // Which conversation is mid-delete, read off the in-flight submission's action.
  const deletingConversationId =
    deleteFetcher.state !== "idle" && deleteFetcher.formAction
      ? deleteFetcher.formAction.split("/").slice(-2)[0]
      : null;

  // After a successful delete of the conversation currently being viewed, let the
  // route reset the chat (navigate home, or start a fresh draft). The sidebar list
  // refreshes via Remix loader revalidation — no full page reload.
  useEffect(() => {
    if (deleteFetcher.state !== "idle") {
      handledResultRef.current = false; // a new submission is in flight
      return;
    }
    if (!deleteFetcher.data || handledResultRef.current) return;
    handledResultRef.current = true;
    if (deleteFetcher.data.success && deletedActiveRef.current) {
      deletedActiveRef.current = false;
      onActiveConversationDeleted?.();
    } else if (deleteFetcher.data.error) {
      alert("Failed to delete conversation. Please try again.");
    }
  }, [deleteFetcher.state, deleteFetcher.data, onActiveConversationDeleted]);

  // Ensure conversations is always an array
  const safeConversations = conversations || [];

  // Animate only cards that are genuinely new — not the whole list on first paint.
  // `seenIdsRef` holds every id we've already rendered; it's seeded on the first
  // render (so nothing animates on load) and any id absent from it is treated as a
  // just-added card. Ids are added to the set after commit so they animate once.
  const seenIdsRef = useRef<Set<string> | null>(null);
  const isFirstRender = seenIdsRef.current === null;
  const seenIds = seenIdsRef.current ?? new Set<string>();
  if (isFirstRender) {
    // Seed with the ids present on load so none of them animate in.
    for (const conversation of safeConversations) seenIds.add(conversation.id);
    seenIdsRef.current = seenIds;
  }
  const isNewCard = (id: string): boolean => !isFirstRender && !seenIds.has(id);

  useEffect(() => {
    // Mark everything currently rendered as seen so it won't animate again.
    for (const conversation of safeConversations) {
      seenIds.add(conversation.id);
    }
  });

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(conversationId);
  };

  const handleDeleteConfirm = (conversationId: string) => {
    setShowDeleteConfirm(null);
    deletedActiveRef.current = conversationId === currentConversationId;
    deleteFetcher.submit(null, {
      method: "delete",
      action: `/api/conversation/${conversationId}/delete`,
    });
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (
    e: React.MouseEvent,
    conversationId: string,
    currentTitle: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(null);
    setEditingId(conversationId);
    setEditValue(currentTitle);
  };

  const cancelEditing = () => {
    // Skip the submit that the resulting blur would otherwise trigger.
    skipBlurSubmitRef.current = true;
    setEditingId(null);
  };

  const submitRename = (conversationId: string, originalTitle: string) => {
    setEditingId(null);
    const trimmed = editValue.trim();
    // No-op if unchanged or emptied — keep the existing title.
    if (!trimmed || trimmed === originalTitle) return;
    setOptimisticTitles((prev) => ({ ...prev, [conversationId]: trimmed }));
    renameFetcher.submit(
      { title: trimmed },
      {
        method: "patch",
        action: `/api/conversation/${conversationId}/rename`,
      },
    );
  };

  // The rename posts to a resource route, which revalidates the parent loader — so
  // the real title arrives in `conversations`. Clear the optimistic override once
  // that settles; on failure, clearing reverts the card to the server title.
  useEffect(() => {
    if (renameFetcher.state !== "idle") {
      renameHandledRef.current = false;
      return;
    }
    if (!renameFetcher.data || renameHandledRef.current) return;
    renameHandledRef.current = true;
    setOptimisticTitles({});
    if (renameFetcher.data.error) {
      alert("Failed to rename conversation. Please try again.");
    }
  }, [renameFetcher.state, renameFetcher.data]);

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-y-auto ${
        isCollapsed ? "w-16" : isMobile ? "w-80" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Conversations
            </h2>
          )}
          <div className="flex items-center space-x-2">
            {!isCollapsed && (
              <button
                type="button"
                onClick={onNewConversation}
                className="flex items-center btn-primary text-sm px-3 py-1.5"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {safeConversations.length === 0 ? (
          <div className="p-4 text-center">
            {!isCollapsed && (
              <div className="text-gray-500 dark:text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">
                  Start a new conversation to begin
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {safeConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative group ${
                  isNewCard(conversation.id) ? "animate-card-enter" : ""
                }`}
              >
                <Link
                  to={`/conversation/${conversation.id}`}
                  className={`block w-full text-left p-3 rounded-lg border transition-colors duration-200 ${
                    currentConversationId === conversation.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  aria-current={
                    currentConversationId === conversation.id
                      ? "page"
                      : undefined
                  }
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-1">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        {editingId === conversation.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            // Keep clicks inside the input from activating the
                            // surrounding <Link> (navigation).
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                // Let the resulting blur perform the single save.
                                e.currentTarget.blur();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditing();
                              }
                            }}
                            onBlur={() => {
                              if (skipBlurSubmitRef.current) {
                                skipBlurSubmitRef.current = false;
                                return;
                              }
                              submitRename(conversation.id, conversation.title);
                            }}
                            aria-label="Conversation title"
                            className="flex-1 min-w-0 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-blue-300 dark:border-blue-600 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1 min-w-0 truncate pr-2">
                              {optimisticTitles[conversation.id] ??
                                conversation.title}
                            </h3>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) =>
                                  startEditing(
                                    e,
                                    conversation.id,
                                    optimisticTitles[conversation.id] ??
                                      conversation.title,
                                  )
                                }
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200"
                                aria-label={`Rename conversation: ${truncateText(
                                  conversation.title,
                                  20,
                                )}`}
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                          <button
                            onClick={(e) =>
                              handleDeleteClick(e, conversation.id)
                            }
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-200"
                            aria-label={`Delete conversation: ${truncateText(
                              conversation.title,
                              20,
                            )}`}
                          >
                            {deletingConversationId === conversation.id ? (
                              <svg
                                className="w-3 h-3 text-red-500 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
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
                                className="w-3 h-3 text-gray-400 hover:text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
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
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(conversation.updatedAt)}
                      </p>
                    </div>
                  )}
                </Link>

                {/* Delete Confirmation Dialog */}
                {showDeleteConfirm === conversation.id && !isCollapsed && (
                  <div
                    role="dialog"
                    aria-label={`Delete conversation: ${truncateText(
                      conversation.title,
                      20,
                    )}`}
                    className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-lg z-10"
                  >
                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
                      Delete &ldquo;{truncateText(conversation.title, 20)}
                      &rdquo;?
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteConfirm(conversation.id)}
                        className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200"
                      >
                        Delete
                      </button>
                      <button
                        onClick={handleDeleteCancel}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {safeConversations.length} conversation
            {safeConversations.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
