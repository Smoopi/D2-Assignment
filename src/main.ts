import "./style.css";

document.body.innerHTML = "";

const app = document.createElement("div");
app.id = "app";

const title = document.createElement("h1");
title.textContent = "D2 - Assignment";

const controls = document.createElement("div");
controls.className = "controls";

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

controls.append(undoBtn, redoBtn, clearBtn);
app.append(title, controls, canvas);
document.body.appendChild(app);

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

interface DraggableCommand extends DisplayCommand {
  drag(x: number, y: number): void;
}

class MarkerLine implements DraggableCommand {
  private points: { x: number; y: number }[] = [];

  constructor(x: number, y: number) {
    this.points.push({ x, y });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;

    if (this.points.length === 1) {
      const p = this.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

const DRAWING_CHANGED = "drawing-changed" as const;
const drawing: DisplayCommand[] = [];
const redoStack: DisplayCommand[] = [];

const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Canvas 2D context not available.");

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";
ctx.fillStyle = "#222";

let isDrawing = false;

function getCanvasPos(evt: MouseEvent) {
  const r = canvas.getBoundingClientRect();
  return { x: evt.clientX - r.left, y: evt.clientY - r.top };
}

function dispatchChange() {
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const cmd of drawing) {
    cmd.display(ctx);
  }

  undoBtn.disabled = drawing.length === 0 || isDrawing;
  redoBtn.disabled = redoStack.length === 0;
  clearBtn.disabled = drawing.length === 0 && redoStack.length === 0;
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;
  const { x, y } = getCanvasPos(e);

  redoStack.length = 0;
  drawing.push(new MarkerLine(x, y));

  dispatchChange();
}

function onMouseMove(e: MouseEvent) {
  if (!isDrawing) return;
  const { x, y } = getCanvasPos(e);

  const current = drawing[drawing.length - 1] as DraggableCommand | undefined;
  current?.drag(x, y);

  dispatchChange();
}

function onMouseUpOrLeave() {
  if (!isDrawing) return;
  isDrawing = false;
  dispatchChange();
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
canvas.addEventListener("mouseleave", onMouseUpOrLeave);

canvas.addEventListener(DRAWING_CHANGED, redraw);

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearBtn.addEventListener("click", clearAll);

dispatchChange();
