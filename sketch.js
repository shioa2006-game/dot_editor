// 定数: キャンバス設定
const CANVAS_PIXEL_SIZE = 12; // ピクセル数
const DISPLAY_SCALE = 30; // 編集キャンバスの拡大倍率
const PREVIEW_SCALE = 10; // プレビュー表示倍率
const GRID_LINE_COLOR = '#cccccc'; // グリッド線の色
const CHECKER_LIGHT = '#ffffff'; // チェッカーボード明色
const CHECKER_DARK = '#e0e0e0'; // チェッカーボード暗色

// 定数: DB32パレット定義
const PALETTE = [
  { index: 0, label: '透過', color: 'transparent' },
  { index: 1, label: '黒', color: '#000000' },
  { index: 2, label: '濃紺紫', color: '#222034' },
  { index: 3, label: '暗い紫', color: '#45283c' },
  { index: 4, label: '暗い茶色', color: '#663931' },
  { index: 5, label: '茶色', color: '#8f563b' },
  { index: 6, label: 'オレンジ茶', color: '#df7126' },
  { index: 7, label: 'ベージュ', color: '#d9a066' },
  { index: 8, label: '明るいベージュ', color: '#eec39a' },
  { index: 9, label: '鮮やかな黄', color: '#fbf236' },
  { index: 10, label: '黄緑', color: '#99e550' },
  { index: 11, label: '緑', color: '#6abe30' },
  { index: 12, label: '深緑', color: '#37946e' },
  { index: 13, label: '暗いオリーブ', color: '#4b692f' },
  { index: 14, label: 'オリーブ茶', color: '#524b24' },
  { index: 15, label: '暗い灰緑', color: '#323c39' },
  { index: 16, label: '暗い青紫', color: '#3f3f74' },
  { index: 17, label: '暗い青', color: '#306082' },
  { index: 18, label: '青', color: '#5b6ee1' },
  { index: 19, label: '明るい青', color: '#639bff' },
  { index: 20, label: 'シアン', color: '#5fcde4' },
  { index: 21, label: '淡い青', color: '#cbdbfc' },
  { index: 22, label: '白', color: '#ffffff' },
  { index: 23, label: '明るい灰色', color: '#9badb7' },
  { index: 24, label: '中間灰色', color: '#847e87' },
  { index: 25, label: '暗い灰色', color: '#696a6a' },
  { index: 26, label: '暗い茶灰色', color: '#595652' },
  { index: 27, label: '紫', color: '#76428a' },
  { index: 28, label: '暗い赤', color: '#ac3232' },
  { index: 29, label: '赤', color: '#d95763' },
  { index: 30, label: 'ピンク', color: '#d77bba' },
  { index: 31, label: '黄土色', color: '#8f974a' },
  { index: 32, label: '暗い金色', color: '#8a6f30' }
];

// 定数: パレットグループ
const PALETTE_GROUPS = [
  { name: '透過', colorIndexes: [0] },
  { name: 'モノクロ', colorIndexes: [1, 22, 23, 24, 25, 26] },
  { name: '茶・黄', colorIndexes: [4, 5, 6, 7, 8, 32] },
  { name: '緑', colorIndexes: [13, 14, 10, 11, 12] },
  { name: '青', colorIndexes: [15, 16, 17, 18, 19, 20, 21] },
  { name: '紫', colorIndexes: [2, 3, 27] },
  { name: '赤・ピンク', colorIndexes: [28, 29, 30] },
  { name: '黄', colorIndexes: [9, 31] }
];

// 状態管理変数
let showGrid = true;
let selectedColorIndex = 1;
let selectedTool = 'pen';
let canvasLayer;
let previewCanvas;
let previewContext;
let statusMessageElement;
let exportTextarea;
let importTextarea;
let exportFeedbackElement;
let importFeedbackElement;
let exportFormat = 'pretty';
let exportFeedbackTimer = null;
let importFeedbackTimer = null;
let pixelData = [];
let isPainting = false;
let lastPaintedPixel = null;

