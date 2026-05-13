"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  createKnowledgeResource,
  inferResourceTypeFromFile,
  updateKnowledgeResource,
  validateResourceFile,
  type KnowledgeResource,
  type ResourceType,
  type ResourceVisibility,
} from "@/lib/repository";
import { cn } from "@/lib/utils";
import type { BackendUser } from "@/lib/mockUser";

type SessionResourceContext = {
  sessionId: string;
  sessionTitle: string;
  participantIds: string[];
};

type ResourceComposerProps = {
  open: boolean;
  currentUser: BackendUser;
  initialResource?: KnowledgeResource | null;
  sessionContext?: SessionResourceContext;
  onClose: () => void;
  onSaved: (resource?: KnowledgeResource) => void;
};

const typeOptions: Array<{
  value: ResourceType;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: "pdf", label: "PDF", description: "Guides, decks, worksheets", icon: "picture_as_pdf" },
  { value: "markdown", label: "Markdown", description: "Structured notes", icon: "markdown" },
  { value: "rich-text", label: "Rich Note", description: "Readable session takeaways", icon: "article" },
  { value: "code", label: "Code", description: "Snippets and examples", icon: "data_object" },
  { value: "link", label: "Link", description: "Articles, videos, docs", icon: "link" },
  { value: "image", label: "Image", description: "Screenshots and references", icon: "image" },
  { value: "file", label: "Resource", description: "Templates and files", icon: "attach_file" },
];

const fileBackedTypes: ResourceType[] = ["pdf", "image", "file"];
const textBackedTypes: ResourceType[] = ["markdown", "rich-text", "code"];

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function defaultType(resource?: KnowledgeResource | null): ResourceType {
  return resource?.type ?? "rich-text";
}

function visibilityCopy(visibility: ResourceVisibility) {
  if (visibility === "public") return "Community";
  if (visibility === "shared") return "Session";
  return "Private";
}

