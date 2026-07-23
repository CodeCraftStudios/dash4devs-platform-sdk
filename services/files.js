/**
 * Files — the platform's media library.
 *
 * Uploads land on the CDN public-read, so `url` is a plain permanent CDN URL.
 * The library mirrors the org-level one: a folder tree, tags, free-form
 * metadata, and manual drag ordering. Writes need a SECRET key.
 *
 * A file can be scoped to a customer and/or a website record; unscoped files
 * are platform-wide brand assets. The optional `label` is a stable per-platform
 * handle ("home-hero") a site can fetch by name instead of by id.
 */

export class FilesModule {
  constructor(client) {
    this.client = client;
    this.folders = new FoldersModule(client);
  }

  /**
   * List files.
   *
   * @param {Object} [query]
   * @param {string} [query.folder_id]       Folder id, or "root" for top level
   * @param {string} [query.file_type]       image | video | document | other
   * @param {string} [query.search]          Matches name and original filename
   * @param {string} [query.tag]             Exact tag
   * @param {string} [query.metadata_key]    Filter by metadata key…
   * @param {string} [query.metadata_value]  …with this value (both required)
   * @param {string} [query.customer]        Customer id scope
   * @param {string} [query.website_record]  Website record id scope
   * @param {string} [query.label]           Exact label
   * @param {number} [query.page=1]
   * @param {number} [query.limit=50]        Max 200
   *
   * @example
   * const { files, pagination } = await dash.files.list({ folder_id: "root" });
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(`/api/platform/files${qs ? `?${qs}` : ""}`);
  }

  async get(id) {
    return this.client._fetch(`/api/platform/files/${encodeURIComponent(id)}`);
  }

  /**
   * Upload a file (multipart). Pass a File/Blob plus optional metadata, or a
   * ready-made FormData whose "file" part is already set.
   *
   * @param {File|Blob|FormData} file
   * @param {Object} [meta]
   * @param {string} [meta.name]        Display name (defaults to the filename)
   * @param {string} [meta.alt]         Alt text for images
   * @param {string} [meta.description]
   * @param {string} [meta.folder_id]
   * @param {string} [meta.tags]        Comma-separated
   * @param {Object} [meta.metadata]    Key-value pairs
   * @param {string} [meta.label]       Stable per-platform handle
   * @param {string} [meta.customer]        Scope to a customer
   * @param {string} [meta.website_record]  Scope to a website record
   *
   * @example
   * const { file } = await dash.files.upload(blob, { name: "Hero", folder_id });
   */
  async upload(file, meta = {}) {
    let form;
    if (file instanceof FormData) {
      form = file;
    } else {
      form = new FormData();
      form.append("file", file, file.name || meta.name || "upload");
    }
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined || value === null || value === "") continue;
      form.append(key, key === "metadata" ? JSON.stringify(value) : String(value));
    }
    return this.client._fetch("/api/platform/files", {
      method: "POST",
      body: form,
    });
  }

  /**
   * Update a file's metadata — the binary itself is immutable (upload a new
   * file instead). `metadata` MERGES: send { key: null } to delete a key.
   *
   * @param {string} id
   * @param {Object} patch  name, alt, description, tags (array), metadata,
   *                        folder_id (null = root), label, customer,
   *                        website_record, is_active
   */
  async update(id, patch = {}) {
    return this.client._fetch(`/api/platform/files/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  /** Delete a file — removes the CDN object too. */
  async delete(id) {
    return this.client._fetch(`/api/platform/files/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  /** Persist a manual ordering: the array's index becomes display_order. */
  async reorder(ids) {
    return this.client._fetch("/api/platform/files/reorder", {
      method: "POST",
      body: JSON.stringify({ order: ids }),
    });
  }
}

class FoldersModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * List folders — all of them by default (each carries its full `path`), or
   * one level with { parent_id: "root" | <folder_id> }.
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(`/api/platform/files/folders${qs ? `?${qs}` : ""}`);
  }

  /** @param {Object} payload  { name, parent_id? } */
  async create(payload) {
    return this.client._fetch("/api/platform/files/folders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /** Delete a folder — its files and subfolders move up to the parent. */
  async delete(id) {
    return this.client._fetch(
      `/api/platform/files/folders/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  }
}
