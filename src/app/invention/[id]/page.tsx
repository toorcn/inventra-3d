"use client";

import HolographicViewer from "@/components/viewer/HolographicViewer";
import { getInventionById } from "@/data/inventions";
import type { InventionComponent } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function InventionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invention = getInventionById(params.id);

  const [selectedComponent, setSelectedComponent] =
    useState<InventionComponent | null>(null);

  if (!invention) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">
            Invention Not Found
          </h1>
          <p className="mb-8 text-gray-400">
            No invention with id &quot;{params.id}&quot; exists.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Back to Globe
          </button>
        </div>
      </main>
    );
  }

  return (
    <HolographicViewer
      invention={invention}
      onBack={() => router.push("/")}
      onComponentSelect={setSelectedComponent}
    />
  );
}
