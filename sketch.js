// sketch.js の一番上に貼り付け

if (typeof userId === 'undefined') {
  var userId = localStorage.getItem('experiment_user_id'); // 💡Lを小文字に修正
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('experiment_user_id', userId);
  }
}
//------------------------------------------------------
// 画面状態 & 選択月 & スクロール制御
//------------------------------------------------------
var currentScreen = "input"; 
var selectedCurrentMonth = 5;  // 2026年 5月
var selectedCompareMonth = 6;  // 2026年 6月

// スクロール用変数
let rightPanelScrollY = 0;     // 入力画面：右側リストのスクロール位置
let rightPanelMaxScroll = 0;   // 右側リストの最大スクロール量
let mainCanvasScrollY = 0;     // 可視化・比較画面：キャンバス全体のスクロール位置
const CANVAS_VIRTUAL_HEIGHT = 1200; // 可視化エリアの仮想的な総高さ

// データ構造
let monthlyData = {
  1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  7: [], 8: [], 9: [], 10: [], 11: [], 12: []
};

// バブル・ドラッグ用
let bubbles = [];
let draggingBubble = null;

// タブ情報
let tabs = [
  { id: "input", label: "支出入力" },
  { id: "visual", label: "可視化" },
  { id: "compare", label: "月別比較" }
];

// ★日本語全角入力対策：Figmaの枠の上に完全に重ねるHTML要素
let overlayNameInput;
let overlayAmountInput;

// 自作入力フォームの状態
let selectedCategory = "交通費";
let categoryDropdownOpen = false;
let currentMonthDropdownOpen = false;
let compareMonthDropdownOpen = false;

// 1〜5のボタン状態
let selectedSatis = 3;
let selectedRegret = 3;
let selectedValueMatch = 3;

//------------------------------------------------------
// setup()
//------------------------------------------------------
function setup() {
  let canvasElement = createCanvas(1280, 720);
  canvasElement.parent(document.body);
  document.body.style.position = "relative";

  colorMode(RGB, 255, 255, 255, 255);
  textFont("sans-serif");

  // ★項目名入力ボックス
  overlayNameInput = createInput("深夜タクシー");
  overlayNameInput.position(30, 190);
  overlayNameInput.size(370 - 24, 40 - 2); 
  setupInputStyle(overlayNameInput);

  // ★金額入力ボックス（タイピング中の制限を解除し、全角入力を許可）
  overlayAmountInput = createInput("3200");
  overlayAmountInput.position(30, 280);
  overlayAmountInput.size(175 - 24, 40 - 2);
  setupInputStyle(overlayAmountInput);
  
  // 初期ダミーデータ
  monthlyData[5] = [
    { id: "d1", name: "深夜タクシー", amount: 3200, category: "交通費", satis: 3, regret: 3, value_match: 3 },
    { id: "d2", name: "専門書籍", amount: 2880, category: "教育", satis: 5, regret: 1, value_match: 5 },
    { id: "d3", name: "衝動買いシャツ", amount: 4500, category: "衣類", satis: 1, regret: 5, value_match: 1 },
    { id: "d4", name: "ジム月会費", amount: 8000, category: "医療", satis: 4, regret: 2, value_match: 5 },
    { id: "d5", name: "高級カフェランチ", amount: 2500, category: "食費", satis: 4, regret: 4, value_match: 2 },
    { id: "d6", name: "サブスク動画会費", amount: 1480, category: "娯楽", satis: 5, regret: 1, value_match: 4 }
  ];

  const saved = localStorage.getItem("kakeiboData_figma_overlay_v2");
  if (saved) {
    let parsed = JSON.parse(saved);
    for (let m = 1; m <= 12; m++) {
      if (parsed[m]) monthlyData[m] = parsed[m];
    }
  }

  for (let m in monthlyData) {
    monthlyData[m].forEach(r => {
      if (!r.id) r.id = "id_" + Math.random().toString(36).substr(2, 9);
    });
  }

  buildBubblesFromCurrent();
  canvas.oncontextmenu = () => false;
  
  updateInputVisibility();
}

function setupInputStyle(inputEl) {
  inputEl.style('background', 'transparent');
  inputEl.style('border', 'none');
  inputEl.style('outline', 'none');
  inputEl.style('color', '#ffffff');
  inputEl.style('font-family', 'sans-serif');
  inputEl.style('font-size', '14px');
  inputEl.style('padding-left', '12px');
  inputEl.style('padding-right', '12px');
  inputEl.style('box-sizing', 'border-box');
}

function updateInputVisibility() {
  if (currentScreen === "input") {
    overlayNameInput.show();
    overlayAmountInput.show();
  } else {
    overlayNameInput.hide();
    overlayAmountInput.hide();
  }
}

