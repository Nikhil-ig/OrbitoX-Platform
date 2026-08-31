'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ComponentType } from '@orbitox/commerce';

export interface DragItem {
  type: 'new-component' | 'existing-section';
  componentType?: ComponentType;
  sectionId?: string;
  name: string;
  icon: string;
}

export interface DndContextValue {
  isDragging: boolean;
  dragItem: DragItem | null;
  dragPos: { x: number; y: number };
  dropTargetIndex: number | null;
  startDrag: (item: DragItem, e: React.PointerEvent | React.MouseEvent) => void;
  updateDropTarget: (index: number | null) => void;
  endDrag: () => void;
  onDropSection: (item: DragItem, targetIndex: number) => void;
}

const DndContext = createContext<DndContextValue | null>(null);

export function useBuilderDnd() {
  const ctx = useContext(DndContext);
  if (!ctx) {
    throw new Error('useBuilderDnd must be used within a BuilderDndProvider');
  }
  return ctx;
}

export interface BuilderDndProviderProps {
  children: React.ReactNode;
  onDrop: (item: DragItem, targetIndex: number) => void;
}

export function BuilderDndProvider({ children, onDrop }: BuilderDndProviderProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);
  const dragItemRef = useRef<DragItem | null>(null);

  dropTargetIndexRef.current = dropTargetIndex;
  dragItemRef.current = dragItem;

  const startDrag = (item: DragItem, e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    setDragItem(item);
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const updateDropTarget = (index: number | null) => {
    setDropTargetIndex(index);
  };

  const endDrag = () => {
    if (dragItemRef.current && dropTargetIndexRef.current !== null) {
      onDrop(dragItemRef.current, dropTargetIndexRef.current);
    }
    setIsDragging(false);
    setDragItem(null);
    setDropTargetIndex(null);
  };

  const onDropSection = (item: DragItem, targetIndex: number) => {
    onDrop(item, targetIndex);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = () => {
      endDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <DndContext.Provider
      value={{
        isDragging,
        dragItem,
        dragPos,
        dropTargetIndex,
        startDrag,
        updateDropTarget,
        endDrag,
        onDropSection,
      }}
    >
      {children}
    </DndContext.Provider>
  );
}
