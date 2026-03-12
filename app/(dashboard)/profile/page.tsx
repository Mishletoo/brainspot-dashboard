 "use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600";

type EmployeeProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  photo_url: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Could not load profile. Please sign in again.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, phone, birth_date, photo_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage("Could not load your employee profile. Please contact your administrator.");
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setPhone(data.phone ?? "");
      setBirthDate(data.birth_date ?? "");
      setPhotoUrl(data.photo_url ?? "");
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    const { error } = await supabase.rpc("update_employee_profile", {
      p_phone: phone.trim() === "" ? null : phone.trim(),
      p_birth_date: birthDate.trim() === "" ? null : birthDate.trim(),
      p_photo_url: photoUrl.trim() === "" ? null : photoUrl.trim(),
    });

    if (error) {
      setErrorMessage("Could not update your profile. Please try again.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Profile updated successfully.");
    setIsSaving(false);
  };

  const displayName =
    [profile?.first_name, profile?.last_name].filter((part) => part && part.trim().length > 0).join(" ") ||
    "Your profile";

  return (
    <div className="mx-auto flex max-w-2xl flex-col justify-center py-8">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Profile</h1>
          <p className="mt-1 text-sm text-zinc-400">
            View and update your personal details. Salary and other sensitive fields can only be managed by admins.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-400">Loading your profile...</p>
        ) : errorMessage ? (
          <p className="text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-950/40 p-4">
              <p className="text-sm font-medium text-zinc-100">{displayName}</p>
              {profile?.email && <p className="mt-1 text-xs text-zinc-400">{profile.email}</p>}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-zinc-300">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={inputClassName}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="birth_date" className="text-sm font-medium text-zinc-300">
                  Birth date
                </label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  className={inputClassName}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="photo_url" className="text-sm font-medium text-zinc-300">
                  Photo URL
                </label>
                <input
                  id="photo_url"
                  name="photo_url"
                  type="url"
                  className={inputClassName}
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-400" role="alert">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-emerald-400" role="status">
                  {successMessage}
                </p>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