//------------------------------------------------------
// バブル生成
//------------------------------------------------------
function buildBubblesFromCurrent() {
  bubbles = [];
  const data = monthlyData[selectedCurrentMonth] || [];
  const savedPositions = JSON.parse(localStorage.getItem("bubblePositionsFigmaOverlay_v2")) || {};

  const cx = 450; 
  const cy = 400; 

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    let seed = 0;
    for (let char of r.id) seed += char.charCodeAt(0);
    
    let angle = map(seed % 100, 0, 100, 0, TWO_PI);
    let distR = 120 + (seed % 3 * 45);

    let x = cx + cos(angle) * distR;
    let y = cy + sin(angle) * distR;

    if (savedPositions[r.id]) {
      x = savedPositions[r.id].x;
      y = savedPositions[r.id].y;
    }

    let size = sqrt(r.amount) * 1.0 + 40;
    if (r.amount >= 35000) size = 110; 

    let shape = generateShape(size, r.value_match);
    let baseColor = getFigmaColor(r.satis, r.regret);

    bubbles.push({
      id: r.id, x, y, size, baseColor, shape, data: r, offsetX: 0, offsetY: 0
    });
  }
}

function saveBubblePositions() {
  let savedPositions = JSON.parse(localStorage.getItem("bubblePositionsFigmaOverlay_v2")) || {};
  bubbles.forEach(b => {
    if (b.id) savedPositions[b.id] = { x: b.x, y: b.y };
  });
  localStorage.setItem("bubblePositionsFigmaOverlay_v2", JSON.stringify(savedPositions));
}

function getFigmaColor(satis, regret) {
  let c;
  if (satis <= 2) c = color(255, 40, 60);       
  else if (satis === 3) c = color(255, 180, 40); 
  else c = color(30, 240, 100);                 

  let factor = map(regret, 1, 5, 0.2, 1.0);
  return lerpColor(color(115, 120, 135), c, factor);
}

function generateShape(size, match) {
  let t = map(match, 1, 5, 0, 1); 
  let pts = [];
  for (let a = 0; a < TWO_PI; a += 0.08) { 
    let cx = cos(a) * size;
    let cy = sin(a) * size;
    let denom = max(abs(cos(a)), abs(sin(a)));
    let sx = (cos(a) / denom) * size * 0.88;
    let sy = (sin(a) / denom) * size * 0.88;
    pts.push({ x: lerp(sx, cx, t), y: lerp(sy, cy, t) });
  }
  return pts;
}

//------------------------------------------------------
// draw()
//------------------------------------------------------
function draw() {
  background(11, 11, 21); 

  if (currentScreen !== "input") {
    stroke(25, 27, 48);
    strokeWeight(2);
    let offsetG = mainCanvasScrollY % 40;
    for (let gx = 20; gx < width; gx += 40) {
      for (let gy = 90 + offsetG; gy < height; gy += 40) {
        point(gx, gy);
      }
    }
  }

  if (currentScreen === "input") drawInputscreen();
  else if (currentScreen === "visual") drawVisualscreen();
  else if (currentScreen === "compare") drawComparescreen();

  drawHeader();
}

//------------------------------------------------------
// ヘッダー描画
//------------------------------------------------------
function drawHeader() {
  push();
  noStroke();
  fill(16, 17, 34);
  rect(0, 0, width, 70);
  stroke(28, 31, 58);
  strokeWeight(1);
  line(0, 70, width, 70);

  fill(255);
  textSize(22);
  textAlign(LEFT, CENTER);
  text("psybudget", 30, 35);

  fill(24, 26, 50);
  stroke(40, 44, 80);
  rect(160, 20, 130, 30, 6);
  noStroke();
  fill(255);
  textSize(13);
  textAlign(LEFT, CENTER);
  text("2026年 " + selectedCurrentMonth + "月", 175, 35);
  fill(140, 145, 170);
  text("▼", 265, 36);

  let tx = 320;
  for (let t of tabs) {
    let active = (currentScreen === t.id);
    if (active) {
      fill(23, 25, 48);
      stroke(78, 71, 188);
      rect(tx, 18, 95, 34, 6);
      noStroke();
      fill(255);
    } else {
      noStroke();
      fill(110, 115, 145);
    }
    textSize(14);
    textAlign(CENTER, CENTER);
    text(t.label, tx + 47, 35);
    tx += 110;
  }

  fill(85, 90, 120);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text("心理的価値の可視化", width - 30, 35);

  if (currentMonthDropdownOpen) {
    drawDropdownMenu(160, 52, 130, 12, (v) => {
      selectedCurrentMonth = v;
      buildBubblesFromCurrent();
      currentMonthDropdownOpen = false;
    });
  }
  pop();
}

