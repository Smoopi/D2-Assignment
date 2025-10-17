import "./style.css";

document.body.innerHTML = "";

const app = document.createElement("div");
app.id = "app";

const title = document.createElement("h1");
title.textContent = "D2 - Assignment";

const controls = document.createElement("div");
controls.className = "controls";

const clearBtn = document.createElement("button");
clearBtn.id = "clear-btn";
clearBtn.type = "button";
clearBtn.textContent = "Clear";

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.className = "workpad";

controls.appendChild(clearBtn);
app.appendChild(title);
app.appendChild(controls);
app.appendChild(canvas);
document.body.appendChild(app);

type Point = { x: number; y: number };
type Stroke = Point[];
type Drawing = Stroke[];

const DRAWING_CHANGED = "drawing-changed" as const;

const drawing: Drawing = [];

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
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  return { x, y };
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
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;
  const p = getCanvasPos(e);
  drawing.push([p]);
  dispatchChange();
}

function onMouseMove(e: MouseEvent) {
  if (!isDrawing) return;
  const p = getCanvasPos(e);
  const currentStroke = drawing[drawing.length - 1];
  currentStroke.push(p);
  dispatchChange();
}

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;
}

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", endStroke);
canvas.addEventListener("mouseleave", endStroke);

canvas.addEventListener(DRAWING_CHANGED, redraw);

clearBtn.addEventListener("click", () => {
  drawing.length = 0;
  dispatchChange();
});

dispatchChange();
