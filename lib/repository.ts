import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as limitQuery,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

export const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024;

export type ResourceType =
  | "pdf"
  | "markdown"
  | "rich-text"
  | "code"
  | "link"
  | "image"
  | "file";

export type ResourceVisibility = "public" | "private" | "shared";

export type ResourceUploadStatus = "ready" | "uploading" | "failed";

export type ResourceAiMetadata = {
  summary?: string | null;
  suggestedTags?: string[];
  category?: string | null;
  embeddingStatus?: "not_started" | "queued" | "ready" | "failed";
};

export type FirestoreResourceDocument = {
  title: string;
  titleLower: string;
  description: string;
  type: ResourceType;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar?: string;
  tags: string[];
  tagSlugs: string[];
  sessionId?: string | null;
  sessionParticipantIds?: string[];
  fileUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  externalUrl?: string;
  content?: string;
  contentFormat?: "plain" | "markdown" | "rich-text" | "code";
  codeLanguage?: string;
  likesCount: number;
  bookmarksCount: number;
  downloadsCount: number;
  visibility: ResourceVisibility;
  uploadStatus: ResourceUploadStatus;
  ai?: ResourceAiMetadata;
  searchText: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type KnowledgeResource = FirestoreResourceDocument & {
  id: string;
  createdAtMillis: number;
  updatedAtMillis: number;
};

export type ResourceViewerState = {
  likedResourceIds: Set<string>;
  bookmarkedResourceIds: Set<string>;
};

export type CreateResourceInput = {
  title: string;
  description: string;
  type: ResourceType;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar?: string;
  tags: string[];
  visibility: ResourceVisibility;
  sessionId?: string | null;
  sessionParticipantIds?: string[];
  file?: File | null;
  externalUrl?: string;
  content?: string;
  codeLanguage?: string;
};

export type UpdateResourceInput = Pick<
  CreateResourceInput,
  | "title"
  | "description"
  | "type"
  | "tags"
  | "visibility"
  | "externalUrl"
  | "content"
  | "codeLanguage"
>;

export type ResourcePageCursor = QueryDocumentSnapshot<DocumentData> | null;

export type ResourcePage = {
  resources: KnowledgeResource[];
  cursor: ResourcePageCursor;
  hasMore: boolean;
};

const resourcesCollection = collection(db, "resources");
const likesCollection = collection(db, "resourceLikes");
const bookmarksCollection = collection(db, "resourceBookmarks");

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const allowedExtensions = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "md",
  "txt",
  "csv",
  "json",
  "zip",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
]);

function toMillis(value: unknown) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  return 0;
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  );
}

function tagSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildSearchText(input: {
  title: string;
  description: string;
  tags: string[];
  uploaderName: string;
  type: ResourceType;
  content?: string;
  externalUrl?: string;
}) {
  return [
    input.title,
    input.description,
    input.tags.join(" "),
    input.uploaderName,
    input.type,
    input.content?.slice(0, 500),
    input.externalUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sanitizeFileName(name: string) {
  const normalized = name.trim().replace(/\s+/g, "-");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120) || "resource";
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function formatResourceFileSize(size?: number) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferResourceTypeFromFile(file: File): ResourceType {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "file";
}

export function validateResourceFile(file: File) {
  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    throw new Error("Resources can be up to 25MB. Choose a smaller file to share.");
  }

  const extension = fileExtension(file);
  const isKnownImage = file.type.startsWith("image/");
  const isKnownType = allowedMimeTypes.has(file.type);
  const isKnownExtension = allowedExtensions.has(extension);

  if (!isKnownImage && !isKnownType && !isKnownExtension) {
    throw new Error("That file type is not supported for learning resources yet.");
  }
}

function normalizeResource(id: string, data: Partial<FirestoreResourceDocument> & Record<string, unknown>): KnowledgeResource {
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const createdAtMillis = toMillis(data.createdAt);
  const updatedAtMillis = toMillis(data.updatedAt) || createdAtMillis;

  return {
    id,
    title: String(data.title ?? "Untitled resource"),
    titleLower: String(data.titleLower ?? data.title ?? "untitled resource").toLowerCase(),
    description: String(data.description ?? ""),
    type: (data.type as ResourceType) ?? "file",
    uploaderId: String(data.uploaderId ?? data.userId ?? ""),
    uploaderName: String(data.uploaderName ?? data.authorName ?? "SkillCache Member"),
    uploaderAvatar: typeof data.uploaderAvatar === "string" ? data.uploaderAvatar : undefined,
    tags,
    tagSlugs: Array.isArray(data.tagSlugs) ? (data.tagSlugs as string[]) : tags.map(tagSlug),
    sessionId: typeof data.sessionId === "string" ? data.sessionId : null,
    sessionParticipantIds: Array.isArray(data.sessionParticipantIds)
      ? (data.sessionParticipantIds as string[])
      : [],
    fileUrl: typeof data.fileUrl === "string" ? data.fileUrl : undefined,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    fileSize: typeof data.fileSize === "number" ? data.fileSize : undefined,
    contentType: typeof data.contentType === "string" ? data.contentType : undefined,
    externalUrl: typeof data.externalUrl === "string" ? data.externalUrl : undefined,
    content: typeof data.content === "string" ? data.content : undefined,
    contentFormat: (data.contentFormat as FirestoreResourceDocument["contentFormat"]) ?? "plain",
    codeLanguage: typeof data.codeLanguage === "string" ? data.codeLanguage : undefined,
    likesCount: Number(data.likesCount ?? 0),
    bookmarksCount: Number(data.bookmarksCount ?? 0),
    downloadsCount: Number(data.downloadsCount ?? 0),
    visibility: (data.visibility as ResourceVisibility) ?? "public",
    uploadStatus: (data.uploadStatus as ResourceUploadStatus) ?? "ready",
    ai: (data.ai as ResourceAiMetadata) ?? {
      summary: null,
      suggestedTags: [],
      category: null,
      embeddingStatus: "not_started",
    },
    searchText: String(data.searchText ?? ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdAtMillis,
    updatedAtMillis,
  };
}

function getContentFormat(type: ResourceType): FirestoreResourceDocument["contentFormat"] | undefined {
  if (type === "markdown") return "markdown";
  if (type === "rich-text") return "rich-text";
  if (type === "code") return "code";
  return undefined;
}

function validateCreateInput(input: CreateResourceInput) {
  if (!input.title.trim()) throw new Error("Give this resource a clear title.");
  if (!input.description.trim()) throw new Error("Add a short description so others know when to use it.");

  if (input.type === "link" && !input.externalUrl?.trim()) {
    throw new Error("Add the learning link you want to share.");
  }

  if (["markdown", "rich-text", "code"].includes(input.type) && !input.content?.trim()) {
    throw new Error("Write the note or snippet before sharing it.");
  }

  if (["pdf", "image", "file"].includes(input.type) && !input.file) {
    throw new Error("Choose a file to attach to this resource.");
  }

  if (input.file) validateResourceFile(input.file);
}

function buildStoragePath(input: CreateResourceInput, resourceId: string, type: ResourceType) {
  const file = input.file;
  if (!file) return undefined;

  const timestamp = Date.now();
  return `repository/${input.uploaderId}/${type}/${resourceId}/${timestamp}-${sanitizeFileName(file.name)}`;
}

export async function createKnowledgeResource(
  input: CreateResourceInput,
  onUploadProgress?: (progress: number) => void,
) {
  validateCreateInput(input);

  const inferredType = input.file ? inferResourceTypeFromFile(input.file) : input.type;
  const type = input.type === "file" ? inferredType : input.type;
  const tags = normalizeTags(input.tags);
  const resourceRef = doc(resourcesCollection);
  const storagePath = buildStoragePath(input, resourceRef.id, type);
  const now = serverTimestamp();

  const baseDocument: FirestoreResourceDocument = {
    title: input.title.trim(),
    titleLower: input.title.trim().toLowerCase(),
    description: input.description.trim(),
    type,
    uploaderId: input.uploaderId,
    uploaderName: input.uploaderName,
    uploaderAvatar: input.uploaderAvatar,
    tags,
    tagSlugs: tags.map(tagSlug),
    sessionId: input.sessionId ?? null,
    sessionParticipantIds: input.sessionParticipantIds ?? [],
    externalUrl: input.type === "link" ? input.externalUrl?.trim() : undefined,
    content: input.content?.trim() || undefined,
    contentFormat: getContentFormat(type),
    codeLanguage: input.type === "code" ? input.codeLanguage?.trim() || "Text" : undefined,
    fileName: input.file?.name,
    fileSize: input.file?.size,
    contentType: input.file?.type,
    storagePath,
    likesCount: 0,
    bookmarksCount: 0,
    downloadsCount: 0,
    visibility: input.visibility,
    uploadStatus: input.file ? "uploading" : "ready",
    ai: {
      summary: null,
      suggestedTags: [],
      category: null,
      embeddingStatus: "not_started",
    },
    searchText: buildSearchText({
      title: input.title,
      description: input.description,
      tags,
      uploaderName: input.uploaderName,
      type,
      content: input.content,
      externalUrl: input.externalUrl,
    }),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(resourceRef, withoutUndefined(baseDocument));

  if (!input.file || !storagePath) {
    return resourceRef.id;
  }

  try {
    const uploadTask = uploadBytesResumable(ref(storage, storagePath), input.file, {
      contentType: input.file.type || undefined,
      customMetadata: {
        uploaderId: input.uploaderId,
        resourceId: resourceRef.id,
        resourceType: type,
        visibility: input.visibility,
        sessionId: input.sessionId ?? "",
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onUploadProgress?.(progress);
        },
        reject,
        () => resolve(),
      );
    });

    const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
    await updateDoc(resourceRef, {
      fileUrl,
      uploadStatus: "ready",
      updatedAt: serverTimestamp(),
    });

    return resourceRef.id;
  } catch (error) {
    await updateDoc(resourceRef, {
      uploadStatus: "failed",
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
    throw error;
  }
}

export async function updateKnowledgeResource(resourceId: string, input: UpdateResourceInput, currentUserId: string) {
  if (!input.title.trim()) throw new Error("Give this resource a clear title.");
  if (!input.description.trim()) throw new Error("Add a short description for the resource.");

  const resourceRef = doc(resourcesCollection, resourceId);
  const resourceSnap = await getDoc(resourceRef);
  if (!resourceSnap.exists()) throw new Error("This resource could not be found.");

  const existing = normalizeResource(resourceSnap.id, resourceSnap.data());
  if (existing.uploaderId !== currentUserId) {
    throw new Error("Only the contributor can edit this resource.");
  }

  const tags = normalizeTags(input.tags);
  await updateDoc(resourceRef, {
    title: input.title.trim(),
    titleLower: input.title.trim().toLowerCase(),
    description: input.description.trim(),
    type: input.type,
    tags,
    tagSlugs: tags.map(tagSlug),
    visibility: input.visibility,
    externalUrl: input.type === "link" ? input.externalUrl?.trim() || null : null,
    content: ["markdown", "rich-text", "code"].includes(input.type)
      ? input.content?.trim() || null
      : null,
    contentFormat: getContentFormat(input.type) ?? null,
    codeLanguage: input.type === "code" ? input.codeLanguage?.trim() || "Text" : null,
    searchText: buildSearchText({
      title: input.title,
      description: input.description,
      tags,
      uploaderName: existing.uploaderName,
      type: input.type,
      content: input.content,
      externalUrl: input.externalUrl,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function getKnowledgeResource(resourceId: string) {
  const snap = await getDoc(doc(resourcesCollection, resourceId));
  if (!snap.exists()) return null;
  return normalizeResource(snap.id, snap.data());
}

export async function listRepositoryResources(options: {
  scope: "community" | "mine";
  userId?: string;
  pageSize?: number;
  cursor?: ResourcePageCursor;
}): Promise<ResourcePage> {
  const pageSize = options.pageSize ?? 18;
  const constraints: QueryConstraint[] = [];

  if (options.scope === "community") {
    constraints.push(where("visibility", "==", "public"));
  } else {
    if (!options.userId) return { resources: [], cursor: null, hasMore: false };
    constraints.push(where("uploaderId", "==", options.userId));
  }

  constraints.push(orderBy("createdAt", "desc"));
  if (options.cursor) constraints.push(startAfter(options.cursor));
  constraints.push(limitQuery(pageSize + 1));

  const snap = await getDocs(query(resourcesCollection, ...constraints));
  const docs = snap.docs.slice(0, pageSize);

  return {
    resources: docs.map((item) => normalizeResource(item.id, item.data())),
    cursor: docs.at(-1) ?? null,
    hasMore: snap.docs.length > pageSize,
  };
}

export async function listSavedResources(userId: string): Promise<KnowledgeResource[]> {
  if (!userId) return [];

  const bookmarksSnap = await getDocs(
    query(bookmarksCollection, where("userId", "==", userId), orderBy("createdAt", "desc")),
  );

  const resources = await Promise.all(
    bookmarksSnap.docs.map(async (bookmarkDoc) => {
      const resourceId = bookmarkDoc.data().resourceId as string;
      try {
        const resourceSnap = await getDoc(doc(resourcesCollection, resourceId));
        return resourceSnap.exists() ? normalizeResource(resourceSnap.id, resourceSnap.data()) : null;
      } catch {
        return null;
      }
    }),
  );

  return resources.filter((resource): resource is KnowledgeResource => Boolean(resource));
}

export async function listSessionResources(sessionId: string, viewerId: string): Promise<KnowledgeResource[]> {
  if (!sessionId || !viewerId) return [];

  const queries = [
    query(resourcesCollection, where("sessionId", "==", sessionId), where("visibility", "==", "public")),
    query(resourcesCollection, where("sessionId", "==", sessionId), where("sessionParticipantIds", "array-contains", viewerId)),
    query(resourcesCollection, where("sessionId", "==", sessionId), where("uploaderId", "==", viewerId)),
  ];

  const snapshots = await Promise.all(queries.map((resourceQuery) => getDocs(resourceQuery)));
  const map = new Map<string, KnowledgeResource>();

  for (const snap of snapshots) {
    for (const resourceDoc of snap.docs) {
      map.set(resourceDoc.id, normalizeResource(resourceDoc.id, resourceDoc.data()));
    }
  }

  return Array.from(map.values()).sort((a, b) => b.createdAtMillis - a.createdAtMillis);
}

export async function getViewerResourceState(resourceIds: string[], userId?: string): Promise<ResourceViewerState> {
  if (!userId || resourceIds.length === 0) {
    return { likedResourceIds: new Set(), bookmarkedResourceIds: new Set() };
  }

  const relationDocs = await Promise.all(
    resourceIds.map(async (resourceId) => {
      const [likeSnap, bookmarkSnap] = await Promise.all([
        getDoc(doc(likesCollection, `${resourceId}_${userId}`)),
        getDoc(doc(bookmarksCollection, `${resourceId}_${userId}`)),
      ]);
      return {
        resourceId,
        liked: likeSnap.exists(),
        bookmarked: bookmarkSnap.exists(),
      };
    }),
  );

  return {
    likedResourceIds: new Set(relationDocs.filter((item) => item.liked).map((item) => item.resourceId)),
    bookmarkedResourceIds: new Set(relationDocs.filter((item) => item.bookmarked).map((item) => item.resourceId)),
  };
}

export async function toggleResourceLike(resourceId: string, userId: string) {
  const resourceRef = doc(resourcesCollection, resourceId);
  const likeRef = doc(likesCollection, `${resourceId}_${userId}`);

  return runTransaction(db, async (transaction) => {
    const [resourceSnap, likeSnap] = await Promise.all([
      transaction.get(resourceRef),
      transaction.get(likeRef),
    ]);

    if (!resourceSnap.exists()) throw new Error("This resource no longer exists.");

    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(resourceRef, {
        likesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      return false;
    }

    transaction.set(likeRef, {
      resourceId,
      userId,
      createdAt: serverTimestamp(),
    });
    transaction.update(resourceRef, {
      likesCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

export async function toggleResourceBookmark(resourceId: string, userId: string) {
  const resourceRef = doc(resourcesCollection, resourceId);
  const bookmarkRef = doc(bookmarksCollection, `${resourceId}_${userId}`);

  return runTransaction(db, async (transaction) => {
    const [resourceSnap, bookmarkSnap] = await Promise.all([
      transaction.get(resourceRef),
      transaction.get(bookmarkRef),
    ]);

    if (!resourceSnap.exists()) throw new Error("This resource no longer exists.");

    if (bookmarkSnap.exists()) {
      transaction.delete(bookmarkRef);
      transaction.update(resourceRef, {
        bookmarksCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      return false;
    }

    transaction.set(bookmarkRef, {
      resourceId,
      userId,
      createdAt: serverTimestamp(),
    });
    transaction.update(resourceRef, {
      bookmarksCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

export async function trackResourceDownload(resourceId: string) {
  await updateDoc(doc(resourcesCollection, resourceId), {
    downloadsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteKnowledgeResource(resource: KnowledgeResource, currentUserId: string) {
  if (resource.uploaderId !== currentUserId) {
    throw new Error("Only the contributor can delete this resource.");
  }

  if (resource.storagePath) {
    await deleteObject(ref(storage, resource.storagePath)).catch((error) => {
      if (error?.code !== "storage/object-not-found") throw error;
    });
  }

  const [likesSnap, bookmarksSnap] = await Promise.all([
    getDocs(query(likesCollection, where("resourceId", "==", resource.id))),
    getDocs(query(bookmarksCollection, where("resourceId", "==", resource.id))),
  ]);

  const batch = writeBatch(db);
  likesSnap.docs.forEach((item) => batch.delete(item.ref));
  bookmarksSnap.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(resourcesCollection, resource.id));
  await batch.commit();
}

export function filterResourcesLocally(resources: KnowledgeResource[], search: string, activeTag?: string | null) {
  const normalizedSearch = search.trim().toLowerCase();
  return resources.filter((resource) => {
    const matchesSearch =
      !normalizedSearch ||
      resource.searchText.includes(normalizedSearch) ||
      resource.title.toLowerCase().includes(normalizedSearch) ||
      resource.description.toLowerCase().includes(normalizedSearch) ||
      resource.uploaderName.toLowerCase().includes(normalizedSearch);

    const matchesTag = !activeTag || resource.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });
}
