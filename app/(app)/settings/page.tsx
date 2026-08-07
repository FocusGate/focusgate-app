"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import Avatar from "@/components/app/Avatar";
import SignOutConfirmDialog from "@/components/app/SignOutConfirmDialog";
import PreferenceToggle from "@/components/app/settings/PreferenceToggle";
import PasswordChangeForm from "@/components/app/settings/PasswordChangeForm";
import DeleteAccountDialog from "@/components/app/settings/DeleteAccountDialog";
import { useCurrentUserContext, type CurrentUser } from "@/contexts/CurrentUserContext";
import {
  addBlockedSite,
  deleteAccount,
  getBlockedSites,
  getUserPreferences,
  removeBlockedSite,
  reorderBlockedSites,
  signOut,
  updateProfile,
  updateUserPreferences,
  type UserPreferences,
} from "@/lib/supabase";

type BlockedSite = { id: string; url: string };

const PRESET_DURATIONS = [25, 45, 60, 120];

export default function SettingsPage() {
  const { user, setUser } = useCurrentUserContext();
  const router = useRouter();

  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [newSite, setNewSite] = useState("");
  const [addingSite, setAddingSite] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding the editable name field from the loaded user is the intended sync here
    setName(user.name);
    Promise.all([getBlockedSites(user.id), getUserPreferences(user.id)])
      .then(([sites, p]) => {
        setBlockedSites(sites as BlockedSite[]);
        setPrefs(p);
      })
      .catch((err) => setPrefsError(err instanceof Error ? err.message : "Could not load your settings."));
  }, [user]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || savingName) return;
    setNameError(null);
    setNameSaved(false);
    setSavingName(true);
    try {
      await updateProfile(user.id, { name: name.trim() });
      setUser({ ...user, name: name.trim() } as CurrentUser);
      setNameSaved(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not update your name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newSite.trim() || addingSite) return;
    setSiteError(null);
    setAddingSite(true);
    try {
      const site = await addBlockedSite(user.id, newSite.trim());
      setBlockedSites((s) => [...s, site as BlockedSite]);
      setNewSite("");
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Could not add that site.");
    } finally {
      setAddingSite(false);
    }
  }

  async function handleRemoveSite(url: string) {
    if (!user) return;
    await removeBlockedSite(user.id, url);
    setBlockedSites((s) => s.filter((site) => site.url !== url));
  }

  function handleReorderSites(newOrder: BlockedSite[]) {
    setBlockedSites(newOrder);
    if (!user) return;
    void reorderBlockedSites(
      user.id,
      newOrder.map((s) => s.id)
    );
  }

  async function handlePrefChange(patch: Partial<UserPreferences>) {
    if (!user || !prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      await updateUserPreferences(user.id, patch);
    } catch (err) {
      setPrefs(prev);
      setPrefsError(err instanceof Error ? err.message : "Could not save that preference.");
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  async function handleDeleteAccount() {
    if (!user) return;
    await deleteAccount(user.id);
    router.replace("/");
  }

  if (!user) return null;

  return (
    <>
      <SignOutConfirmDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} onConfirm={handleSignOut} />
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDeleteAccount} />

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Settings</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>Manage your account, blocked sites, and preferences.</p>

      <div style={{ marginTop: 28, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Profile</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Avatar name={user.name} size={56} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{user.name}</div>
            <div style={{ color: "#7a7d84", fontSize: 13, marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
        <form onSubmit={handleSaveName} style={{ display: "flex", gap: 10, maxWidth: 360, flexWrap: "wrap" }}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameSaved(false);
            }}
            placeholder="Display name"
            style={{ flex: 1, minWidth: 160, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none" }}
          />
          <button
            type="submit"
            disabled={savingName || !name.trim()}
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: savingName ? 0.6 : 1 }}
          >
            {savingName ? "Saving…" : "Save"}
          </button>
        </form>
        {nameError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{nameError}</p>}
        {nameSaved && !nameError && <p style={{ color: "#22c55e", fontSize: 13, marginTop: 10 }}>Name updated.</p>}
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Blocked sites</h2>
        <p style={{ color: "#7a7d84", fontSize: 13, marginBottom: 18 }}>Drag to reorder.</p>
        <form onSubmit={handleAddSite} style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="e.g. youtube.com"
            style={{ flex: 1, minWidth: 0, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 14, outline: "none" }}
          />
          <button
            type="submit"
            disabled={addingSite}
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: addingSite ? 0.6 : 1, flexShrink: 0 }}
          >
            {addingSite ? "Adding…" : "Add"}
          </button>
        </form>
        {siteError && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{siteError}</p>}

        {blockedSites.length === 0 && <span style={{ color: "#7a7d84", fontSize: 14 }}>No sites blocked yet.</span>}
        <Reorder.Group axis="y" values={blockedSites} onReorder={handleReorderSites} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 0, margin: 0, listStyle: "none" }}>
          {blockedSites.map((site) => (
            <Reorder.Item
              key={site.id}
              value={site}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#101012",
                border: "1px solid #26262b",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "grab",
              }}
            >
              <GripVertical size={15} color="#5b5e66" />
              <span style={{ flex: 1, minWidth: 0, color: "#f87171", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {site.url}
              </span>
              <button
                onClick={() => handleRemoveSite(site.url)}
                aria-label={`Remove ${site.url}`}
                style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
              >
                ✕
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Notifications</h2>
        {prefsError && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>{prefsError}</p>}
        {!prefs && <p style={{ color: "#7a7d84", fontSize: 14 }}>Loading preferences…</p>}
        {prefs && (
          <div style={{ marginTop: 12 }}>
            <PreferenceToggle
              label="Notify my groups when I start a session"
              description="Sends a notification to everyone in your groups."
              checked={prefs.share_session_starts}
              onChange={(v) => handlePrefChange({ share_session_starts: v })}
            />
            <PreferenceToggle
              label="Friend activity notifications"
              description="Get notified about activity from people in your groups."
              checked={prefs.notify_friend_activity}
              onChange={(v) => handlePrefChange({ notify_friend_activity: v })}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Session preferences</h2>
        {prefs && (
          <div style={{ marginTop: 12 }}>
            <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Default session duration</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESET_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePrefChange({ default_session_minutes: d })}
                    style={{
                      background: prefs.default_session_minutes === d ? "rgba(245,158,11,0.15)" : "transparent",
                      color: prefs.default_session_minutes === d ? "#F59E0B" : "#9a9da4",
                      border: `1px solid ${prefs.default_session_minutes === d ? "rgba(245,158,11,0.5)" : "#26262b"}`,
                      padding: "8px 16px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {d < 60 ? `${d} min` : `${d / 60} hr`}
                  </button>
                ))}
              </div>
            </div>
            <PreferenceToggle
              label="Break reminders"
              description="Get reminded to take breaks between sessions."
              checked={prefs.session_break_reminders}
              onChange={(v) => handlePrefChange({ session_break_reminders: v })}
            />
            {prefs.session_break_reminders && (
              <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#9a9da4", fontSize: 13 }}>Remind me every</span>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={prefs.break_reminder_interval_minutes}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n) && n > 0) void handlePrefChange({ break_reminder_interval_minutes: n });
                  }}
                  style={{ width: 80, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "8px 10px", borderRadius: 8, fontSize: 13, outline: "none", textAlign: "center" }}
                />
                <span style={{ color: "#9a9da4", fontSize: 13 }}>minutes</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Account</h2>
        <PasswordChangeForm />

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <button
            onClick={() => setSignOutOpen(true)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#9a9da4", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Sign out
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Delete account
          </button>
        </div>
      </div>
    </>
  );
}
