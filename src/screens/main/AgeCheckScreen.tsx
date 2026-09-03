import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";
import { AgeGateForm, NotYetView } from "../../components/AgeGateForm";
import {
  markAgeDenied,
  wasAgeDenied,
  type PendingBirth,
} from "../../utils/ageGate";

/**
 * Shown, over everything else, to a signed-in account that has no age on file:
 * testers from before the age policy, and anyone who signed up on a path that
 * skipped the gate. Under the minimum age the account is removed.
 */
export default function AgeCheckScreen() {
  const setBirthMonthYear = useMutation(api.users.setBirthMonthYear);
  const { user: clerkUser } = useUser();
  const { signOut } = useAuth();
  const [denied, setDenied] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    wasAgeDenied().then(setDenied, () => setDenied(false));
  }, []);

  const handleSubmit = async (birth: PendingBirth) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await setBirthMonthYear(birth);
      if (result.band === "under14") {
        await markAgeDenied();
        setDenied(true);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Under the minimum age we keep no account: remove it, then sign out. The
  // sign-out unmounts this screen, so a failed removal is surfaced first.
  const handleLeave = async () => {
    setLeaving(true);
    try {
      await clerkUser?.delete();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We could not remove the account. Email support@hikewise.app.",
      );
    }
    await signOut();
    setLeaving(false);
  };

  if (denied === null) return null;

  if (denied) {
    return <NotYetView onDone={handleLeave} busy={leaving} error={error} />;
  }

  return (
    <AgeGateForm
      title="One quick check"
      subtitle="When were you born?"
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  );
}
