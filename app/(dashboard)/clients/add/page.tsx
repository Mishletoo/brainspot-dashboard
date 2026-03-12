"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

export default function AddClientPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const name = typeof formData.get("name") === "string" ? formData.get("name")?.toString().trim() : "";
    const contactPerson = toNullableText(formData.get("contact_person"));
    const email = toNullableText(formData.get("email"));
    const phone = toNullableText(formData.get("phone"));
    const notes = toNullableText(formData.get("notes"));

    if (!name) {
      setErrorMessage("Name is required.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("clients").insert({
      name,
      contact_person: contactPerson,
      email,
      phone,
      notes,
    });

    if (error) {
      setErrorMessage("Could not save client. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push("/clients");
  };

  const handleCancel = () => {
    router.push("/clients");
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Client</h1>
        <p className="mt-1 text-sm text-zinc-500">Create a new client by filling in the form below.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Name
            </label>
            <input id="name" name="name" type="text" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="contact_person" className="text-sm font-medium text-zinc-700">
              Contact person
            </label>
            <input id="contact_person" name="contact_person" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input id="email" name="email" type="email" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
              Phone
            </label>
            <input id="phone" name="phone" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className={`${inputClassName} resize-y`}
              placeholder="Optional internal notes"
            />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Saving..." : "Save client"}
          </button>
        </div>
      </form>
    </div>
  );
}
