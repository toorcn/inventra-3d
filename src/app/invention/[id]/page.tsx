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
import ReactMarkdown from "react-markdown";

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
        <div className="relative flex-[2] bg-[radial-gradient(circle_at_center,_#1a1f3c_0%,_#0a0a1a_100%)]">
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
              
              {/* Overlay Info Panel for Model View */}
              <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-sm">
                <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl transition-all hover:bg-black/50">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge category={invention.category} />
                    <span className="text-xs font-semibold text-blue-400/80 uppercase tracking-widest">{invention.year}</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">{invention.title}</h2>
                  <div className="line-clamp-3 text-sm leading-relaxed text-gray-300 transition-all hover:line-clamp-none">
                    <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                      {invention.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

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
              <div className="max-w-2xl rounded-[2rem] border border-white/10 bg-[var(--bg-panel)] p-10 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
                <div className="mb-8 flex flex-col items-center text-center">
                  <Badge category={invention.category} className="mb-4" />
                  <h2 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    {invention.title}
                  </h2>
                  <div className="h-1 w-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="text-lg leading-relaxed text-gray-200 antialiased first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:text-blue-400 mb-6 last:mb-0">
                          {children}
                        </p>
                      )
                    }}
                  >
                    {invention.description}
                  </ReactMarkdown>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-8">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Invention Date</h4>
                    <p className="text-xl font-semibold text-white">{invention.year}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Primary Inventor</h4>
                    <p className="text-xl font-semibold text-white">{invention.inventors[0]}</p>
                  </div>
                </div>
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
