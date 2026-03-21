import { notFound } from "next/navigation";
import { InventionDetailPageClient } from "@/components/discovery/InventionDetailPageClient";
import { getInventionById } from "@/data/inventions";

type InventionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InventionDetailPage({ params }: InventionDetailPageProps) {
  const { id } = await params;
  const invention = getInventionById(id);

  if (!invention) {
    notFound();
  }

  return <InventionDetailPageClient invention={invention} />;
}
