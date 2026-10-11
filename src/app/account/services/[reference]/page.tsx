import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import ProjectWorkspace from "@/components/project/ProjectWorkspace";

export default async function AccountProjectPage({ params }: { params: Promise<{ reference: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();
  const project = q1<any>("SELECT * FROM projects WHERE reference = ? AND user_id = ?", (await params).reference, user.id);
  if (!project) notFound();
  return <ProjectWorkspace project={project} />;
}