//------------------------------------------------------
// 1. 支出入力画面
//------------------------------------------------------
function drawInputscreen() {
  noStroke();
  fill(255);
  textSize(22);
  textAlign(LEFT, TOP);
  text("支出を編集", 30, 110);

  textSize(13);
  fill(120, 125, 150);
  text("項目名", 30, 165);
  drawCustomInputBase(30, 190, 370, 40);

  text("金額 (¥)", 30, 255);
  drawCustomInputBase(30, 280, 175, 40);

  text("カテゴリ", 225, 255);
  drawCustomDropdown(225, 280, 175, 40, selectedCategory);

  drawFigmaSliders();

  let isHoverButton = (mouseX >= 30 && mouseX <= 400 && mouseY >= 640 && mouseY <= 682);
  fill(isHoverButton ? 95 : 78, isHoverButton ? 88 : 71, isHoverButton ? 215 : 188);
  noStroke();
  rect(30, 640, 370, 42, 8);
  fill(255);
  textSize(15);
  textAlign(CENTER, CENTER);
  text("支出を追加", 215, 661);

  fill(16, 17, 34);
  stroke(28, 31, 58);
  rect(440, 100, 810, 585, 12);

  noStroke();
  fill(255);
  textSize(18);
  textAlign(LEFT, TOP);
  text("今月の支出", 470, 130);

  let data = monthlyData[selectedCurrentMonth] || [];
  let total = data.reduce((s, r) => s + r.amount, 0);
  fill(90, 100, 160);
  textSize(13);
  text(data.length + " 件  •  ¥" + total.toLocaleString(), 580, 134);

  push();
  let ly = 180 + rightPanelScrollY;
  let viewMin = 175;
  let viewMax = 665;
  
  let totalListHeight = data.length * 98;
  rightPanelMaxScroll = min(0, (viewMax - viewMin) - totalListHeight - 20);

  for (let r of data) {
    if (ly + 85 >= viewMin && ly <= viewMax) {
      fill(21, 23, 45);
      stroke(32, 36, 68);
      rect(470, ly, 725, 85, 8);

      let c = getFigmaColor(r.satis, r.regret);
      fill(red(c), green(c), blue(c), 30);
      stroke(c);
      strokeWeight(1.5);
      ellipse(515, ly + 42, 48, 48);
      
      noStroke();
      fill(c);
      textSize(11);
      textAlign(CENTER, CENTER);
      text(r.category, 515, ly + 42);

      fill(255);
      textSize(15);
      textAlign(LEFT, TOP);
      text(r.name, 555, ly + 22);
      fill(120, 125, 150);
      textSize(13);
      text("¥" + r.amount.toLocaleString(), 555, ly + 46);

      textAlign(CENTER, TOP);
      fill(90, 95, 120);
      textSize(11);
      text("満足", 720, ly + 24); text("後悔", 765, ly + 24); text("価値", 810, ly + 24);
      fill(255);
      textSize(14);
      text(r.satis, 720, ly + 44); text(r.regret, 765, ly + 44); text(r.value_match, 810, ly + 44);

      fill(28, 30, 56);
      stroke(45, 50, 85);
      rect(1100, ly + 26, 80, 32, 6);
      noStroke();
      fill(200, 100, 100);
      textSize(11);
      textAlign(CENTER, CENTER);
      text("右クリ削除", 1140, ly + 42);
    }
    ly += 98;
  }
  pop();

  if (totalListHeight > (viewMax - viewMin)) {
    let barTrackHeight = viewMax - viewMin;
    let barHeight = map(barTrackHeight, 0, totalListHeight, 30, barTrackHeight);
    let barY = map(rightPanelScrollY, 0, rightPanelMaxScroll, viewMin, viewMin + barTrackHeight - barHeight);
    
    fill(35, 40, 70);
    noStroke();
    rect(1225, viewMin, 8, barTrackHeight, 4); 
    fill(90, 95, 140);
    rect(1225, barY, 8, barHeight, 4);        
  }

  if (categoryDropdownOpen) {
    let cats = ["交通費","食費","娯楽","衣類","医療","教育","飲料","その他"];
    drawListDropdown(225, 322, 175, cats);
  }
}

// ★追加する瞬間に全角を半角数字へ一括安全クレンジングする関数
function onAddRecord() {
  let nameVal = overlayNameInput.value().trim();
  
  // 金額文字を取得
  let rawAmount = overlayAmountInput.value();
  // 全角数字を半角数字に変換する処理
  let cleanAmount = rawAmount.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  // 数字以外の文字（¥やカンマなど）を徹底除去
  cleanAmount = cleanAmount.replace(/[^0-9]/g, '');
  let amountVal = Number(cleanAmount) || 0;
  
  const uniqueId = "id_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  let finalName = nameVal === "" ? "未分類の支出" : nameVal;

  const r = {
    id: uniqueId,
    name: finalName,
    amount: amountVal,
    category: selectedCategory,
    satis: selectedSatis,
    regret: selectedRegret,
    value_match: selectedValueMatch
  };

  if (!monthlyData[selectedCurrentMonth]) monthlyData[selectedCurrentMonth] = [];
  monthlyData[selectedCurrentMonth].push(r);
  buildBubblesFromCurrent();

  // フォームクリア
  overlayNameInput.value("");
  overlayAmountInput.value("");
  rightPanelScrollY = 0; 
  
  localStorage.setItem("kakeiboData_figma_overlay_v2", JSON.stringify(monthlyData));
  currentScreen = "visual";
  updateInputVisibility();
}

