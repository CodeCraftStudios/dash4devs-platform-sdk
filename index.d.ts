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

export declare class PlatformClient {
  constructor(options: { key: string; baseURL?: string; token?: string | null });
  readonly kind: PlatformKeyKind;
  readonly environment: PlatformEnvironment;
  readonly isServerSide: boolean;
  auth: AuthModule;
  records: RecordsModule;
  customers: CustomersModule;
  portal: PortalModule;
  setToken(token: string | null): void;
  whoami(): Promise<WhoAmI>;
  me(token: string): Promise<MeResult>;
  login(email: string, password: string): Promise<LoginResult>;
}

export declare function createPlatformClient(options?: {
  key?: string;
  baseURL?: string;
}): PlatformClient;

export default PlatformClient;
