"use client";

import {
  Archive,
  Boxes,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { CUSTOM_RESOURCE_TYPE, isStandardResourceType, RESOURCE_TYPES } from "@/lib/resources/types";

interface ResourceItem {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  location: string;
  isActive: boolean;
  available: number;
}

interface CategoryItem {
  id: string;
  name: string;
  resourceCount: number;
}

interface ResourceManagerProps {
  initialResources: ResourceItem[];
  categories: CategoryItem[];
  stats: {
    totalUnits: number;
    availableUnits: number;
    categoryTotal: number;
    inactiveTotal: number;
  };
}

type ResourceDraft = Pick<ResourceItem, "name" | "categoryName" | "quantity" | "location" | "isActive">;

const emptyDraft: ResourceDraft = {
  name: "",
  categoryName: RESOURCE_TYPES[0],
  quantity: 1,
  location: "",
  isActive: true,
};

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section aria-labelledby="modal-title" aria-modal="true" className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[26px] border border-[#30343a] bg-[#111315] p-5 shadow-2xl sm:p-7" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white" id="modal-title">{title}</h2>
          <button aria-label="Close" className="grid size-9 place-items-center rounded-xl border border-[#30343a] text-zinc-400 transition hover:bg-[#1b1e22] hover:text-white" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-500";

function getSearchScore(resource: ResourceItem, term: string) {
  const name = resource.name.toLocaleLowerCase("en-US");
  const category = resource.categoryName.toLocaleLowerCase("en-US");
  const location = resource.location.toLocaleLowerCase("en-US");

  // Rank direct name matches ahead of matches found later in a name or metadata.
  if (name === term) return 0;
  if (name.startsWith(term)) return 1;
  if (name.split(/\s+/).some((word) => word.startsWith(term))) return 2;
  if (name.includes(term)) return 3;
  if (category === term) return 4;
  if (category.startsWith(term)) return 5;
  if (category.includes(term)) return 6;
  if (location.startsWith(term)) return 7;
  if (location.includes(term)) return 8;
  return Number.POSITIVE_INFINITY;
}

export function ResourceManager({ categories, initialResources, stats }: ResourceManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Show both states by default so toggling a row does not remove it from view.
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<ResourceItem | "new" | null>(null);
  const [draft, setDraft] = useState<ResourceDraft>(emptyDraft);
  const [categoryPanel, setCategoryPanel] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ResourceItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const usesCustomType = !isStandardResourceType(draft.categoryName);

  const filteredResources = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("en-US");

    const matchingFilters = initialResources.filter((resource) => {
      const matchesCategory = categoryFilter === "all" || resource.categoryId === categoryFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? resource.isActive : !resource.isActive);
      return matchesCategory && matchesStatus;
    });

    if (!term) return matchingFilters;

    return matchingFilters
      .map((resource) => ({ resource, score: getSearchScore(resource, term) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((first, second) => first.score - second.score || first.resource.name.localeCompare(second.resource.name))
      .map(({ resource }) => resource);
  }, [categoryFilter, initialResources, search, statusFilter]);

  function openResourceForm(resource?: ResourceItem) {
    setError("");
    setEditing(resource ?? "new");
    setDraft(resource ? {
      name: resource.name,
      categoryName: resource.categoryName,
      quantity: resource.quantity,
      location: resource.location,
      isActive: resource.isActive,
    } : emptyDraft);
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError("");
    const endpoint = editing === "new" ? "/api/resources" : `/api/resources/${editing.id}`;

    try {
      const response = await fetch(endpoint, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = response.status === 204 ? null : await response.json();

      if (!response.ok) throw new Error(result?.message ?? "We could not save the resource.");
      setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not save the resource.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(resource: ResourceItem) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !resource.isActive }),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(result?.message ?? "We could not update the resource.");
      return;
    }
    router.refresh();
  }

  async function deleteResource() {
    if (!deleteTarget) return;
    setBusy(true);
    const response = await fetch(`/api/resources/${deleteTarget.id}`, { method: "DELETE" });
    const result = response.status === 204 ? null : await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(result?.message ?? "We could not delete the resource.");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/resource-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(result?.message ?? "We could not add the category.");
      return;
    }
    setCategoryName("");
    router.refresh();
  }

  async function deleteCategory(category: CategoryItem) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/resource-categories/${category.id}`, { method: "DELETE" });
    const result = response.status === 204 ? null : await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(result?.message ?? "We could not delete the category.");
      return;
    }
    router.refresh();
  }

  const statCards = [
    { label: "Resource units", value: stats.totalUnits, detail: `${initialResources.length} resource ${initialResources.length === 1 ? "record" : "records"}`, icon: Boxes },
    { label: "Available now", value: stats.availableUnits, detail: "Across active resources", icon: PackageCheck },
    { label: "Categories", value: stats.categoryTotal, detail: "Organization categories", icon: Tags },
    { label: "Inactive", value: stats.inactiveTotal, detail: "Hidden from booking", icon: Archive },
  ];

  return (
    <>
      <section className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-zinc-500">Inventory</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Manage shared resources</h2>
        </div>
        <div className="flex gap-2">
          <button className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-4 text-sm font-medium text-zinc-300 transition hover:bg-[#202328] hover:text-white" onClick={() => { setError(""); setCategoryPanel(true); }} type="button">Categories</button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200" onClick={() => openResourceForm()} type="button">
            <Plus className="size-4" /> Add resource
          </button>
        </div>
      </section>

      <section aria-label="Resource totals" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ detail, icon: Icon, label, value }) => (
          <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5" key={label}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-zinc-400">{label}</p>
              <span className="grid size-9 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-400"><Icon className="size-4" strokeWidth={1.8} /></span>
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-white">{value.toLocaleString()}</p>
            <p className="mt-2 text-xs text-zinc-600">{detail}</p>
          </article>
        ))}
      </section>

      {error && !editing && !categoryPanel ? <p className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-[#24272b] bg-[#111315]">
        <div className="flex flex-col gap-3 border-b border-[#24272b] p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="relative flex-1">
            <span className="sr-only">Search resources</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <input className="h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500" onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" value={search} />
          </label>
          <select aria-label="Filter by category" className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm text-zinc-300 outline-none focus:border-zinc-500" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select aria-label="Filter by status" className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm text-zinc-300 outline-none focus:border-zinc-500" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {filteredResources.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><Boxes className="size-5" /></span>
              <p className="mt-4 text-sm font-medium text-zinc-300">No resources found</p>
              <p className="mt-1 text-xs text-zinc-600">Add a resource or adjust the filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead><tr className="border-b border-[#24272b] text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                <th className="px-5 py-4 font-medium">Resource</th><th className="px-4 py-4 font-medium">Location</th><th className="px-4 py-4 font-medium">Availability</th><th className="px-4 py-4 font-medium">Status</th><th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr className="border-b border-[#202326] last:border-0" key={resource.id}>
                    <td className="px-5 py-4"><p className="text-sm font-medium text-zinc-200">{resource.name}</p><p className="mt-1 text-xs text-zinc-600">{resource.categoryName}</p></td>
                    <td className="px-4 py-4 text-sm text-zinc-400">{resource.location || "Not specified"}</td>
                    <td className="px-4 py-4"><p className="text-sm font-medium text-zinc-200">{resource.available} / {resource.quantity}</p><p className="mt-1 text-xs text-zinc-600">units available</p></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          aria-checked={resource.isActive}
                          aria-label={`${resource.isActive ? "Deactivate" : "Activate"} ${resource.name}`}
                          className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${resource.isActive ? "border-zinc-300 bg-zinc-200" : "border-[#3a3f46] bg-[#24272b]"}`}
                          disabled={busy}
                          onClick={() => updateStatus(resource)}
                          role="switch"
                          type="button"
                        >
                          <span className={`absolute left-1 top-1 size-[18px] rounded-full transition-transform ${resource.isActive ? "translate-x-5 bg-[#181a1d]" : "translate-x-0 bg-zinc-500"}`} />
                        </button>
                        <span className="text-xs text-zinc-400">{resource.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">
                      <button aria-label={`Edit ${resource.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => openResourceForm(resource)} type="button"><Pencil className="size-4" /></button>
                      <button aria-label={`Delete ${resource.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-red-950/40 hover:text-red-300" onClick={() => setDeleteTarget(resource)} type="button"><Trash2 className="size-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing ? (
        <Modal onClose={() => setEditing(null)} title={editing === "new" ? "Add resource" : "Edit resource"}>
          <form className="mt-6 space-y-4" onSubmit={saveResource}>
            <label className="block text-xs font-medium text-zinc-400">Resource name<input autoFocus className={fieldClass} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Meeting room A" required value={draft.name} /></label>
            <div className="text-xs font-medium text-zinc-400">
              <label htmlFor="resource-type">Type / category</label>
              <select
                className={fieldClass}
                id="resource-type"
                onChange={(event) => setDraft({ ...draft, categoryName: event.target.value === CUSTOM_RESOURCE_TYPE ? "" : event.target.value })}
                value={usesCustomType ? CUSTOM_RESOURCE_TYPE : draft.categoryName}
              >
                <option value={CUSTOM_RESOURCE_TYPE}>Custom</option>
                {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {usesCustomType ? (
                <input
                  aria-label="Custom resource type"
                  className={fieldClass}
                  maxLength={60}
                  onChange={(event) => setDraft({ ...draft, categoryName: event.target.value })}
                  placeholder="Enter a custom type"
                  required
                  value={draft.categoryName}
                />
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <label className="block text-xs font-medium text-zinc-400">Quantity<input className={fieldClass} min={1} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} required type="number" value={draft.quantity} /></label>
              <label className="block text-xs font-medium text-zinc-400">Location <span className="font-normal text-zinc-600">(optional)</span><input className={fieldClass} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="e.g. Floor 2, east wing" value={draft.location} /></label>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#30343a] bg-[#181a1d] px-4 py-3 text-sm text-zinc-300"><input checked={draft.isActive} className="size-4 accent-zinc-200" onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" />Available for booking</label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2"><button className="h-10 rounded-xl border border-[#30343a] px-4 text-sm text-zinc-300" onClick={() => setEditing(null)} type="button">Cancel</button><button className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-60" disabled={busy} type="submit">{busy ? "Saving…" : "Save resource"}</button></div>
          </form>
        </Modal>
      ) : null}

      {categoryPanel ? (
        <Modal onClose={() => setCategoryPanel(false)} title="Categories">
          <form className="mt-6 flex gap-2" onSubmit={addCategory}><input className={`${fieldClass} mt-0`} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" required value={categoryName} /><button className="shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-60" disabled={busy} type="submit">Add</button></form>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <div className="mt-5 space-y-2">
            {categories.length === 0 ? <p className="rounded-xl border border-dashed border-[#30343a] p-5 text-center text-sm text-zinc-600">No categories yet.</p> : categories.map((category) => (
              <div className="flex items-center justify-between rounded-xl border border-[#24272b] bg-[#181a1d] px-4 py-3" key={category.id}><div><p className="text-sm text-zinc-200">{category.name}</p><p className="mt-0.5 text-xs text-zinc-600">{category.resourceCount} resources</p></div><button aria-label={`Delete ${category.name}`} className="grid size-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-red-950/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30" disabled={busy || category.resourceCount > 0} onClick={() => deleteCategory(category)} type="button"><Trash2 className="size-4" /></button></div>
            ))}
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal onClose={() => setDeleteTarget(null)} title="Delete resource?">
          <p className="mt-4 text-sm leading-6 text-zinc-500">Delete <span className="font-medium text-zinc-200">{deleteTarget.name}</span>? Resources with reservation history must be deactivated instead.</p>
          <div className="mt-6 flex justify-end gap-2"><button className="h-10 rounded-xl border border-[#30343a] px-4 text-sm text-zinc-300" onClick={() => setDeleteTarget(null)} type="button">Cancel</button><button className="h-10 rounded-xl border border-red-900/60 bg-red-950/30 px-4 text-sm font-medium text-red-300 disabled:opacity-60" disabled={busy} onClick={deleteResource} type="button">{busy ? "Deleting…" : "Delete"}</button></div>
        </Modal>
      ) : null}
    </>
  );
}