//------------------------------------------------------
// 2. 可視化画面
//------------------------------------------------------
function drawVisualscreen() {
  push();
  translate(0, mainCanvasScrollY);

  noStroke();
  fill(140, 145, 170);
  textSize(13);
  textAlign(LEFT, TOP);
  text("💡 タグを自由にドラッグして配置できます (右クリックで削除)  上下ホイール・ドラッグでスクロール可能", 30, 95 - mainCanvasScrollY);

  bubbles.sort((a, b) => a.data.regret - b.data.regret);
  for (let b of bubbles) {
    drawFigmaBubble(b);
  }
  pop();

  drawStandaloneLegendPanel();
  drawMainScrollBar();
}

//------------------------------------------------------
// 3. 月別比較画面
//------------------------------------------------------
function drawComparescreen() {
  noStroke();
  fill(16, 18, 36);
  rect(0, 71, width, 50);
  stroke(28, 31, 58);
  line(0, 121, width, 121);

  noStroke();
  fill(110, 115, 145);
  textSize(14);
  textAlign(LEFT, CENTER);
  text("2026年 " + selectedCurrentMonth + "月 現在  vs ", 30, 96);

  fill(24, 26, 50);
  stroke(40, 44, 80);
  rect(210, 81, 120, 28, 6);
  noStroke();
  fill(255);
  textSize(12);
  text("2026年 " + selectedCompareMonth + "月", 225, 95);
  fill(110, 115, 145);
  text("▼", 305, 95);

  fill(100, 95, 235);
  ellipse(880, 96, 8, 8);
  fill(255); textSize(12); text("現在月", 895, 96);
  
  stroke(100, 105, 130); noFill(); rect(960, 90, 12, 11, 2);
  noStroke(); fill(130, 135, 160); text("比較対象月（ハッキリ点景）", 980, 96);

  push();
  translate(0, mainCanvasScrollY);

  let past = monthlyData[selectedCompareMonth] || [];
  const savedPositions = JSON.parse(localStorage.getItem("bubblePositionsFigmaOverlay_v2")) || {};

  if (selectedCurrentMonth === selectedCompareMonth) {
    for (let b of bubbles) {
      drawFigmaBubbleGhost(b.shape, b.x, b.y, b.baseColor, b.data);
    }
  } else {
    for (let i = 0; i < past.length; i++) {
      let r = past[i];
      let seed = 0; for (let char of r.id) seed += char.charCodeAt(0);
      let cx = 450 + cos(map(seed % 100, 0, 100, 0, TWO_PI)) * 150;
      let cy = 400 + sin(map(seed % 100, 0, 100, 0, TWO_PI)) * 150;
      if (savedPositions[r.id]) { cx = savedPositions[r.id].x; cy = savedPositions[r.id].y; }

      let size = sqrt(r.amount) * 0.8 + 35;
      let shape = generateShape(size, r.value_match);
      let c = getFigmaColor(r.satis, r.regret);
      drawFigmaBubbleGhost(shape, cx, cy, c, r);
    }
  }

  for (let b of bubbles) {
    drawFigmaBubble(b);
  }
  pop();

  drawFigmaCombinedPanel();
  drawMainScrollBar();

  if (compareMonthDropdownOpen) {
    drawDropdownMenu(210, 111, 120, 12, (v) => {
      selectedCompareMonth = v;
      compareMonthDropdownOpen = false;
    });
  }
}

function drawMainScrollBar() {
  let trackTop = 130;
  let trackHeight = height - 150;
  let barHeight = map(height, 0, CANVAS_VIRTUAL_HEIGHT, 50, trackHeight);
  let maxScroll = height - CANVAS_VIRTUAL_HEIGHT;
  let barY = map(mainCanvasScrollY, 0, maxScroll, trackTop, trackTop + trackHeight - barHeight);

  fill(35, 40, 70, 150);
  noStroke();
  rect(1262, trackTop, 8, trackHeight, 4); 
  fill(90, 95, 140, 200);
  rect(1262, barY, 8, barHeight, 4);        
}

//------------------------------------------------------
// タグ（バブル）の描画
//------------------------------------------------------
function drawFigmaBubble(b) {
  push();
  noStroke();
  let c = b.baseColor;
  for (let s = 3; s > 0; s--) {
    fill(red(c), green(c), blue(c), 8 - s * 2);
    beginShape();
    for (let p of b.shape) vertex(b.x + p.x * (1 + s * 0.05), b.y + p.y * (1 + s * 0.05));
    endShape(CLOSE);
  }

  fill(16, 18, 35, 230); 
  beginShape();
  for (let p of b.shape) vertex(b.x + p.x, b.y + p.y);
  endShape(CLOSE);

  fill(red(c), green(c), blue(c), 38); 
  noStroke();
  beginShape();
  for (let p of b.shape) vertex(b.x + p.x, b.y + p.y);
  endShape(CLOSE);

  noFill();
  stroke(c);
  strokeWeight(2.5);
  beginShape();
  for (let p of b.shape) vertex(b.x + p.x, b.y + p.y);
  endShape(CLOSE);

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(b.data.name, b.x, b.y - 10);

  fill(150, 155, 175);
  textSize(11);
  text("¥" + b.data.amount.toLocaleString() + "\n" + b.data.category, b.x, b.y + 16);
  pop();
}

