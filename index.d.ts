export type PlatformKeyKind = "public" | "secret";
export type PlatformEnvironment = "live" | "test";

export interface PlatformRecord {
  id: string;
  type: string;
  status: string;
  customer: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlatformCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Full name, falling back to company, then email. */
  name: string;
  phone: string;
  company: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecordQuery {
  status?: string;
  customer?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  /** Any other key is a data-field filter — the field must be marked `filterable`. */
  [key: string]: string | number | undefined;
}

export declare class RecordsModule {
  list(
    type: string,
    query?: RecordQuery
  ): Promise<{ records: PlatformRecord[]; total: number; limit: number; offset: number }>;
  get(type: string, id: string): Promise<{ record: PlatformRecord }>;
  create(
    type: string,
    payload: { data: Record<string, unknown>; status?: string; customer?: string }
  ): Promise<{ record: PlatformRecord }>;
  update(
    type: string,
    id: string,
    payload: { data?: Record<string, unknown>; status?: string }
  ): Promise<{ record: PlatformRecord }>;
  delete(type: string, id: string): Promise<{ message: string }>;
}

export declare class CustomersModule {
  list(query?: {
    limit?: number;
    offset?: number;
  }): Promise<{ customers: PlatformCustomer[]; total: number }>;
  create(payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company?: string;
    password?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ customer: PlatformCustomer }>;
  get(id: string): Promise<{ customer: PlatformCustomer }>;
  /** `metadata` is merged, not replaced. Email is not editable. */
  update(
    id: string,
    payload: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      company?: string;
      metadata?: Record<string, unknown>;
      is_active?: boolean;
    },
  ): Promise<{ customer: PlatformCustomer }>;
}

export interface PlatformUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "owner" | "admin" | "member";
  is_active: boolean;
  can_manage_users: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginResult {
  token: string;
  audience: "staff" | "customer";
  user?: PlatformUser;
  customer?: PlatformCustomer;
}

export interface MeResult {
  audience: "staff" | "customer";
  user?: PlatformUser;
  customer?: PlatformCustomer;
}

export declare class AuthModule {
  staffLogin(email: string, password: string): Promise<LoginResult>;
  customerLogin(email: string, password: string): Promise<LoginResult>;
  /** Tries staff, falls back to customer. */
  login(email: string, password: string): Promise<LoginResult>;
  me(token: string): Promise<MeResult>;
}

export declare class PortalModule {
  login(
    email: string,
    password: string
  ): Promise<{ token: string; customer: PlatformCustomer }>;
  me(): Promise<{ customer: PlatformCustomer }>;
  logout(): void;
}

/** The shape the staff directory returns — enough to assign work and administer. */
export interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "owner" | "admin" | "member";
  is_active: boolean;
  can_manage_users: boolean;
  /** null = invited but never signed in (pending). Set once they accept/log in. */
  last_login_at: string | null;
  created_at: string;
}

export declare class StaffModule {
  /** Operators on this platform (active only unless includeInactive). */
  list(query?: { includeInactive?: boolean }): Promise<{ staff: StaffMember[] }>;
  /**
   * Invite/create an operator. Omit `password` to send an invite — the response
   * carries `invite_token` for the accept link.
   */
  create(payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    role?: "owner" | "admin" | "member";
    password?: string;
  }): Promise<{ staff: StaffMember; invite_token?: string }>;
  /** Accept an invite: set the invited operator's password from the signed token. */
  accept(payload: { token: string; password: string }): Promise<{ staff: StaffMember }>;
  /** Update role, active state, name or email. */
  update(
    id: string,
    patch: {
      email?: string;
      first_name?: string;
      last_name?: string;
      role?: "owner" | "admin" | "member";
      is_active?: boolean;
      password?: string;
    },
  ): Promise<{ staff: StaffMember }>;
  /** Revoke a pending invite (deletes the account). Fails for accepted members. */
  remove(id: string): Promise<{ ok: boolean }>;
}

export interface WhoAmI {
  platform: {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    mode: PlatformEnvironment;
    modules: string[];
    config: Record<string, unknown>;
  };
  key: { kind: PlatformKeyKind; environment: PlatformEnvironment };
}

/** Result of a /api/platform/ping probe. `ok` is the one flag the gate acts on. */
export interface HealthStatus {
  /** true → serve the site; false → show the maintenance page. */
  ok: boolean;
  /** Did we get any response at all (vs. network error / timeout)? */
  reachable: boolean;
  /** Should a maintenance page be shown (operator flag OR backend down)? */
  maintenance: boolean;
  /** "operator" | "timeout" | "unreachable" | "http_5xx" | "no_client" | null */
  reason: string | null;
  /** Operator-supplied message, when maintenance was flipped on deliberately. */
  message: string | null;
  /** Optional "expected back" hint. */
  until: string | null;
}

