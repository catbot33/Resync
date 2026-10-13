"use client";

import { ChangeEvent, FormEvent, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Eye,
  EyeOff,
  PackageOpen,
  Plus,
  Trash2,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ShiftName = "Morning" | "Evening" | "Night";

type EmployeeDraft = {
  id: number;
  username: string;
  password: string;
};

type ResourceDraft = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  location: string;
};

type OnboardingResponse = {
  message?: string;
};

const steps = [
  { title: "Company" },
  { title: "Members" },
  { title: "Resources" },
] as const;

const shiftDefaults: Record<ShiftName, { start: string; end: string }> = {
  Morning: { start: "08:00", end: "16:00" },
  Evening: { start: "16:00", end: "00:00" },
  Night: { start: "00:00", end: "08:00" },
};

const selectClassName =
  "h-12 w-full rounded-xl border border-[#2e3238] bg-[#181a1d] px-4 text-sm text-zinc-50 outline-none transition duration-200 hover:border-[#42474f] focus:border-[#6b7280] focus:ring-2 focus:ring-[#6b7280]/20";

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label className="text-sm font-medium text-zinc-200" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

interface OnboardingWizardProps {
  userName: string;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [selectedShifts, setSelectedShifts] = useState<ShiftName[]>(["Morning"]);
  const [shiftTimes, setShiftTimes] = useState(shiftDefaults);
  const [logoPreview, setLogoPreview] = useState("");
  const [employees, setEmployees] = useState<EmployeeDraft[]>([
    { id: 1, username: "", password: "" },
  ]);
  const [visibleEmployeePasswords, setVisibleEmployeePasswords] = useState<Set<number>>(new Set());
  const [resources, setResources] = useState<ResourceDraft[]>([
    { id: 1, name: "", type: "Meeting room", quantity: 1, location: "" },
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextEmployeeId = useRef(2);
  const nextResourceId = useRef(2);
  const router = useRouter();
  const companyNameId = useId();
  const descriptionId = useId();
  const timezoneId = useId();
  const logoId = useId();
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function toggleShift(shift: ShiftName) {
    setSelectedShifts((current) =>
      current.includes(shift) ? current.filter((item) => item !== shift) : [...current, shift],
    );
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    // FileReader keeps the preview local until upload storage is connected.
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function addEmployee() {
    setEmployees((current) => [
      ...current,
      { id: nextEmployeeId.current++, username: "", password: "" },
    ]);
  }

  function updateEmployee(id: number, field: "username" | "password", value: string) {
    setEmployees((current) =>
      current.map((employee) => (employee.id === id ? { ...employee, [field]: value } : employee)),
    );
  }

  function toggleEmployeePassword(id: number) {
    setVisibleEmployeePasswords((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function addResource() {
    setResources((current) => [
      ...current,
      {
        id: nextResourceId.current++,
        name: "",
        type: "Meeting room",
        quantity: 1,
        location: "",
      },
    ]);
  }

  function updateResource(id: number, field: keyof Omit<ResourceDraft, "id">, value: string | number) {
    setResources((current) =>
      current.map((resource) => (resource.id === id ? { ...resource, [field]: value } : resource)),
    );
  }

  async function saveOnboarding(resourcesToSave: ResourceDraft[]) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: companyName,
          description,
          timezone,
          shifts: selectedShifts.map((name) => ({ name, ...shiftTimes[name] })),
          members: employees.map(({ username, password }) => ({ username, password })),
          resources: resourcesToSave.map(({ name, type, quantity, location }) => ({
            name,
            type,
            quantity,
            location,
          })),
        }),
      });
      const result = (await response.json()) as OnboardingResponse;

      if (!response.ok) {
        setError(result.message ?? "We could not save your organization.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueToNextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (step === 0 && !companyName.trim()) {
      setError("Enter your organization name to continue.");
      return;
    }

    if (step === 1 && employees.some((employee) => !employee.username.trim() || employee.password.length < 8 || !/[A-Za-z]/.test(employee.password) || !/[0-9]/.test(employee.password))) {
      setError("Complete each member or remove the unfinished entry. Passwords need 8 characters, a letter, and a number.");
      return;
    }

    if (step === 2 && resources.some((resource) => !resource.name.trim() || !resource.location.trim())) {
      setError("Complete each resource or remove the unfinished entry.");
      return;
    }

    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    await saveOnboarding(resources);
  }

  async function skipOptionalStep() {
    setError("");

    if (step === 1) {
      setEmployees([]);
      setStep(2);
    } else if (step === 2) {
      setResources([]);
      await saveOnboarding([]);
    }
  }

  return (
    <main className="onboarding-canvas min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between">
          <BrandMark />
          <div aria-label={`Signed in as ${userName}`} className="grid size-10 place-items-center rounded-full border border-[#2e3238] bg-[#181a1d] text-xs font-semibold text-zinc-200" title={userName}>
            {userInitials || "A"}
          </div>
        </header>

        <div className="mt-12 lg:mt-24 lg:grid lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center lg:gap-16 xl:gap-24">
          <aside className="hidden lg:block">
            <p className="text-sm font-medium text-zinc-400">Workspace setup</p>
            <ol aria-label="Onboarding progress" className="relative mt-7 space-y-8 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-[#2e3238]">
              {steps.map((item, index) => {
                const active = index === step;
                const complete = index < step;

                return (
                  <li aria-current={active ? "step" : undefined} className="relative flex items-center gap-4" key={item.title}>
                    <span className={cn("relative z-10 grid size-8 place-items-center rounded-full border text-xs font-semibold", complete ? "border-white bg-white text-[#0b0c0d]" : active ? "border-[#6b7280] bg-[#181a1d] text-white shadow-[0_0_0_4px_rgba(107,114,128,0.14)]" : "border-[#2e3238] bg-[#111315] text-zinc-600")}>
                      {complete ? <Check aria-hidden="true" className="size-4" /> : index + 1}
                    </span>
                    <span className={cn("text-sm font-medium", active ? "text-white" : complete ? "text-zinc-300" : "text-zinc-600")}>{item.title}</span>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="min-w-0 pb-12">
            <ol aria-label="Onboarding progress" className="mb-10 grid grid-cols-3 lg:hidden">
              {steps.map((item, index) => {
                const active = index === step;
                const complete = index < step;

                return (
                  <li aria-current={active ? "step" : undefined} className="relative flex flex-col items-center gap-2 text-center" key={item.title}>
                    {index > 0 ? <span aria-hidden="true" className={cn("absolute right-1/2 top-4 h-px w-full", index <= step ? "bg-[#6b7280]" : "bg-[#2e3238]")} /> : null}
                    <span className={cn("relative z-10 grid size-8 place-items-center rounded-full border text-xs font-semibold", complete ? "border-white bg-white text-[#0b0c0d]" : active ? "border-[#6b7280] bg-[#181a1d] text-white" : "border-[#2e3238] bg-[#111315] text-zinc-600")}>
                      {complete ? <Check aria-hidden="true" className="size-4" /> : index + 1}
                    </span>
                    <span className={cn("text-xs font-medium sm:text-sm", active ? "text-white" : "text-zinc-600")}>{item.title}</span>
                  </li>
                );
              })}
            </ol>

            <form onSubmit={continueToNextStep}>
              <div className="mb-9 flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Step {step + 1} of {steps.length}</p>
                  <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
                    {step === 0 ? "Tell us about your organization" : step === 1 ? "Who needs access?" : "What can your team reserve?"}
                  </h1>
                </div>

                {step > 0 ? (
                  <Button className="shrink-0" onClick={step === 1 ? addEmployee : addResource} size="compact" type="button" variant="secondary">
                    <Plus aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">Add {step === 1 ? "member" : "resource"}</span>
                  </Button>
                ) : null}
              </div>

            {step === 0 ? (
              <div className="space-y-7">
                <div className="grid gap-6 sm:grid-cols-[1fr_150px]">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <FieldLabel htmlFor={companyNameId}>Organization name</FieldLabel>
                      <Input autoComplete="organization" id={companyNameId} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Northstar Studio" required value={companyName} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={descriptionId}>Description <span className="font-normal text-zinc-600">(optional)</span></FieldLabel>
                      <Textarea id={descriptionId} maxLength={240} onChange={(event) => setDescription(event.target.value)} placeholder="What does your organization do?" value={description} />
                    </div>
                  </div>

                  <div className="flex flex-col items-center sm:items-stretch">
                    <span className="text-sm font-medium text-zinc-200">Company logo</span>
                    <label className="mt-2 flex min-h-[150px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#2e3238] bg-[#111315] text-center transition hover:border-[#4b5563] hover:bg-[#181a1d] focus-within:ring-2 focus-within:ring-zinc-400/60" htmlFor={logoId}>
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="Company logo preview" className="size-full object-cover" src={logoPreview} />
                      ) : (
                        <>
                          <span className="grid size-11 place-items-center rounded-full bg-[#24272b] text-zinc-300">
                            <UploadCloud aria-hidden="true" className="size-5" />
                          </span>
                          <span className="mt-3 text-xs font-medium text-zinc-300">Upload logo</span>
                          <span className="mt-1 text-[11px] text-zinc-600">PNG, JPG or SVG</span>
                        </>
                      )}
                      <input accept="image/png,image/jpeg,image/svg+xml" className="sr-only" id={logoId} onChange={handleLogo} type="file" />
                    </label>
                  </div>
                </div>

                <fieldset>
                  <legend className="text-sm font-medium text-zinc-200">Working shifts</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(shiftDefaults) as ShiftName[]).map((shift) => {
                      const checked = selectedShifts.includes(shift);

                      return (
                        <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-medium transition", checked ? "border-[#6b7280] bg-[#24272b] text-white" : "border-[#2e3238] bg-[#111315] text-zinc-400 hover:border-[#42474f]")} key={shift}>
                          <input checked={checked} className="size-4 accent-zinc-200" onChange={() => toggleShift(shift)} type="checkbox" />
                          {shift}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="space-y-2">
                  <FieldLabel htmlFor={timezoneId}>Time zone</FieldLabel>
                  <select className={selectClassName} id={timezoneId} onChange={(event) => setTimezone(event.target.value)} value={timezone}>
                    <option value="Asia/Karachi">Pakistan Standard Time — Karachi</option>
                    <option value="Asia/Dubai">Gulf Standard Time — Dubai</option>
                    <option value="Asia/Kolkata">India Standard Time — Kolkata</option>
                    <option value="Europe/London">Greenwich Mean Time — London</option>
                    <option value="America/New_York">Eastern Time — New York</option>
                    <option value="America/Los_Angeles">Pacific Time — Los Angeles</option>
                  </select>
                </div>

                {selectedShifts.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <Clock3 aria-hidden="true" className="size-4 text-zinc-400" />
                      Shift hours
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selectedShifts.map((shift) => (
                        <div className="rounded-2xl border border-[#2e3238] bg-[#111315] p-4" key={shift}>
                          <p className="text-sm font-semibold text-zinc-200">{shift}</p>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="space-y-1.5 text-xs text-zinc-500">
                              Starts
                              <Input aria-label={`${shift} shift starts`} className="px-3" onChange={(event) => setShiftTimes((current) => ({ ...current, [shift]: { ...current[shift], start: event.target.value } }))} type="time" value={shiftTimes[shift].start} />
                            </label>
                            <label className="space-y-1.5 text-xs text-zinc-500">
                              Ends
                              <Input aria-label={`${shift} shift ends`} className="px-3" onChange={(event) => setShiftTimes((current) => ({ ...current, [shift]: { ...current[shift], end: event.target.value } }))} type="time" value={shiftTimes[shift].end} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {employees.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-[#2e3238] bg-[#111315] px-6 py-14 text-center">
                    <UsersRound aria-hidden="true" className="mx-auto size-6 text-zinc-600" />
                    <p className="mt-3 text-sm font-medium text-zinc-300">No members added yet</p>
                  </div>
                ) : null}

                {employees.map((employee, index) => {
                  const usernameId = `employee-${employee.id}-username`;
                  const passwordId = `employee-${employee.id}-password`;

                  return (
                    <div className="rounded-2xl border border-[#2e3238] bg-[#111315] p-5" key={employee.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-200">Member {index + 1}</p>
                        <button aria-label={`Remove member ${index + 1}`} className="grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={() => setEmployees((current) => current.filter((item) => item.id !== employee.id))} type="button">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <FieldLabel htmlFor={usernameId}>Username</FieldLabel>
                          <Input autoCapitalize="none" autoComplete="off" id={usernameId} onChange={(event) => updateEmployee(employee.id, "username", event.target.value)} placeholder="e.g. alex_chen" value={employee.username} />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor={passwordId}>Temporary password</FieldLabel>
                          <div className="relative">
                            <Input autoComplete="new-password" className="pr-12" id={passwordId} onChange={(event) => updateEmployee(employee.id, "password", event.target.value)} placeholder="At least 8 characters" type={visibleEmployeePasswords.has(employee.id) ? "text" : "password"} value={employee.password} />
                            <button
                              aria-label={visibleEmployeePasswords.has(employee.id) ? `Hide member ${index + 1} password` : `Show member ${index + 1} password`}
                              className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                              onClick={() => toggleEmployeePassword(employee.id)}
                              type="button"
                            >
                              {visibleEmployeePasswords.has(employee.id) ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {resources.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-[#2e3238] bg-[#111315] px-6 py-14 text-center">
                    <PackageOpen aria-hidden="true" className="mx-auto size-6 text-zinc-600" />
                    <p className="mt-3 text-sm font-medium text-zinc-300">No resources added yet</p>
                  </div>
                ) : null}

                {resources.map((resource, index) => {
                  const prefix = `resource-${resource.id}`;

                  return (
                    <div className="rounded-2xl border border-[#2e3238] bg-[#111315] p-5" key={resource.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-200">Resource {index + 1}</p>
                        <button aria-label={`Remove resource ${index + 1}`} className="grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={() => setResources((current) => current.filter((item) => item.id !== resource.id))} type="button">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <FieldLabel htmlFor={`${prefix}-name`}>Resource name</FieldLabel>
                          <Input id={`${prefix}-name`} onChange={(event) => updateResource(resource.id, "name", event.target.value)} placeholder="e.g. Atlas room" value={resource.name} />
                        </div>
                        <div className="grid grid-cols-[1fr_110px] gap-3">
                          <div className="space-y-2">
                            <FieldLabel htmlFor={`${prefix}-type`}>Type</FieldLabel>
                            <select className={selectClassName} id={`${prefix}-type`} onChange={(event) => updateResource(resource.id, "type", event.target.value)} value={resource.type}>
                              <option>Meeting room</option>
                              <option>Projector</option>
                              <option>Conference hall</option>
                              <option>Vehicle</option>
                              <option>Equipment</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel htmlFor={`${prefix}-quantity`}>Quantity</FieldLabel>
                            <Input id={`${prefix}-quantity`} min={1} onChange={(event) => updateResource(resource.id, "quantity", Math.max(1, Number(event.target.value)))} type="number" value={resource.quantity} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor={`${prefix}-location`}>Location</FieldLabel>
                          <Input id={`${prefix}-location`} onChange={(event) => updateResource(resource.id, "location", event.target.value)} placeholder="e.g. Floor 2, east wing" value={resource.location} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {error ? (
              <p aria-live="polite" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#2e3238] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button onClick={() => { setError(""); setStep((current) => current - 1); }} type="button" variant="ghost">
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back
                  </Button>
                ) : null}
                {step > 0 ? (
                  <Button disabled={isSubmitting} onClick={skipOptionalStep} type="button" variant="ghost">
                    Skip for now
                  </Button>
                ) : null}
              </div>

              <Button className="bg-white text-[#0b0c0d] hover:bg-zinc-200 sm:min-w-40" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : step === steps.length - 1 ? "Finish setup" : "Continue"}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
