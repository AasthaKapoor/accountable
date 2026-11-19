import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { STAGE_KEYS, type Stage } from "../../lib/stages";
import type { Deal, Pipeline } from "../../lib/types";
import { Column } from "./Column";
import { DealCardBody } from "./DealCard";
import { useMoveDeal } from "./move";

type Lanes = Record<Stage, Deal[]>;

const lanesOf = (pipeline: Pipeline) => Object.fromEntries(pipeline.columns.map((c) => [c.stage, c.deals])) as Lanes;

function laneOf(lanes: Lanes, id: UniqueIdentifier): Stage | undefined {
  if (STAGE_KEYS.includes(id as Stage)) return id as Stage;
  return STAGE_KEYS.find((stage) => lanes[stage].some((d) => d.id === id));
}

/**
 * The six columns. While a card is dragged, a local copy of the lanes shows where it
 * will land; on drop the move is applied to the board straight away and sent to the server.
 */
export function Board({ pipeline, onAdd }: { pipeline: Pipeline; onAdd: (stage: Stage) => void }) {
  const move = useMoveDeal();
  const [dragLanes, setDragLanes] = useState<Lanes | null>(null);
  const [active, setActive] = useState<Deal | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const lanes = dragLanes ?? lanesOf(pipeline);

  const onDragStart = ({ active }: DragStartEvent) => {
    const all = lanesOf(pipeline);
    setDragLanes(all);
    setActive(Object.values(all).flat().find((d) => d.id === active.id) ?? null);
  };

  // Move the placeholder into the column under the pointer.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragLanes) return;
    const from = laneOf(dragLanes, active.id);
    const to = laneOf(dragLanes, over.id);
    if (!from || !to || from === to) return;
    setDragLanes((current) => {
      if (!current) return current;
      const card = current[from].find((d) => d.id === active.id)!;
      const target = current[to];
      const overIndex = target.findIndex((d) => d.id === over.id);
      // Below the middle of the card under the pointer means after it.
      const dragged = active.rect.current.translated;
      const below = dragged !== null && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
      const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
      return {
        ...current,
        [from]: current[from].filter((d) => d.id !== active.id),
        [to]: [...target.slice(0, index), card, ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragLanes;
    setDragLanes(null);
    setActive(null);
    if (!over || !current) return;
    const stage = laneOf(current, active.id);
    if (!stage) return;
    let lane = current[stage];
    const from = lane.findIndex((d) => d.id === active.id);
    const overIndex = lane.findIndex((d) => d.id === over.id);
    if (overIndex >= 0 && overIndex !== from) lane = arrayMove(lane, from, overIndex);
    const index = lane.findIndex((d) => d.id === active.id);

    const original = pipeline.columns.find((c) => c.deals.some((d) => d.id === active.id))!;
    const unchanged = original.stage === stage && original.deals.findIndex((d) => d.id === active.id) === index;
    if (!unchanged) move(Number(active.id), stage, index);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setDragLanes(null);
        setActive(null);
      }}
    >
      <div className="board">
        {pipeline.columns.map((column) => (
          <Column key={column.stage} stage={column.stage} deals={lanes[column.stage]} totals={column.totals} onAdd={() => onAdd(column.stage)} />
        ))}
      </div>
      <DragOverlay>{active && <div className="card overlay"><DealCardBody deal={active} /></div>}</DragOverlay>
    </DndContext>
  );
}
