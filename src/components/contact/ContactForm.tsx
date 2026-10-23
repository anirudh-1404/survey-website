"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot field for anti-spam bots
  const [honeypot, setHoneypot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }>({});

  const validate = () => {
    const errors: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    } = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please provide a valid email address.";
    }

    if (!subject.trim()) {
      errors.subject = "Subject line is required.";
    } else if (subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters.";
    }

    if (!message.trim()) {
      errors.message = "Message content is required.";
    } else if (message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          website: honeypot, // Honeypot
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        setHoneypot("");
        setFieldErrors({});
        toast.success("Thank you! Your message has been sent to our editorial team.");
      } else {
        const err =
          data.error ||
          "Unable to submit your inquiry at this moment. Please try again.";
        setErrorMessage(err);
        toast.error(err);
      }
    } catch {
      const netErr =
        "A network communication error occurred. Please verify your connection and try again.";
      setErrorMessage(netErr);
      toast.error(netErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setErrorMessage(null);
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-[#0f121d] p-8 text-center space-y-5 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Inquiry Successfully Transmitted
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-300">
            Thank you for reaching out. Your communication has been securely
            logged into the PULSE editorial queue. Our investigative team
            evaluates every transmission according to our non-partisan standards.
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Submit Another Inquiry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-white/10 bg-[#0d0f17] p-6 sm:p-8 space-y-6 shadow-xl"
    >
      {/* Error alert banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Submission Interrupted</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Honeypot field (hidden from genuine users, traps automated scrapers) */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website-field">Leave this field blank</label>
        <input
          id="website-field"
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-name"
            className="block text-xs font-bold tracking-wider text-zinc-300 uppercase"
          >
            Full Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
            }}
            placeholder="e.g. Elena Rostova"
            className={`w-full rounded-lg border bg-[#141724] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
              fieldErrors.name
                ? "border-rose-500 ring-1 ring-rose-500/40"
                : "border-white/10 focus:border-rose-500"
            }`}
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-rose-400 font-medium">
              {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-email"
            className="block text-xs font-bold tracking-wider text-zinc-300 uppercase"
          >
            Email Address <span className="text-rose-400">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            placeholder="name@example.com"
            className={`w-full rounded-lg border bg-[#141724] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
              fieldErrors.email
                ? "border-rose-500 ring-1 ring-rose-500/40"
                : "border-white/10 focus:border-rose-500"
            }`}
          />
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-400 font-medium">
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      {/* Subject Line */}
      <div className="space-y-1.5">
        <label
          htmlFor="contact-subject"
          className="block text-xs font-bold tracking-wider text-zinc-300 uppercase"
        >
          Subject Line <span className="text-rose-400">*</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          required
          maxLength={200}
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (fieldErrors.subject) setFieldErrors({ ...fieldErrors, subject: undefined });
          }}
          placeholder="e.g. Empirical research query on renewable energy inquiry"
          className={`w-full rounded-lg border bg-[#141724] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
            fieldErrors.subject
              ? "border-rose-500 ring-1 ring-rose-500/40"
              : "border-white/10 focus:border-rose-500"
          }`}
        />
        {fieldErrors.subject && (
          <p className="text-[11px] text-rose-400 font-medium">
            {fieldErrors.subject}
          </p>
        )}
      </div>

      {/* Message Body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="contact-message"
            className="block text-xs font-bold tracking-wider text-zinc-300 uppercase"
          >
            Message Body <span className="text-rose-400">*</span>
          </label>
          <span className="text-[11px] font-mono text-zinc-500">
            {message.length} / 3000
          </span>
        </div>
        <textarea
          id="contact-message"
          required
          rows={6}
          maxLength={3000}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: undefined });
          }}
          placeholder="Please describe your rationale, data references, or feedback in detail..."
          className={`w-full rounded-lg border bg-[#141724] p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-y transition-colors ${
            fieldErrors.message
              ? "border-rose-500 ring-1 ring-rose-500/40"
              : "border-white/10 focus:border-rose-500"
          }`}
        />
        {fieldErrors.message && (
          <p className="text-[11px] text-rose-400 font-medium">
            {fieldErrors.message}
          </p>
        )}
      </div>

      {/* Submission Footer with Abuse Protection Note */}
      <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-4 w-4 text-rose-500 shrink-0" />
          <span>Encrypted transmission • Rate-limited and bot-protected</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transmitting...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit Inquiry</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