function setup() {
  // コメント: 編集キャンバスを生成
  const canvasSize = CANVAS_PIXEL_SIZE * DISPLAY_SCALE;
  canvasLayer = createCanvas(canvasSize, canvasSize);
  canvasLayer.parent('canvas-wrapper');
  pixelDensity(1);
  noSmooth();
  noLoop();

  // コメント: プレビューキャンバスを生成
  const previewSize = CANVAS_PIXEL_SIZE * PREVIEW_SCALE;
  const previewWrapper = document.getElementById('preview-wrapper');
  previewCanvas = document.createElement('canvas');
  previewCanvas.width = previewSize;
  previewCanvas.height = previewSize;
  previewCanvas.classList.add('preview-canvas');
  previewContext = previewCanvas.getContext('2d', { alpha: true });
  if (previewContext) {
    previewContext.imageSmoothingEnabled = false;
  }
  previewWrapper.appendChild(previewCanvas);

  canvasLayer.elt.addEventListener('contextmenu', handleCanvasContextMenu);

  initializePixelData();

  statusMessageElement = document.getElementById('status-message');
  updateStatusMessage();

  const gridToggleButton = document.getElementById('grid-toggle');
  gridToggleButton.addEventListener('click', () => {
    showGrid = !showGrid;
    gridToggleButton.textContent = `グリッド表示: ${showGrid ? 'ON' : 'OFF'}`;
    redraw();
  });

  createPaletteUI();
  setupToolButtons();
  setupToolActions();
  setupDataIO();

  updateExportTextarea();
  redraw();
}

function draw() {
  drawMainCheckerboard();
  drawCanvasPixels();

  if (showGrid) {
    drawGridLines();
  }

  drawPreviewCheckerboard();
  drawPreviewPixels();
}

