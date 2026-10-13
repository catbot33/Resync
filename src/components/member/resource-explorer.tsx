"use client";

import { MapPin, PackageOpen, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface ResourceItem { id: string; name: string; categoryId: string | null; categoryName: string; quantity: number; location: string; available: number }

export function ResourceExplorer({ resources }: { resources: ResourceItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const categories = useMemo(() => Array.from(new Set(resources.map((resource) => resource.categoryName))).sort(), [resources]);
  const locations = useMemo(() => Array.from(new Set(resources.map((resource) => resource.location))).sort(), [resources]);
  const filtered = useMemo(() => resources.filter((resource) => {
    const term = search.trim().toLocaleLowerCase("en-US");
    return (!term || `${resource.name} ${resource.categoryName} ${resource.location}`.toLocaleLowerCase("en-US").includes(term)) && (category === "all" || resource.categoryName === category) && (location === "all" || resource.location === location) && (!availableOnly || resource.available > 0);
  }), [availableOnly, category, location, resources, search]);

  return (
    <>
      <section className="mt-8"><p className="text-sm text-zinc-500">Resource directory</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Find what you need</h2></section>
      <section className="mt-7 flex flex-col gap-3 rounded-[22px] border border-[#24272b] bg-[#111315] p-4 lg:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search resources</span><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /><input className="h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] pl-10 pr-3 text-sm outline-none placeholder:text-zinc-700 focus:border-zinc-500" onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" value={search} /></label>
        <select aria-label="Category" className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm text-zinc-300" onChange={(event) => setCategory(event.target.value)} value={category}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Location" className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm text-zinc-300" onChange={(event) => setLocation(event.target.value)} value={location}><option value="all">All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-xs text-zinc-400"><input checked={availableOnly} className="accent-zinc-200" onChange={(event) => setAvailableOnly(event.target.checked)} type="checkbox" />Available now</label>
      </section>
      <p className="mt-5 text-xs text-zinc-600">{filtered.length} {filtered.length === 1 ? "resource" : "resources"}</p>
      <section className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((resource) => <button className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#484e57]" key={resource.id} onClick={() => setSelected(resource)} type="button"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-2xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><PackageOpen className="size-5" /></span><span className="rounded-full border border-[#30343a] bg-[#181a1d] px-2.5 py-1 text-[11px] text-zinc-400">{resource.available} of {resource.quantity} free</span></div><h3 className="mt-5 truncate text-base font-semibold text-zinc-100">{resource.name}</h3><p className="mt-2 text-xs text-zinc-600">{resource.categoryName}</p><p className="mt-4 flex items-center gap-2 truncate text-xs text-zinc-500"><MapPin className="size-3.5" />{resource.location}</p></button>)}
        {filtered.length === 0 && <div className="col-span-full rounded-[22px] border border-dashed border-[#30343a] px-6 py-20 text-center text-sm text-zinc-600">No resources match these filters.</div>}
      </section>
      {selected && <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" onMouseDown={() => setSelected(null)}><aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[#30343a] bg-[#15181c]" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-[#30343a] p-5"><div><p className="text-xs text-zinc-600">{selected.categoryName}</p><h3 className="mt-1 text-xl font-semibold">{selected.name}</h3></div><button aria-label="Close resource details" className="grid size-9 place-items-center rounded-xl border border-[#30343a] text-zinc-500" onClick={() => setSelected(null)} type="button"><X className="size-4" /></button></header><div className="flex-1 space-y-3 p-5"><Detail label="Location" value={selected.location} /><Detail label="Total quantity" value={String(selected.quantity)} /><Detail label="Available now" value={`${selected.available} units`} /></div><footer className="border-t border-[#30343a] p-5"><Link className="flex h-11 items-center justify-center rounded-xl bg-white text-sm font-semibold text-black" href={`/member/calendar?view=day&resource=${selected.id}`}>View schedule</Link></footer></aside></div>}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#292d32] bg-[#181a1d] p-4"><p className="text-[11px] text-zinc-600">{label}</p><p className="mt-1 text-sm text-zinc-200">{value}</p></div>; }