function drawFigmaBubbleGhost(shapePoints, x, y, baseColor, data) {
  fill(red(baseColor), green(baseColor), blue(baseColor), 40);
  stroke(red(baseColor), green(baseColor), blue(baseColor), 180);
  strokeWeight(2);
  beginShape(POINTS); 
  for (let p of shapePoints) vertex(x + p.x, y + p.y);
  endShape(CLOSE);

  noStroke();
  fill(200, 205, 230, 180);
  textAlign(CENTER, CENTER);
  textSize(11);
  text(data.name + "\n¥" + data.amount.toLocaleString(), x, y);
}

//------------------------------------------------------
// 指標見本
//------------------------------------------------------
function drawSampleTag(x, y, isSafe) {
  push();
  let size = 32;
  let c = isSafe ? color(30, 240, 100) : color(255, 40, 60);

  if (isSafe) {
    noStroke();
    fill(red(c), green(c), blue(c), 15);
    ellipse(x, y, size * 2 + 8, size * 2 + 8);
    fill(16, 18, 35);
    stroke(c);
    strokeWeight(2);
    ellipse(x, y, size * 2, size * 2);
  } else {
    let radius = 2;
    noStroke();
    fill(red(c), green(c), blue(c), 15);
    rect(x - size - 4, y - size - 4, size * 2 + 8, size * 2 + 8, radius + 2);
    fill(16, 18, 35);
    stroke(c);
    strokeWeight(2);
    rect(x - size, y - size, size * 2, size * 2, radius);
  }

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(11);
  text(isSafe ? "安全" : "危険", x, y - 5);
  
  fill(130, 135, 160);
  textSize(9);
  text(isSafe ? "5 / 1 / 5" : "1 / 5 / 1", x, y + 11);
  pop();
}

function drawStandaloneLegendPanel() {
  let sx = 890, sy = 140, sw = 350, sh = 260;
  fill(16, 17, 34); stroke(28, 31, 58); rect(sx, sy, sw, sh, 12);
  
  noStroke(); fill(255); textSize(14); textAlign(LEFT, TOP);
  text("支出タグの指標見本", sx + 25, sy + 22);
  fill(110, 115, 140); textSize(11);
  text("バブルの「色」と「形状」の基準値です。", sx + 25, sy + 44);
  
  drawSampleTag(sx + 65, sy + 120, true); 
  fill(255); textSize(12); textAlign(LEFT, CENTER);
  text("安全な支出 (満足5/後悔1/価値5)", sx + 115, sy + 120);

  drawSampleTag(sx + 65, sy + 195, false); 
  text("危険な支出 (満足1/後悔5/価値1)", sx + 115, sy + 195);
}

function drawFigmaCombinedPanel() {
  let sx = 890, sy = 140, sw = 350, sh = 555;
  fill(16, 17, 34); stroke(28, 31, 58); rect(sx, sy, sw, sh, 12);

  noStroke(); fill(255); textSize(13); textAlign(LEFT, TOP);
  text("指標見本 (満足度 / 後悔度 / 一致度)", sx + 25, sy + 20);
  
  drawSampleTag(sx + 55, sy + 75, true);
  fill(140, 145, 170); textSize(11); textAlign(LEFT, CENTER);
  text("安全な支出\n(理想)", sx + 100, sy + 75);

  drawSampleTag(sx + 225, sy + 75, false);
  fill(140, 145, 170); textSize(11); textAlign(RIGHT, CENTER);
  text("危険な支出\n(要見直し)", sx + 325, sy + 75);

  stroke(28, 31, 58); line(sx + 20, sy + 130, sx + sw - 20, sy + 130);

  noStroke(); fill(110, 115, 140); textSize(12); textAlign(LEFT, TOP); text("統計比較", sx + 25, sy + 150);
  fill(255); textSize(15); text("2026-" + (selectedCurrentMonth<10?"0":"")+selectedCurrentMonth + " vs 2026-" + (selectedCompareMonth<10?"0":"")+selectedCompareMonth, sx + 25, sy + 172);

  let cur = calcStats(monthlyData[selectedCurrentMonth]);
  let pas = calcStats(monthlyData[selectedCompareMonth]);

  let items = [
    { label: "合計金額 (¥)", cur: "¥" + cur.total.toLocaleString(), diff: cur.total - pas.total, isPrice: true },
    { label: "支出件数", cur: cur.count + " 件", diff: cur.count - pas.count },
    { label: "平均満足度", cur: cur.avgS.toFixed(1), diff: cur.avgS - pas.avgS },
    { label: "平均後悔度", cur: cur.avgR.toFixed(1), diff: cur.avgR - pas.avgR },
    { label: "価値観一致度", cur: cur.avgV.toFixed(1), diff: cur.avgV - pas.avgV }
  ];

  let ry = sy + 220;
  for (let it of items) {
    fill(130, 135, 160); textSize(13); textAlign(LEFT, TOP); text(it.label, sx + 25, ry);
    fill(255); textAlign(RIGHT, TOP); text(it.cur, sx + 210, ry);

    let diffSign = it.diff >= 0 ? "+" : "";
    let diffStr = it.isPrice ? (it.diff >= 0 ? "+¥" + it.diff.toLocaleString() : "-¥" + abs(it.diff).toLocaleString()) : diffSign + it.diff.toFixed(it.isPrice?0:1);
    
    if (it.diff > 0) fill(235, 94, 85);      
    else if (it.diff < 0) fill(110, 220, 126); 
    else fill(120);
    
    text(it.diff === 0 ? "0.0" : diffStr, sx + 325, ry);
    ry += 42;
  }
}

