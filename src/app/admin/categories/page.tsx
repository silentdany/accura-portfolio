import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export default async function AdminCategories() {
  const cats = await prisma.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { projects: true } } } });
  return (
    <div className="max-w-2xl">
      <h1 className="title text-3xl text-ink">Catégories</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Une carte peut appartenir à plusieurs catégories. Le filtre public n&apos;affiche que les catégories non vides.</p>
      <CategoryManager categories={cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji, count: c._count.projects }))} />
    </div>
  );
}
