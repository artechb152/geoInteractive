"use client";

import dynamic from "next/dynamic";

// The 3D experience must run client-side only (Three.js needs the DOM).
const Experience = dynamic(
  () => import("@/components/Experience").then((m) => m.Experience),
  { ssr: false }
);

export default function Page() {
  return (
    <main>
      <Experience />
    </main>
  );
}