function drawCustomInputBase(x, y, w, h) {
  fill(18, 20, 38);
  stroke(35, 40, 75);
  strokeWeight(1);
  rect(x, y, w, h, 6);
}

function drawCustomDropdown(x, y, w, h, currentVal) {
  fill(18, 20, 38); stroke(35, 40, 75); rect(x, y, w, h, 6);
  noStroke(); fill(255); textSize(14); textAlign(LEFT, CENTER); text(currentVal, x + 12, y + h/2);
  fill(110, 115, 140); text("▼", x + w - 24, y + h/2);
}

function drawFigmaSliders() {
  drawSegmentedRow("満足度", 30, 355, selectedSatis, "不満", "満足", true, color(235, 94, 85), color(110, 220, 126));
  drawRegretRow("後悔度", 30, 440, selectedRegret, "後悔なし", "後悔大");
  drawValueMatchRow("価値観との一致度", 30, 525, selectedValueMatch, "低い", "高い");
}

function drawSegmentedRow(label, x, y, currentVal, leftT, rightT, isCircle, minC, maxC) {
  noStroke(); fill(255); textSize(14); textAlign(LEFT, TOP); text(label, x, y);
  textSize(11); fill(80, 85, 110); text(currentVal + " / 5", x + 340, y + 2);
  for (let i = 1; i <= 5; i++) {
    let bx = x + (i - 1) * 48; let by = y + 25;
    let active = (currentVal === i);
    let itemColor = lerpColor(minC, maxC, map(i, 1, 5, 0, 1));
    if (active) { fill(itemColor); stroke(255, 200); strokeWeight(1.5); } 
    else { fill(18, 20, 38); stroke(35, 40, 70); strokeWeight(1); }
    ellipse(bx + 18, by + 18, 34, 34);
    noStroke(); fill(active ? 15 : 130); textSize(13); textAlign(CENTER, CENTER); text(i, bx + 18, by + 17 - mainCanvasScrollY * 0);
  }
  fill(70, 75, 100); textSize(11); textAlign(LEFT, TOP); text(leftT, x, y + 64);
  textAlign(RIGHT, TOP); text(rightT, x + 230, y + 64);
}

function drawRegretRow(label, x, y, currentVal, leftT, rightT) {
  noStroke(); fill(255); textSize(14); textAlign(LEFT, TOP); text(label, x, y);
  textSize(11); fill(80, 85, 110); text(currentVal + " / 5", x + 340, y + 2);
  
  let baseGray = color(50, 52, 70);
  let neonPurple = color(160, 40, 255); 
  
  for (let i = 1; i <= 5; i++) {
    let bx = x + (i - 1) * 48; let by = y + 25;
    let active = (currentVal === i);
    let colorFactor = map(i, 1, 5, 0.15, 1.0);
    let itemColor = lerpColor(baseGray, neonPurple, colorFactor);
    
    if (active) { fill(itemColor); stroke(255); strokeWeight(1.5); } 
    else { fill(18, 20, 38); stroke(itemColor); strokeWeight(1); }
    
    ellipse(bx + 18, by + 18, 34, 34);
    noStroke(); fill(active ? 255 : 140); textSize(13); textAlign(CENTER, CENTER); text(i, bx + 18, by + 17);
  }
  fill(70, 75, 100); textSize(11); textAlign(LEFT, TOP); text(leftT, x, y + 64);
  textAlign(RIGHT, TOP); text(rightT, x + 230, y + 64);
}

function drawValueMatchRow(label, x, y, currentVal, leftT, rightT) {
  noStroke(); fill(255); textSize(14); textAlign(LEFT, TOP); text(label, x, y);
  textSize(11); fill(80, 85, 110); text(currentVal + " / 5", x + 340, y + 2);
  
  let themeColor = color(78, 71, 188);
  
  for (let i = 1; i <= 5; i++) {
    let bx = x + (i - 1) * 48; let by = y + 25;
    let active = (currentVal === i);
    
    if (active) { fill(themeColor); stroke(255); strokeWeight(1.5); } 
    else { fill(18, 20, 38); stroke(45, 50, 90); strokeWeight(1); }
    
    let cornerRadius = map(i, 1, 5, 2, 17);
    rect(bx, by, 34, 34, cornerRadius);
    
    noStroke(); fill(active ? 255 : 140); textSize(13); textAlign(CENTER, CENTER); text(i, bx + 18, by + 17);
  }
  fill(70, 75, 100); textSize(11); textAlign(LEFT, TOP); text(leftT, x, y + 64);
  textAlign(RIGHT, TOP); text(rightT, x + 230, y + 64);
}

