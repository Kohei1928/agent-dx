"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      {/* ドラッグハンドル */}
      <button
        {...attributes}
        {...listeners}
        className="px-2 py-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
        title="ドラッグして並べ替え"
      >
        ⋮⋮
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemId: (item: T, index: number) => string;
}

export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  getItemId,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(
        (item, index) => getItemId(item, index) === active.id
      );
      const newIndex = items.findIndex(
        (item, index) => getItemId(item, index) === over.id
      );

      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  const itemIds = items.map((item, index) => getItemId(item, index));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item, index) => (
            <SortableItem key={getItemId(item, index)} id={getItemId(item, index)}>
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}






