import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ContentCreator } from "@/components/ContentCreator";
import { SavedScripts } from "@/components/SavedScripts";
import { KnowledgePanel } from "@/components/KnowledgePanel";
import { listScripts } from "@/lib/services/scripts";
import { getSetting, CONTENT_KNOWLEDGE_KEY } from "@/lib/services/settings";

export default function ContentPage() {
  const ctx = requireSession();
  const scripts = listScripts(ctx.teamId);
  const knowledge = getSetting<{ text: string }>(ctx.teamId, CONTENT_KNOWLEDGE_KEY)?.text ?? "";

  return (
    <div>
      <PageHeader
        title="Organic Content Creator"
        subtitle="Add a topic, describe the video, and get a viral-grade Reels/TikTok or LinkedIn script with a strong hook."
      />
      <KnowledgePanel initial={knowledge} />
      <ContentCreator />
      <SavedScripts scripts={scripts} role={ctx.role} />
    </div>
  );
}