function calcStats(arr) {
  let total = arr.reduce((s, r) => s + r.amount, 0);
  let n = arr.length;
  let avgS = n ? arr.reduce((s, r) => s + r.satis, 0) / n : 0;
  let avgR = n ? arr.reduce((s, r) => s + r.regret, 0) / n : 0;
  let avgV = n ? arr.reduce((s, r) => s + r.value_match, 0) / n : 0;
  return { total, count: n, avgS, avgR, avgV };
}

function mouseWheel(event) {
  if (currentScreen === "input") {
    if (mouseX >= 440 && mouseX <= 1250 && mouseY >= 100 && mouseY <= 685) {
      rightPanelScrollY -= event.delta * 0.4;
      rightPanelScrollY = constrain(rightPanelScrollY, rightPanelMaxScroll, 0);
      return false; 
    }
  } else {
    let maxScroll = height - CANVAS_VIRTUAL_HEIGHT;
    mainCanvasScrollY -= event.delta * 0.5;
    mainCanvasScrollY = constrain(mainCanvasScrollY, maxScroll, 0);
    return false;
  }
}

function drawDropdownMenu(x, y, w, maxM, callback) {
  fill(20, 22, 45); stroke(40, 45, 85); rect(x, y, w, 220, 6);
  for (let m = 1; m <= 12; m++) {
    let iy = y + (m - 1) * 18;
    if (mouseX >= x && mouseX <= x + w && mouseY >= iy && mouseY <= iy + 18) { fill(40, 45, 90); rect(x, iy, w, 18); }
    noStroke(); fill(255); textSize(11); textAlign(LEFT, CENTER); text(m + "月", x + 12, iy + 9);
  }
}

function drawListDropdown(x, y, w, items) {
  fill(20, 22, 45); stroke(40, 45, 85); rect(x, y, w, items.length * 24, 6);
  for (let i = 0; i < items.length; i++) {
    let iy = y + i * 24;
    if (mouseX >= x && mouseX <= x + w && mouseY >= iy && mouseY <= iy + 24) { fill(40, 45, 90); rect(x, iy, w, 24); }
    noStroke(); fill(255); textSize(13); textAlign(LEFT, CENTER); text(items[i], x + 12, iy + 12);
  }
}

function mousePressed() {
  let tx = 320;
  for (let t of tabs) {
    if (mouseX >= tx && mouseX <= tx + 95 && mouseY >= 18 && mouseY <= 52) {
      currentScreen = t.id;
      categoryDropdownOpen = false; currentMonthDropdownOpen = false; compareMonthDropdownOpen = false;
      buildBubblesFromCurrent(); 
      updateInputVisibility(); 
      return;
    }
    tx += 110;
  }

  if (mouseX >= 160 && mouseX <= 290 && mouseY >= 20 && mouseY <= 50) {
    currentMonthDropdownOpen = !currentMonthDropdownOpen; return;
  }
  if (currentMonthDropdownOpen) {
    if (mouseX >= 160 && mouseX <= 290 && mouseY >= 52 && mouseY <= 52 + 220) {
      let m = floor((mouseY - 52) / 18) + 1;
      if (m >= 1 && m <= 12) { selectedCurrentMonth = m; buildBubblesFromCurrent(); currentMonthDropdownOpen = false; }
      return;
    }
    currentMonthDropdownOpen = false;
  }

  if (currentScreen=== "compare" && mouseX >= 210 && mouseX <= 330 && mouseY >= 81 && mouseY <= 109) {
    compareMonthDropdownOpen = !compareMonthDropdownOpen; return;
  }
  if (compareMonthDropdownOpen) {
    if (mouseX >= 210 && mouseX <= 330 && mouseY >= 111 && mouseY <= 111 + 220) {
      let m = floor((mouseY - 111) / 18) + 1;
      if (m >= 1 && m <= 12) { selectedCompareMonth = m; compareMonthDropdownOpen = false; }
      return;
    }
    compareMonthDropdownOpen = false;
  }

  if (currentScreen === "input") {
    if (mouseX >= 225 && mouseX <= 400 && mouseY >= 280 && mouseY <= 320) { categoryDropdownOpen = !categoryDropdownOpen; return; }
    if (categoryDropdownOpen) {
      let cats = ["交通費","食費","娯楽","衣類","医療","教育","飲料","その他"];
      if (mouseX >= 225 && mouseX <= 400 && mouseY >= 322 && mouseY <= 322 + cats.length*24) {
        let idx = floor((mouseY - 322) / 24);
        if (idx >= 0 && idx < cats.length) { selectedCategory = cats[idx]; categoryDropdownOpen = false; }
        return;
      }
      categoryDropdownOpen = false;
    }

    if (mouseY >= 380 && mouseY <= 414) {
      for(let i=1; i<=5; i++) { let bx = 30 + (i-1)*48; if(mouseX >= bx && mouseX <= bx+36) selectedSatis = i; }
    }
    if (mouseY >= 465 && mouseY <= 499) {
      for(let i=1; i<=5; i++) { let bx = 30 + (i-1)*48; if(mouseX >= bx && mouseX <= bx+36) selectedRegret = i; }
    }
    if (mouseY >= 550 && mouseY <= 584) {
      for(let i=1; i<=5; i++) { let bx = 30 + (i-1)*48; if(mouseX >= bx && mouseX <= bx+36) selectedValueMatch = i; }
    }

    if (mouseX >= 30 && mouseX <= 400 && mouseY >= 640 && mouseY <= 682) { onAddRecord(); return; }
    
    let data = monthlyData[selectedCurrentMonth] || [];
    let ly = 180 + rightPanelScrollY;
    for(let i=0; i<data.length; i++) {
      if (ly + 85 >= 175 && ly <= 665) {
        if(mouseX >= 1100 && mouseX <= 1180 && mouseY >= ly + 26 && mouseY <= ly + 58) { showDeletePopup(i); return; }
      }
      ly += 98;
    }
  }

  if (currentScreen === "visual" || currentScreen === "compare") {
    let adjustedMouseY = mouseY - mainCanvasScrollY;
    if (mouseX < 890) {
      if (mouseButton === RIGHT) {
        for (let i = 0; i < bubbles.length; i++) {
          if (dist(mouseX, adjustedMouseY, bubbles[i].x, bubbles[i].y) < bubbles[i].size) { showDeletePopup(i); return false; }
        }
      }
      if (mouseButton === LEFT) {
        for (let b of bubbles) {
          if (dist(mouseX, adjustedMouseY, b.x, b.y) < b.size) {
            draggingBubble = b; b.offsetX = b.x - mouseX; b.offsetY = b.y - adjustedMouseY; break;
          }
        }
      }
    }
  }
}

