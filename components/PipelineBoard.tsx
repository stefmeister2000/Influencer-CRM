"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setStatusAction } from "@/app/actions/influencers";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { Avatar, ScoreBadge } from "@/components/ui";
import { HandleActions } from "@/components/HandleActions";
import type { Influencer, InfluencerStatus } from "@/lib/types";

export function PipelineBoard({ initial }: { initial: Influencer[] }) {
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, start] = useTransition();

  function moveTo(status: InfluencerStatus) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const current = items.find((i) => i.id === id);
    if (!current || current.status === status) return;
    // optimistic — persist in the background, no full refresh (avoids lag)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    start(() => { setStatusAction(id, { status }); });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {KANBAN_COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.status);
        const isOver = overCol === col.status;
        return (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.status); }}
            onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
            onDrop={() => moveTo(col.status)}
            className={
              "w-[240px] shrink-0 rounded-xl p-2 transition " +
              (isOver ? "bg-brand-50 ring-2 ring-brand-300" : "bg-slate-50")
            }
          >
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-sm font-medium text-ink-700">{col.title}</h3>
              <span className="badge bg-white text-slate-600 border border-slate-200">{colItems.length}</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {colItems.map((i) => (
                <div
                  key={i.id}
                  draggable
                  onDragStart={() => setDragId(i.id)}
                  onDragEnd={() => setDragId(null)}
                  className={
                    "card p-2.5 cursor-grab active:cursor-grabbing " +
                    (dragId === i.id ? "opacity-50" : "")
                  }
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={i.profile_picture_url} name={i.full_name ?? i.instagram_username} size={28} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/influencers/${i.id}`}
                        className="text-sm font-medium truncate block hover:text-brand-700">
                        {i.full_name ?? i.instagram_username}
                      </Link>
                      <div className="text-xs text-ink-500 truncate">@{i.instagram_username}</div>
                    </div>
                    <ScoreBadge score={i.final_score} />
                  </div>
                  <div className="mt-2"><HandleActions username={i.instagram_username} /></div>
                </div>
              ))}
              {colItems.length === 0 && <div className="text-xs text-ink-400 px-1 py-3 text-center">Drop here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
