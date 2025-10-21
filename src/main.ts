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

const stickerRow = document.createElement("div");
stickerRow.className = "controls";

function makeStickerButton(id: string, emoji: string) {
  const b = document.createElement("button");
  b.id = id;
  b.type = "button";
  b.textContent = emoji;
  b.className = "stickerBtn";
  return b;
}
const smileBtn = makeStickerButton("sticker-smile", "🙂");
const rocketBtn = makeStickerButton("sticker-rocket", "🚀");
const starBtn = makeStickerButton("sticker-star", "⭐");

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
stickerRow.append(smileBtn, rocketBtn, starBtn);
app.append(title, toolbar, stickerRow, canvas);
document.body.appendChild(app);

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}
interface DraggableCommand extends DisplayCommand {
  drag(x: number, y: number): void;
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

class StickerCommand implements DraggableCommand {
  constructor(
    private emoji: string,
    private x: number,
    private y: number,
    private fontSize: number = 24,
  ) {}

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font =
      `${this.fontSize}px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

interface PreviewRenderable {
  draw(ctx: CanvasRenderingContext2D): void;
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
  setThickness(t: number) {
    this.thickness = t;
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

class StickerPreview implements PreviewRenderable {
  private x = 0;
  private y = 0;
  private emoji = "🙂";
  private fontSize = 24;
  private visible = false;

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  setEmoji(e: string) {
    this.emoji = e;
  }
  setFontSize(px: number) {
    this.fontSize = px;
  }
  setVisible(v: boolean) {
    this.visible = v;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font =
      `${this.fontSize}px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

const DRAWING_CHANGED = "drawing-changed" as const;
const TOOL_MOVED = "tool-moved" as const;

const drawing: DisplayCommand[] = [];
const redoStack: DisplayCommand[] = [];

const markerPreview = new MarkerPreview();
const stickerPreview = new StickerPreview();
let currentPreview: PreviewRenderable = markerPreview;

const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Canvas 2D context not available.");

type ToolState =
  | { kind: "marker"; thickness: number }
  | { kind: "sticker"; emoji: string; fontSize: number };

const TOOL_STYLES = {
  markerThin: 2,
  markerThick: 6,
  stickerFontSize: 28,
};

let activeTool: ToolState = {
  kind: "marker",
  thickness: TOOL_STYLES.markerThin,
};

function setActiveMarker(thickness: number) {
  activeTool = { kind: "marker", thickness };
  currentPreview = markerPreview;
  markerPreview.setThickness(thickness);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
  updateToolSelectionUI();
}

function setActiveSticker(
  emoji: string,
  fontSize = TOOL_STYLES.stickerFontSize,
) {
  activeTool = { kind: "sticker", emoji, fontSize };
  currentPreview = stickerPreview;
  stickerPreview.setEmoji(emoji);
  stickerPreview.setFontSize(fontSize);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
  updateToolSelectionUI();
}

setActiveMarker(TOOL_STYLES.markerThin);

function updateToolSelectionUI() {
  thinBtn.classList.toggle(
    "selectedTool",
    activeTool.kind === "marker" &&
      activeTool.thickness === TOOL_STYLES.markerThin,
  );
  thickBtn.classList.toggle(
    "selectedTool",
    activeTool.kind === "marker" &&
      activeTool.thickness === TOOL_STYLES.markerThick,
  );

  if (activeTool.kind === "sticker") {
    const stickerEmoji = activeTool.emoji;
    for (const btn of [smileBtn, rocketBtn, starBtn]) {
      btn.classList.toggle(
        "selectedTool",
        (btn.textContent ?? "") === stickerEmoji,
      );
    }
  } else {
    for (const btn of [smileBtn, rocketBtn, starBtn]) {
      btn.classList.remove("selectedTool");
    }
  }
}

thinBtn.addEventListener(
  "click",
  () => setActiveMarker(TOOL_STYLES.markerThin),
);
thickBtn.addEventListener(
  "click",
  () => setActiveMarker(TOOL_STYLES.markerThick),
);
smileBtn.addEventListener("click", () => setActiveSticker("🙂"));
rocketBtn.addEventListener("click", () => setActiveSticker("🚀"));
starBtn.addEventListener("click", () => setActiveSticker("⭐"));

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

  if (!isDrawing) currentPreview.draw(ctx);

  undoBtn.disabled = drawing.length === 0 || isDrawing;
  redoBtn.disabled = redoStack.length === 0;
  clearBtn.disabled = drawing.length === 0 && redoStack.length === 0;
}

function onMouseDown(e: MouseEvent) {
  isDrawing = true;

  const { x, y } = getCanvasPos(e);
  redoStack.length = 0;

  if (activeTool.kind === "marker") {
    drawing.push(new MarkerLine(x, y, activeTool.thickness));
  } else {
    drawing.push(
      new StickerCommand(activeTool.emoji, x, y, activeTool.fontSize),
    );
  }

  if (currentPreview === markerPreview) markerPreview.setVisible(false);
  if (currentPreview === stickerPreview) stickerPreview.setVisible(false);

  dispatchChange();
}

function onMouseMove(e: MouseEvent) {
  const { x, y } = getCanvasPos(e);

  if (isDrawing) {
    const current = drawing[drawing.length - 1] as DraggableCommand | undefined;
    current?.drag(x, y);
    dispatchChange();
  } else if (isPointerInCanvas) {
    if (activeTool.kind === "marker") {
      markerPreview.setPosition(x, y);
      markerPreview.setThickness(activeTool.thickness);
      markerPreview.setVisible(true);
    } else {
      stickerPreview.setPosition(x, y);
      stickerPreview.setEmoji(activeTool.emoji);
      stickerPreview.setFontSize(activeTool.fontSize);
      stickerPreview.setVisible(true);
    }
    canvas.dispatchEvent(new Event(TOOL_MOVED));
  }
}

function onMouseUpOrLeave() {
  if (isDrawing) {
    isDrawing = false;
    if (isPointerInCanvas) {
      if (activeTool.kind === "marker") markerPreview.setVisible(true);
      else stickerPreview.setVisible(true);
      canvas.dispatchEvent(new Event(TOOL_MOVED));
    } else {
      if (activeTool.kind === "marker") markerPreview.setVisible(false);
      else stickerPreview.setVisible(false);
      canvas.dispatchEvent(new Event(TOOL_MOVED));
    }
    dispatchChange();
  }
}

function onMouseEnter() {
  isPointerInCanvas = true;
  if (!isDrawing) {
    if (activeTool.kind === "marker") {
      markerPreview.setThickness(activeTool.thickness);
      markerPreview.setVisible(true);
    } else {
      stickerPreview.setEmoji(activeTool.emoji);
      stickerPreview.setFontSize(activeTool.fontSize);
      stickerPreview.setVisible(true);
    }
    canvas.dispatchEvent(new Event(TOOL_MOVED));
  }
}

function onMouseLeave() {
  isPointerInCanvas = false;
  markerPreview.setVisible(false);
  stickerPreview.setVisible(false);
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

dispatchChange();