export function ResourceComposer({
  open,
  currentUser,
  initialResource,
  sessionContext,
  onClose,
  onSaved,
}: ResourceComposerProps) {
  const isEditing = Boolean(initialResource);
  const [type, setType] = useState<ResourceType>(() => defaultType(initialResource));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>(
    sessionContext ? "shared" : "public",
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [content, setContent] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [slowUpload, setSlowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slowUploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;

    setType(defaultType(initialResource));
    setTitle(initialResource?.title ?? "");
    setDescription(initialResource?.description ?? "");
    setTags(initialResource?.tags.join(", ") ?? "");
    setVisibility(initialResource?.visibility ?? (sessionContext ? "shared" : "public"));
    setExternalUrl(initialResource?.externalUrl ?? "");
    setContent(initialResource?.content ?? "");
    setCodeLanguage(initialResource?.codeLanguage ?? "");
    setFile(null);
    setUploadProgress(0);
    setSaving(false);
    setSlowUpload(false);
    setError(null);
    if (slowUploadTimerRef.current) clearTimeout(slowUploadTimerRef.current);
  }, [open, initialResource, sessionContext]);

  const selectedType = useMemo(
    () => typeOptions.find((option) => option.value === type) ?? typeOptions[0],
    [type],
  );

  const hasExistingFile = Boolean(initialResource?.fileUrl);
  const canChangeResourceType = !isEditing || !hasExistingFile;
  const requiresFile = fileBackedTypes.includes(type) && !hasExistingFile;
  const acceptsText = textBackedTypes.includes(type);

  const handleFileChange = useCallback((nextFile: File | null) => {
    setError(null);
    setFile(null);

    if (!nextFile) return;

    try {
      validateResourceFile(nextFile);
      const inferredType = inferResourceTypeFromFile(nextFile);
      if (type === "file" || fileBackedTypes.includes(inferredType)) {
        setType(inferredType);
      }
      setFile(nextFile);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "This file cannot be shared.");
    }
  }, [type]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setSlowUpload(false);
    setError(null);

    // Show a hint if the upload takes > 20 seconds
    slowUploadTimerRef.current = setTimeout(() => setSlowUpload(true), 20_000);

    try {
      if (isEditing && initialResource) {
        await updateKnowledgeResource(
          initialResource.id,
          { title, description, type, tags: parseTags(tags), visibility, externalUrl, content, codeLanguage },
          currentUser._id,
        );
        onSaved(initialResource);
        return;
      }

      const resource = await createKnowledgeResource(
        {
          title,
          description,
          type,
          tags: parseTags(tags),
          visibility,
          externalUrl,
          content,
          codeLanguage,
          file,
          uploaderId: currentUser._id,
          uploaderName: currentUser.name,
          uploaderAvatar: currentUser.avatar,
          sessionId: sessionContext?.sessionId,
          sessionParticipantIds: sessionContext?.participantIds,
        },
        setUploadProgress,
      );

      onSaved(resource);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save this resource right now.",
      );
    } finally {
      setSaving(false);
      setSlowUpload(false);
      if (slowUploadTimerRef.current) clearTimeout(slowUploadTimerRef.current);
    }
  }, [
    isEditing, initialResource, title, description, type, tags, visibility,
    externalUrl, content, codeLanguage, currentUser, file, sessionContext, onSaved,
  ]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close resource composer"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <section className="fixed inset-x-3 top-1/2 z-50 max-h-[92vh] -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-2xl sm:inset-x-6 lg:left-1/2 lg:w-full lg:max-w-5xl lg:-translate-x-1/2">
        <div className="grid min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="border-b border-outline-variant/20 bg-surface-container p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Knowledge Hub
                </p>
                <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
                  {isEditing ? "Refine Resource" : "Share Resource"}
                </h2>
                {sessionContext ? (
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Linked to {sessionContext.sessionTitle}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Add something useful to the shared learning library.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant transition hover:bg-surface-container-high"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {typeOptions.map((option) => {
                const isActive = option.value === type;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canChangeResourceType}
                    onClick={() => setType(option.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:border-primary/40",
                      !canChangeResourceType && !isActive ? "cursor-not-allowed opacity-40" : "",
                    )}
                  >
                    <Icon name={option.icon} className="mb-2 text-xl" />
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="mt-1 block text-xs leading-snug text-on-surface-variant">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-5 p-5 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 rounded-lg bg-surface-container px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={selectedType.icon} />
              </div>
              <div>
                <p className="text-sm font-bold">{selectedType.label}</p>
                <p className="text-xs text-on-surface-variant">{selectedType.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Name the concept, skill, or takeaway"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Why it matters
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={360}
                  placeholder="Describe what someone will learn from it."
                  className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Skill Tags
                </span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="React, System Design, Interview Prep"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            </div>

            {type === "link" ? (
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Learning Link
                </span>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            ) : null}

            {acceptsText ? (
              <div className="space-y-3">
                {type === "code" ? (
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                      Language
                    </span>
                    <input
                      value={codeLanguage}
                      onChange={(event) => setCodeLanguage(event.target.value)}
                      placeholder="TypeScript"
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                ) : null}
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    {type === "code" ? "Snippet" : "Learning Notes"}
                  </span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={8}
                    placeholder={
                      type === "markdown"
                        ? "Use markdown headings, bullets, and links..."
                        : type === "code"
                          ? "Paste the focused snippet here..."
                          : "Write the key ideas, steps, and takeaways..."
                    }
                    className={cn(
                      "w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15",
                      type === "code" ? "font-mono text-xs leading-relaxed" : "",
                    )}
                  />
                </label>
              </div>
            ) : null}

            {fileBackedTypes.includes(type) ? (
              <div className="space-y-3">
                {hasExistingFile ? (
                  <div className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-3">
                    <p className="text-sm font-semibold text-on-surface">
                      {initialResource?.fileName ?? "Attached resource"}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      File replacement can be added later. Metadata is editable now.
                    </p>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface px-5 py-8 text-center transition hover:border-primary/60 hover:bg-primary/5">
                    <Icon name="cloud_upload" className="text-4xl text-primary" />
                    <span className="mt-3 text-sm font-bold">
                      Choose a PDF, image, or learning file
                    </span>
                    <span className="mt-1 text-xs text-on-surface-variant">
                      Up to 25MB with progress tracking
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.md,.txt,.csv,.json,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,application/pdf"
                      onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                    />
                  </label>
                )}

                {file ? (
                  <div className="rounded-lg bg-surface-container px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{file.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-on-surface-variant transition hover:text-error"
                      >
                        <Icon name="close" className="text-base" />
                      </button>
                    </div>
                    {saving && requiresFile ? (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              {(["public", "private", "shared"] as ResourceVisibility[]).map((option) => {
                const disabled = option === "shared" && !sessionContext;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVisibility(option)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition",
                      visibility === option
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/30 bg-surface text-on-surface hover:border-primary/40",
                      disabled ? "cursor-not-allowed opacity-45" : "",
                    )}
                  >
                    <span className="block text-sm font-bold">{visibilityCopy(option)}</span>
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      {option === "public"
                        ? "Discoverable by members"
                        : option === "shared"
                          ? "Only session participants"
                          : "Only you"}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <p className="rounded-lg bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {error}
              </p>
            ) : null}

            {slowUpload && saving ? (
              <p className="rounded-lg bg-primary/5 px-4 py-3 text-sm text-on-surface-variant">
                <span className="font-semibold text-primary">Still uploading…</span> Large files can take a moment. Please stay on this page.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-outline-variant/40 px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
                ) : (
                  <Icon name={isEditing ? "save" : "ios_share"} className="text-base" />
                )}
                {saving ? "Saving..." : isEditing ? "Save Resource" : "Share Resource"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
