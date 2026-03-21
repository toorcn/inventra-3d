"use client";

import { ChatPanel } from "@/components/expert/ChatPanel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ComponentInfo } from "@/components/viewer/ComponentInfo";
import ModelViewer from "@/components/viewer/ModelViewer";
import { ViewerControls } from "@/components/viewer/ViewerControls";
import { Badge } from "@/components/ui/Badge";
import { getInventionById } from "@/data/inventions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

export default function InventionDetailPage() {
  const params = useParams<{ id: string }>();
  const inventionId = params.id;
  const invention = getInventionById(inventionId);

  if (!invention) {
    notFound();
  }

  const [isExploded, setIsExploded] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Globe
        </Link>
        <div className="text-center">
          <h1 className="text-base font-semibold text-white">
            {invention.title} ({invention.year})
          </h1>
        </div>
        <Badge category={invention.category} />
      </header>

      <section className="flex flex-1 overflow-hidden">
        <div className="relative flex-[2]">
          {invention.hasModel ? (
            <>
              <ErrorBoundary>
                <ModelViewer
                  inventionId={invention.id}
                  isExploded={isExploded}
                  selectedComponentId={selectedComponentId}
                  onComponentSelect={setSelectedComponentId}
                />
              </ErrorBoundary>
              <ViewerControls
                isExploded={isExploded}
                onToggleExplode={() => setIsExploded((prev) => !prev)}
                onReset={() => {
                  setIsExploded(false);
                  setSelectedComponentId(null);
                }}
              />
              {selectedComponentId && (
                <ComponentInfo
                  componentId={selectedComponentId}
                  onClose={() => setSelectedComponentId(null)}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-xl rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-6 backdrop-blur-xl">
                <h2 className="mb-2 text-xl font-semibold text-white">Concept View</h2>
                <p className="text-sm leading-relaxed text-gray-300">{invention.description}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="w-[420px] border-l border-white/5 bg-black/20">
          <ChatPanel inventionId={invention.id} componentId={selectedComponentId} />
        </aside>
      </section>
    </main>
  );
}
