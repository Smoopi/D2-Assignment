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

const ctx = canvas.getContext("2d")!;
if (!ctx) {
  throw new Error("Canvas 2D context not available.");
}

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";
ctx.fillStyle = "#222";

let isDrawing = false;

function getCanvasPos(evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  return { x, y };
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;
  const { x, y } = getCanvasPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function onMouseMove(e: MouseEvent) {
  if (!isDrawing) return;
  const { x, y } = getCanvasPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.closePath();
}

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", endStroke);
canvas.addEventListener("mouseleave", endStroke);

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
