import "./style.css";

document.body.innerHTML = "";

const app = document.createElement("div");
app.id = "app";

const title = document.createElement("h1");
title.textContent = "D2 - Assignment";

const toolbar = document.createElement("div");
toolbar.className = "controls";

const thinBtn = document.createElement("button");
thinBtn.id = "tool-thin";
thinBtn.type = "button";
thinBtn.textContent = "Thin";

const thickBtn = document.createElement("button");
thickBtn.id = "tool-thick";
thickBtn.type = "button";
thickBtn.textContent = "Thick";

const undoBtn = document.createElement("button");
undoBtn.id = "undo-btn";
undoBtn.type = "button";
undoBtn.textContent = "Undo";

const redoBtn = document.createElement("button");
redoBtn.id = "redo-btn";
redoBtn.type = "button";
redoBtn.textContent = "Redo";

const clearBtn = document.createElement("button");
clearBtn.id = "clear-btn";
clearBtn.type = "button";
clearBtn.textContent = "Clear";

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.className = "workpad";

toolbar.append(thinBtn, thickBtn, undoBtn, redoBtn, clearBtn);
app.append(title, toolbar, canvas);
document.body.appendChild(app);

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}
interface DraggableCommand extends DisplayCommand {
  drag(x: number, y: number): void;
}

interface PreviewRenderable {
  draw(ctx: CanvasRenderingContext2D): void;
}

class MarkerLine implements DraggableCommand {
  private points: { x: number; y: number }[] = [];
  constructor(
    x: number,
    y: number,
    private thickness: number,
    private color: string = "#222",
  ) {
    this.points.push({ x, y });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;

    ctx.save();
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (this.points.length === 1) {
      const p = this.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.thickness / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

class MarkerPreview implements PreviewRenderable {
  private x = 0;
  private y = 0;
  private thickness = 2;
  private visible = false;

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  setThickness(th: number) {
    this.thickness = th;
  }
  setVisible(v: boolean) {
    this.visible = v;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#555";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

const DRAWING_CHANGED = "drawing-changed" as const;
const TOOL_MOVED = "tool-moved" as const;

const drawing: DisplayCommand[] = [];
const redoStack: DisplayCommand[] = [];

const preview = new MarkerPreview();

const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Canvas 2D context not available.");

type ToolName = "thin" | "thick";
const TOOL_STYLES: Record<ToolName, number> = { thin: 2, thick: 6 };
let activeTool: ToolName = "thin";

function updateToolSelectionUI() {
  thinBtn.classList.toggle("selectedTool", activeTool === "thin");
  thickBtn.classList.toggle("selectedTool", activeTool === "thick");
  preview.setThickness(TOOL_STYLES[activeTool]);
}
updateToolSelectionUI();

thinBtn.addEventListener("click", () => {
  activeTool = "thin";
  updateToolSelectionUI();
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});
thickBtn.addEventListener("click", () => {
  activeTool = "thick";
  updateToolSelectionUI();
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});

let isDrawing = false;
let isPointerInCanvas = false;

function getCanvasPos(evt: MouseEvent) {
  const r = canvas.getBoundingClientRect();
  return { x: evt.clientX - r.left, y: evt.clientY - r.top };
}

function dispatchChange() {
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const cmd of drawing) cmd.display(ctx);

  preview.draw(ctx);

  undoBtn.disabled = drawing.length === 0 || isDrawing;
  redoBtn.disabled = redoStack.length === 0;
  clearBtn.disabled = drawing.length === 0 && redoStack.length === 0;
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;
  preview.setVisible(false);

  const { x, y } = getCanvasPos(e);
  redoStack.length = 0;

  const thickness = TOOL_STYLES[activeTool];
  drawing.push(new MarkerLine(x, y, thickness));

  dispatchChange();
}

function onMouseMove(e: MouseEvent) {
  const { x, y } = getCanvasPos(e);

  if (isDrawing) {
    const current = drawing[drawing.length - 1] as DraggableCommand | undefined;
    current?.drag(x, y);
    dispatchChange();
  } else {
    if (isPointerInCanvas) {
      preview.setThickness(TOOL_STYLES[activeTool]);
      preview.setPosition(x, y);
      preview.setVisible(true);
      canvas.dispatchEvent(new Event(TOOL_MOVED));
    }
  }
}

function onMouseUpOrLeave() {
  if (isDrawing) {
    isDrawing = false;
    preview.setVisible(isPointerInCanvas);
    dispatchChange();
  }
}

function onMouseEnter() {
  isPointerInCanvas = true;
  if (!isDrawing) {
    preview.setThickness(TOOL_STYLES[activeTool]);
    preview.setVisible(true);
    canvas.dispatchEvent(new Event(TOOL_MOVED));
  }
}

function onMouseLeave() {
  isPointerInCanvas = false;
  preview.setVisible(false);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
}

function undo() {
  if (isDrawing || drawing.length === 0) return;
  const last = drawing.pop()!;
  redoStack.push(last);
  dispatchChange();
}
function redo() {
  if (redoStack.length === 0) return;
  drawing.push(redoStack.pop()!);
  dispatchChange();
}
function clearAll() {
  if (drawing.length === 0 && redoStack.length === 0) return;
  drawing.length = 0;
  redoStack.length = 0;
  dispatchChange();
}

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", onMouseUpOrLeave);
canvas.addEventListener("mouseenter", onMouseEnter);
canvas.addEventListener("mouseleave", onMouseLeave);

canvas.addEventListener(DRAWING_CHANGED, redraw);
canvas.addEventListener(TOOL_MOVED, redraw);

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearBtn.addEventListener("click", clearAll);

preview.setVisible(false);
dispatchChange();