function mouseDragged() {
  if (draggingBubble) { 
    draggingBubble.x = mouseX + draggingBubble.offsetX; 
    draggingBubble.y = (mouseY - mainCanvasScrollY) + draggingBubble.offsetY; 
  }
}

// （マウスを離したときにFirebaseに送る）
function mouseReleased() {
  if (draggingBubble) { 
    saveBubblePositions(); 
    draggingBubble = null; 
  }
  
  // 動かして手を離した瞬間にデータを送る
  saveToFirebase(); 
}

function showDeletePopup(index) {
  if (confirm("この支出項目を削除しますか？")) {
    let removed = bubbles[index];
    let arr = monthlyData[selectedCurrentMonth];
    let idx = arr.findIndex(item => item.id === removed.id);
    if (idx !== -1) arr.splice(idx, 1);

    let savedPositions = JSON.parse(localStorage.getItem("bubblePositionsFigmaOverlay_v2")) || {};
    if (removed.id && savedPositions[removed.id]) {
      delete savedPositions[removed.id];
      localStorage.setItem("bubblePositionsFigmaOverlay_v2", JSON.stringify(savedPositions));
    }
    buildBubblesFromCurrent();
    localStorage.setItem("kakeiboData_figma_overlay_v2", JSON.stringify(monthlyData));
  }
  saveToFirebase();
}





// ⭕ 座標情報（x, y）も一緒にFirebaseへ送るように改良した関数
function saveToFirebase() {
  if (!window.db || !window.dbRef || !window.dbSet) {
    console.log("Firebaseがまだ読み込まれていません");
    return;
  }

  // 💡ブラウザに保存されている最新のバブル座標データを取ってくる
  let savedPositions = JSON.parse(localStorage.getItem("bubblePositionsFigmaOverlay_v2")) || {};

  // 💡家計簿データ（monthlyData）をコピーして、中に座標(x, y)を埋め込む処理
  let detailedMonthlyData = {};
  for (let m = 1; m <= 12; m++) {
    detailedMonthlyData[m] = monthlyData[m].map(item => {
      // この項目のIDに対応する座標があるか探す
      let pos = savedPositions[item.id] || { x: 0, y: 0 }; 
      return {
        ...item,
        x: pos.x, // 👈 Firebase用のデータにX座標を追加！
        y: pos.y  // 👈 Firebase用のデータにY座標を追加！
      };
    });
  }

  // 送信したいデータの塊を作る
  let payload = {
    updatedAt: new Date().toISOString(),
    monthlyData: detailedMonthlyData // 💡座標入りのデータに差し替え
  };

  let userRef = window.dbRef(window.db, 'users/' + userId);

  window.dbSet(userRef, payload)
    .then(() => {
      console.log("Firebaseへの自動保存に成功しました！(座標付き) ID: " + userId);
    })
    .catch((error) => {
      console.error("Firebaseへの保存エラー: ", error);
    });
}