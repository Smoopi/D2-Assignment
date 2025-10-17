import "./style.css";

document.body.innerHTML = "";

const app = document.createElement("div");
app.id = "app";

const title = document.createElement("h1");
title.textContent = "D2 - Assignment (Step 4)";

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
app.appendChild(title);
app.appendChild(controls);
app.appendChild(canvas);
document.body.appendChild(app);

type Point = { x: number; y: number };
type Stroke = Point[];
type Drawing = Stroke[];

const DRAWING_CHANGED = "drawing-changed" as const;

const drawing: Drawing = [];
const redoStack: Drawing = [];

const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Canvas 2D context not available.");

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";
ctx.fillStyle = "#222";

let isDrawing = false;

function getCanvasPos(evt: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

function dispatchChange() {
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of drawing) {
    if (stroke.length === 0) continue;

    if (stroke.length === 1) {
      const p = stroke[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }

  undoBtn.disabled = drawing.length === 0 || isDrawing;
  redoBtn.disabled = redoStack.length === 0;
  clearBtn.disabled = drawing.length === 0 && redoStack.length === 0;
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;
  const p = getCanvasPos(e);

  drawing.push([p]);
  redoStack.length = 0;

  dispatchChange();
}

function onMouseMove(e: MouseEvent) {
  if (!isDrawing) return;
  const p = getCanvasPos(e);
  const currentStroke = drawing[drawing.length - 1];
  currentStroke.push(p);
  dispatchChange();
}

function onMouseUpOrLeave() {
  if (!isDrawing) return;
  isDrawing = false;
  dispatchChange();
}

function undo() {
  if (isDrawing) return;
  if (drawing.length === 0) return;

  const last = drawing.pop()!;
  redoStack.push(last);
  dispatchChange();
}

function redo() {
  if (redoStack.length === 0) return;

  const stroke = redoStack.pop()!;
  drawing.push(stroke);
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
