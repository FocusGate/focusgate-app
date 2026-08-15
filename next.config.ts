import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Next auto-detects the project root by walking up for a lockfile, and finds a stray
    // package-lock.json at C:\Users\<user>\package-lock.json (outside this project
    // entirely) before it finds this project's own — that misroots every dev/build run at
    // the user's home directory instead of here, which is what was corrupting Turbopack's
    // filesystem cache and causing "internal error" resets. process.cwd() is correct
    // because both `npm run dev` (package.json) and the launch.json preview config always
    // invoke Next from this project's own directory.
    root: process.cwd(),
  },
  experimental: {
    // Turbopack's persistent on-disk cache (.next/cache) is on by default for `next dev`
    // as of Next 16.1 — and this project lives inside a OneDrive-synced folder, whose
    // file-locking/virtualization corrupts that cache mid-write ("Persisting failed:
    // Unable to commit operations", "Another write batch or compaction is already
    // active"), which is what was actually breaking dev server reliability. Turbopack
    // still caches fully in-memory without this — just not across restarts.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
