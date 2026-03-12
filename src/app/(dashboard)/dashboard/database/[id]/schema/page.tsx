"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { GitBranch, Table2, Key, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface ErColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

interface ErTable {
  name: string;
  columns: ErColumn[];
}

interface ErForeignKey {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface ErDiagram {
  tables: ErTable[];
  foreignKeys: ErForeignKey[];
}

interface TableCard {
  table: ErTable;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 220;
const CARD_HEADER = 36;
const ROW_HEIGHT = 28;
const MAX_ROWS = 15;
const COL_GAP = 260;
const ROW_GAP = 24;
const NUM_COLS = 3;

function layoutCards(tables: ErTable[]): TableCard[] {
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const colHeights = [0, 0, 0];
  const cards: TableCard[] = [];

  for (const table of sorted) {
    const visibleRows = Math.min(table.columns.length, MAX_ROWS);
    const cardHeight = CARD_HEADER + visibleRows * ROW_HEIGHT + 8;

    const shortestCol = colHeights.indexOf(Math.min(...colHeights));
    cards.push({
      table,
      x: shortestCol * COL_GAP,
      y: colHeights[shortestCol],
      width: CARD_WIDTH,
      height: cardHeight,
    });
    colHeights[shortestCol] += cardHeight + ROW_GAP;
  }

  return cards;
}

function getEdgePoints(
  from: TableCard,
  to: TableCard,
  fromCol: string,
  toCol: string
): { x1: number; y1: number; x2: number; y2: number } {
  const fromColIdx = from.table.columns.findIndex((c) => c.name === fromCol);
  const toColIdx = to.table.columns.findIndex((c) => c.name === toCol);

  const fromRowY =
    from.y +
    CARD_HEADER +
    Math.min(fromColIdx, MAX_ROWS - 1) * ROW_HEIGHT +
    ROW_HEIGHT / 2;
  const toRowY =
    to.y +
    CARD_HEADER +
    Math.min(toColIdx, MAX_ROWS - 1) * ROW_HEIGHT +
    ROW_HEIGHT / 2;

  // Connect from right edge of from-card to left edge of to-card
  const fromRight = from.x + CARD_WIDTH;
  const toLeft = to.x;

  if (fromRight <= toLeft) {
    return { x1: fromRight, y1: fromRowY, x2: toLeft, y2: toRowY };
  }
  // Fallback: connect bottom of from to top of to
  return {
    x1: from.x + CARD_WIDTH / 2,
    y1: from.y + from.height,
    x2: to.x + CARD_WIDTH / 2,
    y2: to.y,
  };
}

export default function SchemaPage() {
  const params = useParams<{ id: string }>();
  const [diagram, setDiagram] = useState<ErDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const dragging = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  useEffect(() => {
    fetch(`/api/databases/${params.id}/schema`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDiagram(d.data);
        else setError(d.error);
      })
      .catch(() => setError("Failed to load schema"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => ({
      ...t,
      scale: Math.min(2, Math.max(0.3, t.scale - e.deltaY * 0.001)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = { startX: e.clientX, startY: e.clientY, startTx: transform.tx, startTy: transform.ty };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setTransform((t) => ({ ...t, tx: dragging.current!.startTx + dx, ty: dragging.current!.startTy + dy }));
  };

  const handleMouseUp = () => { dragging.current = null; };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-[#555]">Loading schema…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!diagram || diagram.tables.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No tables yet"
        description="Create tables in the SQL Editor or Tables section to see your schema diagram."
      />
    );
  }

  const cards = layoutCards(diagram.tables);
  const cardMap = new Map(cards.map((c) => [c.table.name, c]));

  const totalW = NUM_COLS * COL_GAP + CARD_WIDTH + 40;
  const maxHeight = Math.max(...cards.map((c) => c.y + c.height)) + 40;

  return (
    <div
      className="flex-1 overflow-hidden relative bg-[#0e0e0e] cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute top-0 left-0"
        style={{ transform: `translate(${transform.tx}px,${transform.ty}px) scale(${transform.scale})`, transformOrigin: "0 0" }}
      >
        {/* SVG for edges */}
        <svg
          width={totalW}
          height={maxHeight}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3ecf8e" fillOpacity={0.6} />
            </marker>
          </defs>
          {diagram.foreignKeys.map((fk, i) => {
            const from = cardMap.get(fk.fromTable);
            const to = cardMap.get(fk.toTable);
            if (!from || !to || from === to) return null;
            const { x1, y1, x2, y2 } = getEdgePoints(from, to, fk.fromColumn, fk.toColumn);
            const cx1 = x1 + 60;
            const cx2 = x2 - 60;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`}
                stroke="#3ecf8e"
                strokeOpacity={0.4}
                strokeWidth={1.5}
                fill="none"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {/* Table cards */}
        {cards.map((card) => {
          const visibleCols = card.table.columns.slice(0, MAX_ROWS);
          const overflow = card.table.columns.length - MAX_ROWS;
          return (
            <div
              key={card.table.name}
              className="absolute bg-[#141414] border border-[#2e2e2e] rounded-md overflow-hidden"
              style={{ left: card.x + 20, top: card.y + 20, width: card.width, zIndex: 1 }}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
                <Table2 size={12} className="text-brand" />
                <span className="text-xs font-medium text-[#ededed] truncate">{card.table.name}</span>
              </div>
              {/* Columns */}
              {visibleCols.map((col) => (
                <div key={col.name} className="flex items-center gap-1.5 px-3" style={{ height: ROW_HEIGHT }}>
                  {col.isPrimaryKey ? (
                    <Key size={10} className="text-brand shrink-0" />
                  ) : (
                    <ArrowRight size={10} className="text-[#444] shrink-0" />
                  )}
                  <span className={`text-[11px] truncate ${col.isPrimaryKey ? "text-brand" : "text-[#888]"}`}>
                    {col.name}
                  </span>
                  <span className="ml-auto text-[10px] text-[#444] shrink-0">{col.dataType}</span>
                </div>
              ))}
              {overflow > 0 && (
                <div className="px-3 py-1 text-[10px] text-[#555]">+{overflow} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-4 text-[10px] text-[#333] pointer-events-none">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