function drawMainCheckerboard() {
  noStroke();
  const tileSize = DISPLAY_SCALE;

  for (let y = 0; y < CANVAS_PIXEL_SIZE; y += 1) {
    for (let x = 0; x < CANVAS_PIXEL_SIZE; x += 1) {
      const useDark = (x + y) % 2 === 0;
      fill(useDark ? CHECKER_DARK : CHECKER_LIGHT);
      rect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawPreviewCheckerboard() {
  if (!previewContext) {
    return;
  }

  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const tileSize = PREVIEW_SCALE;

  for (let y = 0; y < CANVAS_PIXEL_SIZE; y += 1) {
    for (let x = 0; x < CANVAS_PIXEL_SIZE; x += 1) {
      const useDark = (x + y) % 2 === 0;
      previewContext.fillStyle = useDark ? CHECKER_DARK : CHECKER_LIGHT;
      previewContext.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawGridLines() {
  stroke(GRID_LINE_COLOR);
  strokeWeight(1);

  const canvasSize = CANVAS_PIXEL_SIZE * DISPLAY_SCALE;
  for (let i = 0; i <= CANVAS_PIXEL_SIZE; i += 1) {
    const position = i * DISPLAY_SCALE + 0.5;
    line(position, 0, position, canvasSize);
    line(0, position, canvasSize, position);
  }
}

function drawCanvasPixels() {
  noStroke();
  const tileSize = DISPLAY_SCALE;

  for (let y = 0; y < CANVAS_PIXEL_SIZE; y += 1) {
    for (let x = 0; x < CANVAS_PIXEL_SIZE; x += 1) {
      const colorHex = getColorHex(pixelData[y][x]);
      if (!colorHex) {
        continue;
      }
      fill(colorHex);
      rect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawPreviewPixels() {
  if (!previewContext) {
    return;
  }

  const tileSize = PREVIEW_SCALE;

  for (let y = 0; y < CANVAS_PIXEL_SIZE; y += 1) {
    for (let x = 0; x < CANVAS_PIXEL_SIZE; x += 1) {
      const colorHex = getColorHex(pixelData[y][x]);
      if (!colorHex) {
        continue;
      }
      previewContext.fillStyle = colorHex;
      previewContext.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function createPaletteUI() {
  const paletteWrapper = document.getElementById('palette-wrapper');
  if (!paletteWrapper) {
    return;
  }

  paletteWrapper.innerHTML = '';

  PALETTE_GROUPS.forEach((group) => {
    const groupElement = document.createElement('div');
    groupElement.className = 'palette-group';

    const titleElement = document.createElement('h3');
    titleElement.className = 'palette-group-title';
    titleElement.textContent = group.name;
    groupElement.appendChild(titleElement);

    const swatchList = document.createElement('div');
    swatchList.className = 'palette-swatch-list';

    group.colorIndexes.forEach((index) => {
      const colorInfo = PALETTE[index];
      const swatchButton = document.createElement('button');
      swatchButton.type = 'button';
      swatchButton.className = 'palette-swatch';
      swatchButton.dataset.index = String(colorInfo.index);
      swatchButton.title = `No.${colorInfo.index} ${colorInfo.label}`;

      if (colorInfo.color === 'transparent') {
        swatchButton.classList.add('palette-swatch-transparent');
      } else {
        swatchButton.style.setProperty('--swatch-color', colorInfo.color);
      }

      if (index === selectedColorIndex) {
        swatchButton.classList.add('is-active');
      }

      swatchButton.addEventListener('click', () => {
        setSelectedColor(colorInfo.index);
      });

      swatchList.appendChild(swatchButton);
    });

    groupElement.appendChild(swatchList);
    paletteWrapper.appendChild(groupElement);
  });
}

function setupToolButtons() {
  const toolButtons = document.querySelectorAll('.tool-button');
  toolButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      if (tool) {
        setSelectedTool(tool);
      }
    });
  });
  updateToolButtonState();
}

function setupToolActions() {
  const resetButton = document.getElementById('tool-reset');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetCanvas();
    });
  }
}

function setupDataIO() {
  exportTextarea = document.getElementById('export-textarea');
  importTextarea = document.getElementById('import-textarea');
  exportFeedbackElement = document.getElementById('export-feedback');
  importFeedbackElement = document.getElementById('import-feedback');

  const formatRadios = document.querySelectorAll("input[name='export-format']");
  formatRadios.forEach((radio) => {
    if (radio.checked) {
      exportFormat = radio.value === 'compact' ? 'compact' : 'pretty';
    }
    radio.addEventListener('change', () => {
      exportFormat = radio.value === 'compact' ? 'compact' : 'pretty';
      updateExportTextarea(true);
    });
  });

  const exportRefreshButton = document.getElementById('export-refresh');
  if (exportRefreshButton) {
    exportRefreshButton.addEventListener('click', () => {
      updateExportTextarea(true);
    });
  }

  const exportCopyButton = document.getElementById('export-copy');
  if (exportCopyButton) {
    exportCopyButton.addEventListener('click', handleExportCopy);
  }

  const importApplyButton = document.getElementById('import-apply');
  if (importApplyButton) {
    importApplyButton.addEventListener('click', handleImportApply);
  }

  const importClearButton = document.getElementById('import-clear');
  if (importClearButton) {
    importClearButton.addEventListener('click', handleImportClear);
  }
}

function setSelectedColor(index) {
  if (selectedColorIndex === index) {
    return;
  }
  selectedColorIndex = index;
  updatePaletteActiveState();
  updateStatusMessage();
}

function setSelectedTool(tool) {
  if (selectedTool === tool) {
    return;
  }
  selectedTool = tool;
  updateToolButtonState();
  updateStatusMessage();
}

function updatePaletteActiveState() {
  const paletteWrapper = document.getElementById('palette-wrapper');
  if (!paletteWrapper) {
    return;
  }

  const swatches = paletteWrapper.querySelectorAll('.palette-swatch');
  swatches.forEach((swatch) => {
    const swatchIndex = Number(swatch.dataset.index);
    if (swatchIndex === selectedColorIndex) {
      swatch.classList.add('is-active');
    } else {
      swatch.classList.remove('is-active');
    }
  });
}

function updateToolButtonState() {
  const toolButtons = document.querySelectorAll('.tool-button');
  toolButtons.forEach((button) => {
    const tool = button.dataset.tool;
    if (tool === selectedTool) {
      button.classList.add('is-active');
    } else {
      button.classList.remove('is-active');
    }
  });
}

function updateStatusMessage() {
  if (!statusMessageElement) {
    return;
  }

  const selectedColor = PALETTE[selectedColorIndex];
  const colorText =
    selectedColor.color === 'transparent'
      ? '透過'
      : selectedColor.color.toUpperCase();

  let message = `選択中の色: No.${selectedColor.index} (${colorText})`;
  message += ` / 現在のツール: ${getToolLabel(selectedTool)}`;

  if (lastPaintedPixel) {
    message += ` / 最終操作: (${lastPaintedPixel.x}, ${lastPaintedPixel.y})`;
  }

  statusMessageElement.textContent = message;
}

function getToolLabel(tool) {
  switch (tool) {
    case 'pen':
      return 'ペン';
    case 'eraser':
      return '消しゴム';
    case 'picker':
      return 'スポイト';
    case 'fill':
      return '塗りつぶし';
    default:
      return tool;
  }
}

function updateExportTextarea(showMessage = false) {
  if (!exportTextarea) {
    return;
  }

  const exportText =
    exportFormat === 'compact'
      ? JSON.stringify(pixelData)
      : formatPixelDataPretty(pixelData);

  exportTextarea.value = exportText;

  if (showMessage) {
    showExportFeedback('出力データを更新しました。');
  }
}

async function handleExportCopy() {
  if (!exportTextarea) {
    return;
  }

  try {
    await navigator.clipboard.writeText(exportTextarea.value);
    showExportFeedback('コピーしました。');
  } catch (error) {
    showExportFeedback('コピーに失敗しました。', true);
  }
}

function handleImportApply() {
  if (!importTextarea) {
    return;
  }

  const rawText = importTextarea.value.trim();
  if (rawText.length === 0) {
    showImportFeedback('読み込みデータが空です。', true);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    showImportFeedback('JSONの解析に失敗しました。形式を確認してください。', true);
    return;
  }

  const validation = validateImportedData(parsed);
  if (validation.error) {
    showImportFeedback(validation.error, true);
    return;
  }

  pixelData = validation.data;
  lastPaintedPixel = null;
  updateStatusMessage();
  updateExportTextarea();
  redraw();
  showImportFeedback('読み込みが完了しました。');
}

function handleImportClear() {
  if (!importTextarea) {
    return;
  }
  importTextarea.value = '';
  showImportFeedback('入力欄をクリアしました。');
}

function validateImportedData(raw) {
  if (!Array.isArray(raw)) {
    return { error: '配列形式のデータではありません。' };
  }
  if (raw.length !== CANVAS_PIXEL_SIZE) {
    return { error: `行数が${CANVAS_PIXEL_SIZE}ではありません。` };
  }

  const normalized = [];

  for (let y = 0; y < CANVAS_PIXEL_SIZE; y += 1) {
    const row = raw[y];
    if (!Array.isArray(row)) {
      return { error: `${y + 1}行目が配列ではありません。` };
    }
    if (row.length !== CANVAS_PIXEL_SIZE) {
      return { error: `${y + 1}行目の要素数が${CANVAS_PIXEL_SIZE}ではありません。` };
    }
    const normalizedRow = [];
    for (let x = 0; x < CANVAS_PIXEL_SIZE; x += 1) {
      const value = Number(row[x]);
      if (!Number.isInteger(value) || value < 0 || value >= PALETTE.length) {
        return { error: `${y + 1}行${x + 1}列の値が0-32の整数ではありません。` };
      }
      normalizedRow.push(value);
    }
    normalized.push(normalizedRow);
  }

  return { data: normalized };
}

function showExportFeedback(message, isError = false) {
  if (!exportFeedbackElement) {
    return;
  }

  if (exportFeedbackTimer) {
    clearTimeout(exportFeedbackTimer);
    exportFeedbackTimer = null;
  }

  exportFeedbackElement.textContent = message;
  exportFeedbackElement.classList.toggle('is-error', Boolean(isError));

  if (message) {
    exportFeedbackTimer = window.setTimeout(() => {
      if (exportFeedbackElement) {
        exportFeedbackElement.textContent = '';
        exportFeedbackElement.classList.remove('is-error');
      }
      exportFeedbackTimer = null;
    }, 2000);
  }
}

function showImportFeedback(message, isError = false) {
  if (!importFeedbackElement) {
    return;
  }

  if (importFeedbackTimer) {
    clearTimeout(importFeedbackTimer);
    importFeedbackTimer = null;
  }

  importFeedbackElement.textContent = message;
  importFeedbackElement.classList.toggle('is-error', Boolean(isError));

  if (message) {
    importFeedbackTimer = window.setTimeout(() => {
      if (importFeedbackElement) {
        importFeedbackElement.textContent = '';
        importFeedbackElement.classList.remove('is-error');
      }
      importFeedbackTimer = null;
    }, 2000);
  }
}

function formatPixelDataPretty(data) {
  const formattedRows = data.map((row) => {
    const values = row
      .map((value) => value.toString().padStart(2, ' '))
      .join(', ');
    return `  [ ${values} ]`;
  });
  return `[\n${formattedRows.join(',\n')}\n]`;
}

function initializePixelData() {
  pixelData = Array.from({ length: CANVAS_PIXEL_SIZE }, () =>
    Array.from({ length: CANVAS_PIXEL_SIZE }, () => 0)
  );
  lastPaintedPixel = null;
}

function getColorHex(index) {
  const colorInfo = PALETTE[index];
  if (!colorInfo || colorInfo.color === 'transparent') {
    return null;
  }
  return colorInfo.color;
}

function mousePressed() {
  if (mouseButton === RIGHT) {
    if (isMouseWithinCanvas(mouseX, mouseY)) {
      applyPickerAt(mouseX, mouseY);
    }
    return false;
  }

  if (!isMouseWithinCanvas(mouseX, mouseY)) {
    return;
  }

  if (selectedTool === 'fill') {
    applyFillAt(mouseX, mouseY);
    return false;
  }

  if (selectedTool === 'picker') {
    applyPickerAt(mouseX, mouseY);
    return false;
  }

  isPainting = selectedTool === 'pen' || selectedTool === 'eraser';
  paintAt(mouseX, mouseY);
}

function mouseDragged() {
  if (!isPainting) {
    return;
  }
  if (isMouseWithinCanvas(mouseX, mouseY)) {
    paintAt(mouseX, mouseY);
  }
}

function mouseReleased() {
  isPainting = false;
}

function paintAt(positionX, positionY) {
  const pixelX = Math.floor(positionX / DISPLAY_SCALE);
  const pixelY = Math.floor(positionY / DISPLAY_SCALE);

  if (!isValidPixel(pixelX, pixelY)) {
    return;
  }

  const nextIndex = selectedTool === 'eraser' ? 0 : selectedColorIndex;
  if (pixelData[pixelY][pixelX] === nextIndex) {
    return;
  }

  pixelData[pixelY][pixelX] = nextIndex;
  lastPaintedPixel = { x: pixelX, y: pixelY };
  updateStatusMessage();
  updateExportTextarea();
  redraw();
}

function applyPickerAt(positionX, positionY) {
  const pixelX = Math.floor(positionX / DISPLAY_SCALE);
  const pixelY = Math.floor(positionY / DISPLAY_SCALE);

  if (!isValidPixel(pixelX, pixelY)) {
    return;
  }

  const currentIndex = pixelData[pixelY][pixelX];
  lastPaintedPixel = { x: pixelX, y: pixelY };
  setSelectedColor(currentIndex);
}

function applyFillAt(positionX, positionY) {
  const pixelX = Math.floor(positionX / DISPLAY_SCALE);
  const pixelY = Math.floor(positionY / DISPLAY_SCALE);

  if (!isValidPixel(pixelX, pixelY)) {
    return;
  }

  const targetIndex = pixelData[pixelY][pixelX];
  const replacementIndex = selectedColorIndex;

  if (targetIndex === replacementIndex) {
    return;
  }

  floodFill(pixelX, pixelY, targetIndex, replacementIndex);
  lastPaintedPixel = { x: pixelX, y: pixelY };
  updateStatusMessage();
  updateExportTextarea();
  redraw();
}

function floodFill(startX, startY, targetIndex, replacementIndex) {
  const queue = [{ x: startX, y: startY }];
  pixelData[startY][startX] = replacementIndex;

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ];

    neighbors.forEach(({ x: nx, y: ny }) => {
      if (!isValidPixel(nx, ny)) {
        return;
      }
      if (pixelData[ny][nx] !== targetIndex) {
        return;
      }
      pixelData[ny][nx] = replacementIndex;
      queue.push({ x: nx, y: ny });
    });
  }
}

function resetCanvas() {
  initializePixelData();
  updateStatusMessage();
  updateExportTextarea();
  redraw();
  showExportFeedback('キャンバスをリセットしました。');
}

function isMouseWithinCanvas(positionX, positionY) {
  return positionX >= 0 && positionX < width && positionY >= 0 && positionY < height;
}

function isValidPixel(x, y) {
  return x >= 0 && x < CANVAS_PIXEL_SIZE && y >= 0 && y < CANVAS_PIXEL_SIZE;
}

function handleCanvasContextMenu(event) {
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;
  const positionX = (event.clientX - rect.left) * scaleX;
  const positionY = (event.clientY - rect.top) * scaleY;
  applyPickerAt(positionX, positionY);
}

function keyPressed() {
  const lowerKey = typeof key === 'string' ? key.toLowerCase() : '';

  if (lowerKey === 'b') {
    setSelectedTool('pen');
    return false;
  }
  if (lowerKey === 'e') {
    setSelectedTool('eraser');
    return false;
  }
  if (lowerKey === 'i') {
    setSelectedTool('picker');
    return false;
  }
  if (lowerKey === 'f') {
    setSelectedTool('fill');
    return false;
  }
  if (
    lowerKey === 'd' &&
    (keyIsDown(CONTROL) || keyIsDown(91) || keyIsDown(224))
  ) {
    resetCanvas();
    return false;
  }
}