export interface SendEmailOptions {
  /** Recipient address(es). */
  to: string | string[];
  subject: string;
  /** HTML body — provide html or text. */
  html?: string;
  /** Plain-text body. */
  text?: string;
  /** Override the platform's configured Resend sender. */
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export declare class EmailModule {
  /** Send transactional email via the platform's own Resend key. Server-side only. */
  send(opts: SendEmailOptions): Promise<{ ok: boolean; id: string }>;
}

/** A file in the platform's media library. `url` is a plain permanent CDN URL. */
export interface PlatformFileRecord {
  id: string;
  name: string;
  /** Stable per-platform handle ("home-hero"); "" when unset. */
  label: string;
  url: string;
  original_filename: string;
  file_type: "image" | "video" | "document" | "other";
  content_type: string;
  size_bytes: number;
  /** Human-readable size, e.g. "1.2 MB". */
  file_size_display: string;
  alt: string;
  description: string;
  width: number | null;
  height: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  display_order: number;
  folder_id: string | null;
  /** The owning project's record id (each project has its own library). */
  project: string | null;
  customer: string | null;
  website_record: string | null;
  created_at: string | null;
}

export interface PlatformFileFolder {
  id: string;
  name: string;
  parent_id: string | null;
  /** Full path from the root, e.g. "Brand/Logos". */
  path: string;
  created_at: string | null;
}

export interface FileListQuery {
  /** Folder id, or "root" for the top level. Absent = everywhere. */
  folder_id?: string;
  /** Project record id — each project owns its media. "none" = unscoped pool. */
  project?: string;
  file_type?: "image" | "video" | "document" | "other";
  search?: string;
  tag?: string;
  metadata_key?: string;
  metadata_value?: string;
  customer?: string;
  website_record?: string;
  label?: string;
  page?: number;
  limit?: number;
}

export interface FileListPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface FileUploadMeta {
  /** Project record id — scope the upload to that project's library. */
  project?: string;
  name?: string;
  alt?: string;
  description?: string;
  folder_id?: string;
  /** Comma-separated. */
  tags?: string;
  metadata?: Record<string, unknown>;
  label?: string;
  customer?: string;
  website_record?: string;
}

export interface FileUpdatePatch {
  name?: string;
  alt?: string;
  description?: string;
  /** Replaces the whole tag list. */
  tags?: string[];
  /** MERGED — send { key: null } to delete a key. */
  metadata?: Record<string, unknown>;
  /** null moves the file to the root. */
  folder_id?: string | null;
  /** Project record id; null unscopes. */
  project?: string | null;
  label?: string;
  customer?: string | null;
  website_record?: string | null;
  is_active?: boolean;
}

export declare class FileFoldersModule {
  /** All folders by default (each carries its full path), or one level via parent_id. */
  list(query?: {
    parent_id?: string;
  }): Promise<{ folders: PlatformFileFolder[] }>;
  create(payload: {
    name: string;
    parent_id?: string;
  }): Promise<{ folder: PlatformFileFolder }>;
  /** Delete a folder — its files and subfolders move up to the parent. */
  delete(id: string): Promise<{ deleted: boolean }>;
}

export declare class FilesModule {
  list(query?: FileListQuery): Promise<{
    files: PlatformFileRecord[];
    total: number;
    limit: number;
    offset: number;
    pagination: FileListPagination;
  }>;
  get(id: string): Promise<{ file: PlatformFileRecord }>;
  /** Upload (multipart). Pass a File/Blob, or a FormData whose "file" part is set. */
  upload(
    file: File | Blob | FormData,
    meta?: FileUploadMeta
  ): Promise<{ file: PlatformFileRecord }>;
  /** Metadata only — the binary is immutable (upload a new file instead). */
  update(id: string, patch: FileUpdatePatch): Promise<{ file: PlatformFileRecord }>;
  /** Delete a file — removes the CDN object too. */
  delete(id: string): Promise<{ deleted: boolean }>;
  /** Persist a manual ordering: the array's index becomes display_order. */
  reorder(ids: string[]): Promise<{ reordered: number }>;
  folders: FileFoldersModule;
}

export declare class PlatformClient {
  constructor(options: { key: string; baseURL?: string; token?: string | null });
  readonly kind: PlatformKeyKind;
  readonly environment: PlatformEnvironment;
  readonly isServerSide: boolean;
  auth: AuthModule;
  records: RecordsModule;
  customers: CustomersModule;
  staff: StaffModule;
  portal: PortalModule;
  email: EmailModule;
  files: FilesModule;
  setToken(token: string | null): void;
  whoami(): Promise<WhoAmI>;
  /** Poll the backend and decide whether to serve the site. Never throws. */
  checkHealth(opts?: { timeoutMs?: number }): Promise<HealthStatus>;
  me(token: string): Promise<MeResult>;
  login(email: string, password: string): Promise<LoginResult>;
}

export declare function createPlatformClient(options?: {
  key?: string;
  baseURL?: string;
}): PlatformClient;

/**
 * Cached maintenance probe for a root layout / middleware. Caches "up" for
 * `upTtlMs` and "down" for a shorter `downTtlMs` so recovery isn't sticky.
 * Server-only (import from "dash4devs-platform/server").
 */
export declare function getMaintenanceStatus(options?: {
  upTtlMs?: number;
  downTtlMs?: number;
  timeoutMs?: number;
  force?: boolean;
  key?: string;
  baseURL?: string;
}): Promise<HealthStatus>;

/** Drop the cached probe so the next getMaintenanceStatus() re-checks live. */
export declare function clearMaintenanceCache(): void;

export default PlatformClient;
