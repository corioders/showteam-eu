"use client";

import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applicationCategories, applicationOfferValue, type ApplicationCategory, type ApplicationOfferGroup } from "@/lib/application-options";
import { applicationDisciplinesForCategory, applicationHasSportDetails, applicationLevels, applicationTransport } from "@/lib/applications";

type Values = {
  category: ApplicationCategory | ""; offer: string; firstName: string; lastName: string; birthDate: string; address: string;
  email: string; participantEmail: string; phone: string; discipline: string; level: string;
  transport: string; notes: string; privacyConsent: boolean; accuracyConfirmed: boolean; newsletterConsent: boolean;
};
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;
const draftKey = "showteam:application-draft:v1";
const empty: Values = { category: "", offer: "", firstName: "", lastName: "", birthDate: "", address: "", email: "", participantEmail: "", phone: "", discipline: "", level: "", transport: "", notes: "", privacyConsent: false, accuracyConfirmed: false, newsletterConsent: false };

function onlyApplicableDetails(values: Values): Values {
  if (values.category === "Szkolenia") return { ...values, discipline: "", level: "", transport: "" };
  if (values.category === "Lato") return { ...values, transport: "" };
  return values;
}

export function ApplicationForm({ groups, initialOffer }: { groups: ApplicationOfferGroup[]; initialOffer?: string }) {
  const initialGroup = initialOffer ? groups.find((group) => group.offers.some((offer) => offer.title === initialOffer)) : undefined;
  const initialSelection = initialGroup?.offers.find((offer) => offer.title === initialOffer);
  const initialOfferValue = initialSelection
    ? initialSelection.dates.length ? applicationOfferValue(initialSelection.title, initialSelection.dates[0]) : `${initialSelection.title} — termin do ustalenia`
    : "";
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({ ...empty, category: initialGroup?.category || "", offer: initialOfferValue });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const draft = JSON.parse(window.localStorage.getItem(draftKey) || "null") as Partial<Values> | null;
        if (draft) {
          const draftCategory = draft.category || groups.find((group) => group.offers.some((offer) => draft.offer?.startsWith(`${offer.title} —`)))?.category || "";
          setValues(onlyApplicableDetails({ ...empty, ...draft, category: initialGroup?.category || draftCategory, offer: initialOfferValue || draft.offer || "" }));
        }
      } catch { window.localStorage.removeItem(draftKey); }
      setReady(true);
    });
  }, [groups, initialGroup?.category, initialOfferValue]);

  useEffect(() => {
    if (!ready || status === "done") return;
    const timeout = window.setTimeout(() => window.localStorage.setItem(draftKey, JSON.stringify(values)), 400);
    return () => window.clearTimeout(timeout);
  }, [ready, status, values]);

  function set<K extends Field>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!values.category) next.category = "Wybierz rodzaj wyjazdu.";
    if (!values.offer) next.offer = "Wybierz termin lub ofertę.";
    if (values.firstName.trim().length < 2) next.firstName = "Wpisz imię uczestnika.";
    if (values.lastName.trim().length < 2) next.lastName = "Wpisz nazwisko uczestnika.";
    if (!values.birthDate) next.birthDate = "Wybierz datę urodzenia.";
    if (values.address.trim().length < 5) next.address = "Wpisz adres i kod pocztowy.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Wpisz poprawny e-mail kontaktowy.";
    if (values.participantEmail && !/^\S+@\S+\.\S+$/.test(values.participantEmail)) next.participantEmail = "Wpisz poprawny e-mail uczestnika.";
    if (values.phone.replace(/\D/g, "").length < 9) next.phone = "Wpisz poprawny numer telefonu.";
    if (!values.privacyConsent) next.privacyConsent = "Ta zgoda jest potrzebna do obsługi zgłoszenia.";
    if (!values.accuracyConfirmed) next.accuracyConfirmed = "Potwierdź poprawność danych.";
    return next;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus("error");
      setMessage("Sprawdź zaznaczone pola.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setStatus("saving");
    setMessage("Zapisuję zgłoszenie…");
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...onlyApplicableDetails(values), website: "" }) });
      const body = await response.json() as { reference?: string; field?: Field; error?: string };
      if (!response.ok) {
        if (body.field) setErrors({ [body.field]: body.error || "Popraw to pole." });
        setStatus("error");
        setMessage(body.error || "Nie udało się wysłać zgłoszenia.");
        return;
      }
      window.localStorage.removeItem(draftKey);
      setValues(empty);
      setStatus("done");
      setMessage(`Zgłoszenie ${body.reference} zostało zapisane. SHOWteam skontaktuje się z Tobą.`);
    } catch {
      setStatus("error");
      setMessage("Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.");
    }
  }

  function clearForm() {
    if (!window.confirm("Wyczyścić cały formularz zgłoszeniowy?")) return;
    window.localStorage.removeItem(draftKey);
    setValues(empty);
    setErrors({});
    setStatus("idle");
    setMessage("");
  }

  function selectCategory(category: ApplicationCategory) {
    setValues((current) => ({ ...current, category, offer: "", discipline: "", level: "", transport: "" }));
    setErrors((current) => ({ ...current, category: undefined, offer: undefined, discipline: undefined, level: undefined, transport: undefined }));
  }

  const selectedGroup = groups.find((group) => group.category === values.category);
  const showSportDetails = applicationHasSportDetails(values.category);
  const disciplineOptions = applicationDisciplinesForCategory(values.category);
  const options = selectedGroup?.offers.flatMap((offer) => offer.dates.length
    ? offer.dates.map((date) => applicationOfferValue(offer.title, date))
    : [`${offer.title} — termin do ustalenia`]) ?? [];

  const inputClass = (field: Field) => `mt-2 w-full border bg-white/[.04] px-4 py-3 text-base text-white outline-none ${errors[field] ? "border-red-500" : "border-white/20 focus:border-orange-500"}`;
  const error = (field: Field) => errors[field] ? <span className="mt-2 block text-sm font-semibold text-red-300">{errors[field]}</span> : null;
  const text = (field: keyof Pick<Values, "offer" | "firstName" | "lastName" | "birthDate" | "address" | "email" | "participantEmail" | "phone" | "discipline" | "level" | "transport" | "notes">) => ({ value: values[field], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(field, event.target.value) });

  return <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate className="space-y-8">
    <section className="border border-white/15 bg-white/[.025] p-5 sm:p-8"><span className="eyebrow">01 · Wyjazd</span>
      <fieldset data-error={Boolean(errors.category)} className="mt-5"><legend className="font-bold">Najpierw wybierz rodzaj</legend><div className="mt-3 grid grid-cols-3 gap-2">{applicationCategories.map((category) => <button key={category} type="button" onClick={() => selectCategory(category)} aria-pressed={values.category === category} className="min-h-14 border border-white/20 px-2 py-3 font-bold aria-pressed:border-orange-500 aria-pressed:bg-orange-500 aria-pressed:text-black">{category}</button>)}</div>{error("category")}</fieldset>
      {values.category ? <label data-error={Boolean(errors.offer)} className="mt-5 block font-bold">Następnie wybierz termin<select {...text("offer")} className={inputClass("offer")}><option value="" className="text-black">Wybierz z listy…</option>{options.map((option) => <option key={option} value={option} className="text-black">{option}</option>)}<option value={`${values.category} — inny termin, proszę o kontakt`} className="text-black">Inny termin — proszę o kontakt</option></select>{error("offer")}</label> : null}
    </section>
    <section className="border border-white/15 bg-white/[.025] p-5 sm:p-8"><span className="eyebrow">02 · Uczestnik</span><div className="mt-5 grid gap-5 sm:grid-cols-2">
      <label data-error={Boolean(errors.firstName)} className="block font-bold">Imię<input {...text("firstName")} autoComplete="given-name" className={inputClass("firstName")} />{error("firstName")}</label>
      <label data-error={Boolean(errors.lastName)} className="block font-bold">Nazwisko<input {...text("lastName")} autoComplete="family-name" className={inputClass("lastName")} />{error("lastName")}</label>
      <label data-error={Boolean(errors.birthDate)} className="block font-bold">Data urodzenia<input {...text("birthDate")} type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass("birthDate")} />{error("birthDate")}</label>
      <label data-error={Boolean(errors.phone)} className="block font-bold">Telefon opiekuna lub uczestnika<input {...text("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="np. 500 128 090" className={inputClass("phone")} />{error("phone")}</label>
      <label data-error={Boolean(errors.address)} className="block font-bold sm:col-span-2">Adres zamieszkania i kod pocztowy<textarea {...text("address")} rows={3} autoComplete="street-address" className={inputClass("address")} />{error("address")}</label>
      <label data-error={Boolean(errors.email)} className="block font-bold">E-mail kontaktowy<input {...text("email")} type="email" inputMode="email" autoComplete="email" className={inputClass("email")} />{error("email")}</label>
      <label data-error={Boolean(errors.participantEmail)} className="block font-bold">E-mail uczestnika <span className="font-normal text-white/35">(opcjonalnie)</span><input {...text("participantEmail")} type="email" inputMode="email" className={inputClass("participantEmail")} />{error("participantEmail")}</label>
    </div></section>
    <section className="border border-white/15 bg-white/[.025] p-5 sm:p-8"><span className="eyebrow">03 · Dodatkowe informacje</span><div className="mt-5 grid gap-5 sm:grid-cols-3">
      {showSportDetails ? <label className="block font-bold">Dyscyplina <span className="font-normal text-white/35">(opcjonalnie)</span><select {...text("discipline")} className={inputClass("discipline")}><option value="" className="text-black">Nie wybieram</option>{disciplineOptions.map((value) => <option key={value} className="text-black">{value}</option>)}</select></label> : null}
      {showSportDetails ? <label className="block font-bold">Poziom <span className="font-normal text-white/35">(opcjonalnie)</span><select {...text("level")} className={inputClass("level")}><option value="" className="text-black">Nie wybieram</option>{applicationLevels.map((value) => <option key={value} className="text-black">{value}</option>)}</select></label> : null}
      {values.category === "Zima" ? <label className="block font-bold">Transport autokarem<select {...text("transport")} className={inputClass("transport")}><option value="" className="text-black">Wybierz…</option>{applicationTransport.map((value) => <option key={value} className="text-black">{value}</option>)}</select></label> : null}
      <label className="block font-bold sm:col-span-3">Uwagi <span className="font-normal text-white/35">(opcjonalnie)</span><textarea {...text("notes")} rows={5} maxLength={2000} className={inputClass("notes")} /></label>
    </div></section>
    <section className="space-y-5 border border-white/15 bg-white/[.025] p-5 text-sm leading-6 sm:p-8"><span className="eyebrow">04 · Zgody</span>
      <label data-error={Boolean(errors.privacyConsent)} className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={values.privacyConsent} onChange={(event) => set("privacyConsent", event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-500" /><span>Wyrażam zgodę na przetwarzanie podanych danych przez SHOWTEAM Adam Szołtysek w celu obsługi zgłoszenia. Zgodę można wycofać, pisząc na biuro@showteam.eu.</span></label>{error("privacyConsent")}
      <label data-error={Boolean(errors.accuracyConfirmed)} className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={values.accuracyConfirmed} onChange={(event) => set("accuracyConfirmed", event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-500" /><span>Potwierdzam poprawność danych oraz pełnoletność osoby zgłaszającej albo działanie jako prawny opiekun uczestnika.</span></label>{error("accuracyConfirmed")}
      <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={values.newsletterConsent} onChange={(event) => set("newsletterConsent", event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-500" /><span>Chcę otrzymywać od SHOWteam informacje o nowych turnusach i wydarzeniach na podany e-mail. Zgoda jest dobrowolna i można ją wycofać, pisząc na biuro@showteam.eu.</span></label>
    </section>
    {message ? <p role={status === "error" ? "alert" : "status"} className={`border-l-2 py-2 pl-3 ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="mr-2 inline size-5" /> : null}{message}</p> : null}
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><button type="submit" disabled={status === "saving" || status === "done"} className="flex min-h-14 items-center justify-center gap-2 bg-orange-500 px-6 font-black uppercase text-black disabled:opacity-50">{status === "saving" ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}{status === "saving" ? "Wysyłam…" : "Wyślij zgłoszenie"}</button><button type="button" onClick={clearForm} disabled={status === "saving"} className="min-h-14 border border-white/25 px-6 font-bold text-white/65">Wyczyść formularz</button></div>
  </form>;
}
