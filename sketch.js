//------------------------------------------------------
// 画面状態
//------------------------------------------------------
let screen = "input"; 

//------------------------------------------------------
// 月選択ドロップダウン
//------------------------------------------------------
let currentMonthSelect;
let compareMonthSelect;

//------------------------------------------------------
// 月ごとのデータ（ユーザー入力のみ）
//------------------------------------------------------
let monthlyData = {
  1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  7: [], 8: [], 9: [], 10: [], 11: [], 12: []
};

// 現在選択中の月
let selectedCurrentMonth = 5;   // デフォルト：5月
let selectedCompareMonth = 6;   // デフォルト：6月

//------------------------------------------------------
// 入力画面のUIパーツ
//------------------------------------------------------
let nameInput, amountInput, categoryInput;
let satisInput, regretInput, valueInput;
let addButton;

//------------------------------------------------------
// 可視化用
//------------------------------------------------------
let bubbles = [];
let draggingBubble = null;

//------------------------------------------------------
// タブ
//------------------------------------------------------
let tabs = [
  { id: "input", label: "支出入力" },
  { id: "visual", label: "可視化" },
  { id: "compare", label: "月別比較" }
];

//------------------------------------------------------
// setup()
//------------------------------------------------------
function setup() {
  createCanvas(1200, 700);
  colorMode(HSB);
  textFont("sans-serif");

  setupInputUI();
  setupMonthSelectors();   // ★ 月選択ドロップダウン
  updateInputVisibility();
}

//------------------------------------------------------
// 入力画面 UI の生成
//------------------------------------------------------
function setupInputUI() {
  nameInput = createInput();
  nameInput.position(60, 150);
  nameInput.size(200);
  nameInput.attribute("placeholder", "項目名");

  amountInput = createInput();
  amountInput.position(60, 190);
  amountInput.size(200);
  amountInput.attribute("placeholder", "金額");

  categoryInput = createSelect();
  categoryInput.position(60, 230);
  ["食費","娯楽","衣類","医療","交通費","教育","飲料","その他"]
    .forEach(c => categoryInput.option(c));

  satisInput = createSelect();
  satisInput.position(60, 270);
  for (let i = 1; i <= 5; i++) satisInput.option(i);

  regretInput = createSelect();
  regretInput.position(60, 310);
  for (let i = 1; i <= 5; i++) regretInput.option(i);

  valueInput = createSelect();
  valueInput.position(60, 350);
  for (let i = 1; i <= 5; i++) valueInput.option(i);

  addButton = createButton("追加して可視化へ");
  addButton.position(60, 390);
  addButton.mousePressed(onAddRecord);
}

//------------------------------------------------------
// 月選択ドロップダウン
//------------------------------------------------------
function setupMonthSelectors() {
  // 現在の月
  currentMonthSelect = createSelect();
  currentMonthSelect.position(180, 35);
  for (let m = 1; m <= 12; m++) currentMonthSelect.option(m + "月", m);
  currentMonthSelect.selected(selectedCurrentMonth);

  currentMonthSelect.changed(() => {
    selectedCurrentMonth = Number(currentMonthSelect.value());
    buildBubblesFromCurrent();
  });

  // 比較対象の月
  compareMonthSelect = createSelect();
  compareMonthSelect.position(1000, 110);
  for (let m = 1; m <= 12; m++) compareMonthSelect.option(m + "月", m);
  compareMonthSelect.selected(selectedCompareMonth);

  compareMonthSelect.changed(() => {
    selectedCompareMonth = Number(compareMonthSelect.value());
  });

  // 比較画面以外では非表示
  currentMonthSelect.style("display", "none");
  compareMonthSelect.style("display", "none");
}

//------------------------------------------------------
// 入力 UI の表示/非表示
//------------------------------------------------------
function updateInputVisibility() {
  const visible = (screen === "input");
  const disp = visible ? "block" : "none";

  nameInput.style("display", disp);
  amountInput.style("display", disp);
  categoryInput.style("display", disp);
  satisInput.style("display", disp);
  regretInput.style("display", disp);
  valueInput.style("display", disp);
  addButton.style("display", disp);

  // 月選択は比較画面のみ表示
  // 現在の月セレクトは常に表示
currentMonthSelect.style("display", "block");

// 比較対象の月は比較画面のみ
if (screen === "compare") {
  compareMonthSelect.style("display", "block");
} else {
  compareMonthSelect.style("display", "none");
}
}

//------------------------------------------------------
// 支出追加（ユーザー入力 → 選択中の月に保存）
//------------------------------------------------------
function onAddRecord() {
  const r = {
    name: nameInput.value() || "未入力",
    amount: Number(amountInput.value()) || 0,
    category: categoryInput.value(),
    satis: Number(satisInput.value()),
    regret: Number(regretInput.value()),
    value_match: Number(valueInput.value())
  };

  // ★ 選択中の月に保存
  monthlyData[selectedCurrentMonth].push(r);

  buildBubblesFromCurrent();
  screen = "visual";
  updateInputVisibility();
}

//------------------------------------------------------
// バブル生成（選択中の月のデータから）
//------------------------------------------------------
function buildBubblesFromCurrent() {
  bubbles = [];
  const data = monthlyData[selectedCurrentMonth];

  if (data.length === 0) return;

  const cx = 450;
  const cy = 380;
  const radiusBase = 180;

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const angle = map(i, 0, data.length, 0, TWO_PI);
    const distR = radiusBase + random(-40, 40);

    const x = cx + cos(angle) * distR;
    const y = cy + sin(angle) * distR;

    const size = sqrt(r.amount) * 0.8 + 40;

    const shape = generateShape(size, r.value_match);

    const hue = map(r.satis, 1, 5, 0, 120);
    const alpha = map(r.regret, 1, 5, 60, 255);

    bubbles.push({
      x, y,
      size,
      hue,
      alpha,
      shape,
      data: r,
      dragging: false,
      offsetX: 0,
      offsetY: 0
    });
  }
}

//------------------------------------------------------
// 正円 ↔ 四角形 補間形状
//------------------------------------------------------
function generateShape(size, match) {
  let t = map(match, 1, 5, 0, 1); // 0=四角形, 1=円
  let pts = [];

  for (let a = 0; a < TWO_PI; a += 0.2) {
    let cx = cos(a) * size;
    let cy = sin(a) * size;

    let denom = max(abs(cos(a)), abs(sin(a)));
    let sx = (cos(a) / denom) * size;
    let sy = (sin(a) / denom) * size;

    let x = lerp(sx, cx, t);
    let y = lerp(sy, cy, t);

    pts.push({ x, y });
  }
  return pts;
}
//------------------------------------------------------
// 描画ループ
//------------------------------------------------------
function draw() {
  background(18, 10, 10);

  drawTopBar();
  drawTabs();

  if (screen === "input") drawInputScreen();
  if (screen === "visual") drawVisualScreen();
  if (screen === "compare") drawCompareScreen();
}

//------------------------------------------------------
// 上部バー（タイトル・月）
//------------------------------------------------------
function drawTopBar() {
  noStroke();
  fill(18, 10, 20);
  rect(0, 0, width, 70);

  fill(0, 0, 100);
  textSize(26);
  textAlign(LEFT, CENTER);
  text("家計簿", 30, 35);

  fill(0, 0, 80);

}

//------------------------------------------------------
// タブ描画
//------------------------------------------------------
function drawTabs() {
  let x = 320;
  let y = 20;
  let w = 120;
  let h = 30;

  textAlign(CENTER, CENTER);
  textSize(14);

  for (let t of tabs) {
    fill(screen === t.id ? 210 : 180, 30, 40);
    rect(x, y, w, h, 6);

    fill(0, 0, 100);
    text(t.label, x + w / 2, y + h / 2);

    t._x = x;
    t._y = y;
    t._w = w;
    t._h = h;

    x += w + 10;
  }
}

//------------------------------------------------------
// 支出入力画面
//------------------------------------------------------
function drawInputScreen() {
  updateInputVisibility();

  fill(0, 0, 90);
  textAlign(LEFT, TOP);
  textSize(18);
  text("支出を入力", 50, 110);

  drawRightSummaryPanel(monthlyData[selectedCurrentMonth], "今月の支出");
}

//------------------------------------------------------
// 可視化画面
//------------------------------------------------------
function drawVisualScreen() {
  updateInputVisibility();

  // 左側（バブルエリア）
  push();
  translate(0, 70);
  fill(18, 10, 15);
  rect(0, 0, 850, height - 70);

  fill(0, 0, 70);
  textSize(14);
  text("タグをドラッグして自由に配置できます", 150, 20);

  // バブルを後悔度順に並べる（透明なものが後ろ）
bubbles.sort((a, b) => a.data.regret - b.data.regret);

for (let b of bubbles) {
  // ふち（透明）
  stroke(0, 0, 100, 30);
  strokeWeight(1);

  // 塗り（後悔度で透明度）
  const alpha = map(b.data.regret, 1, 5, 10, 255);
  fill(b.hue, 40, 90, alpha);

  drawBubbleShape(b);

  // テキスト
  noStroke();
  fill(0, 0, 10);
  textAlign(CENTER, CENTER);
  textSize(13);
  text(
    b.data.name + "\n¥" + b.data.amount + "\n" + b.data.category,
    b.x, b.y
  );
}
 pop();   // ← ★ push の対応

} 
//------------------------------------------------------
// 月別比較画面
//------------------------------------------------------
function drawCompareScreen() {
  updateInputVisibility();

  // ドロップダウン表示
  currentMonthSelect.style("display", "block");
  compareMonthSelect.style("display", "block");

  fill(0, 0, 90);
  textSize(14);
  text("現在の月", 900, 90);
  text("比較対象の月", 1000, 90);

  // 左側（比較バブル）
  push();
  translate(0, 70);
  fill(18, 10, 15);
  rect(0, 0, 850, height - 70);

  fill(0, 0, 80);
  textSize(15);
  text("月別比較（" + selectedCurrentMonth + "月 vs " + selectedCompareMonth + "月）", 150, 20);

  let past = monthlyData[selectedCompareMonth];
  let cur = monthlyData[selectedCurrentMonth];

  // 過去月（薄く）
  for (let i = 0; i < past.length; i++) {
    const r = past[i];
    const cx = 450 + cos(i) * 220;
    const cy = 380 + sin(i) * 220;
    const size = sqrt(r.amount) * 0.6 + 30;
    const shape = generateShape(size, r.value_match);
    const hue = map(r.satis, 1, 5, 0, 120);

    const alphaPast = map(r.regret, 1, 5, 10, 120);

    stroke(0, 0, 100, 120);
    strokeWeight(1);
    fill(hue, 60, 80, 80);
    drawShapeAt(shape, cx, cy);

    noStroke();
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(r.name + "\n¥" + r.amount + "\n" + r.category, cx, cy);
  }

  // 今月（濃く）
  for (let b of bubbles) {
    stroke(0, 0, 100, 220);
    strokeWeight(2);
    fill(b.hue, 60, 90, 200);
    drawBubbleShape(b);

    noStroke();
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(b.data.name + "\n¥" + b.data.amount + "\n" + b.data.category, b.x, b.y);
  }

  pop();

  // 右側サマリー
  drawCompareSummaryPanel();
}

//------------------------------------------------------
// バブル描画
//------------------------------------------------------
function drawBubbleShape(b) {
  beginShape();
  for (let p of b.shape) vertex(b.x + p.x, b.y + p.y);
  endShape(CLOSE);
}

function drawShapeAt(shape, x, y) {
  beginShape();
  for (let p of shape) vertex(x + p.x, y + p.y);
  endShape(CLOSE);
}

//------------------------------------------------------
// 右側サマリー（今月）
//------------------------------------------------------
function drawRightSummaryPanel(data, title) {
  const x = 860, y = 70, w = 320, h = 260;

  textAlign(LEFT, TOP);

  fill(18, 10, 18);
  rect(x, y, w, h, 10);

  fill(0, 0, 90);
  textSize(18);
  text(title, x + 20, y + 20);

  let total = data.reduce((s, r) => s + r.amount, 0);
  let avgS = data.length ? (data.reduce((s, r) => s + r.satis, 0) / data.length).toFixed(1) : "-";
  let avgV = data.length ? (data.reduce((s, r) => s + r.value_match, 0) / data.length).toFixed(1) : "-";

  textSize(14);
  let yy = y + 60;
  text("合計: ¥" + total.toLocaleString(), x + 20, yy);
  yy += 25;
  text("平均満足度: " + avgS, x + 20, yy);
  yy += 25;
  text("平均価値度: " + avgV, x + 20, yy);

  yy += 35;
  text("支出一覧", x + 20, yy);
  yy += 20;

  textSize(12);
  for (let r of data) {
    text(r.name + "  ¥" + r.amount.toLocaleString(), x + 20, yy);
    yy += 18;
  }
}

//------------------------------------------------------
// 凡例
//------------------------------------------------------
function drawLegendPanel() {
  const x = 860, y = 350, w = 320, h = 200;

  fill(18, 10, 25);
  rect(x, y, w, h, 10);

  fill(0, 0, 90);
  textSize(14);
  text("Encoding", x + 20, y + 15);

  let yy = y + 45;

  // 色相
  text("色相 — 満足度", x + 20, yy);
  yy += 18;
  for (let i = 0; i < 5; i++) {
    fill(map(i, 0, 4, 0, 120), 60, 90);
    rect(x + 20 + i * 25, yy, 20, 12, 3);
  }
  yy += 25;

  // 透明度
  fill(0, 0, 90);
  text("透明度 — 後悔度", x + 20, yy);
  yy += 18;
  for (let i = 0; i < 5; i++) {
    fill(200, 40, 90, map(i, 0, 4, 255, 60));
    rect(x + 20 + i * 25, yy, 20, 12, 3);
  }
  yy += 25;

  // 形状
  fill(0, 0, 90);
  text("形状 — 価値観一致度", x + 20, yy);
  yy += 30;

  let xx = x + 40;
  for (let m = 1; m <= 5; m++) {
    let s = generateShape(10, m);
    fill(120, 40, 90);
    beginShape();
    for (let p of s) vertex(xx + p.x, yy + p.y);
    endShape(CLOSE);
    xx += 30;
  }
}

//------------------------------------------------------
// 月別比較サマリー
//------------------------------------------------------
function drawCompareSummaryPanel() {
  const x = 860, y = 70, w = 320, h = 260;

  textAlign(LEFT, TOP);

  fill(18, 10, 18);
  rect(x, y, w, h, 10);

  fill(0, 0, 90);
  textSize(18);
  text("月別比較", x + 20, y + 20);

  let cur = calcStats(monthlyData[selectedCurrentMonth]);
  let past = calcStats(monthlyData[selectedCompareMonth]);

  let yy = y + 60;
  textSize(14);

  text("合計金額: ¥" + cur.total.toLocaleString(), x + 20, yy);
  yy += 25;

  text("支出件数: " + cur.count, x + 20, yy);
  yy += 25;

  text("平均満足度: " + cur.avgS.toFixed(1), x + 20, yy);
  yy += 25;

  text("平均後悔度: " + cur.avgR.toFixed(1), x + 20, yy);
  yy += 25;

  text("価値観一致度: " + cur.avgV.toFixed(1), x + 20, yy);
}
//------------------------------------------------------
// 統計計算（比較用）
//------------------------------------------------------
function calcStats(arr) {
  let total = arr.reduce((s, r) => s + r.amount, 0);
  let n = arr.length;

  let avgS = n ? arr.reduce((s, r) => s + r.satis, 0) / n : 0;
  let avgR = n ? arr.reduce((s, r) => s + r.regret, 0) / n : 0;
  let avgV = n ? arr.reduce((s, r) => s + r.value_match, 0) / n : 0;

  return { total, count: n, avgS, avgR, avgV };
}

//------------------------------------------------------
// マウス操作（タブ切替 & バブルドラッグ）
//------------------------------------------------------
function mousePressed() {
  // タブクリック
  for (let t of tabs) {
    if (
      mouseX >= t._x && mouseX <= t._x + t._w &&
      mouseY >= t._y && mouseY <= t._y + t._h
    ) {
      screen = t.id;
      updateInputVisibility();
      return;
    }
  }

  // バブルドラッグ開始（可視化画面のみ）
  if (screen === "visual") {
    for (let b of bubbles) {
      let d = dist(mouseX, mouseY, b.x, b.y);
      if (d < b.size) {
        draggingBubble = b;
        b.offsetX = b.x - mouseX;
        b.offsetY = b.y - mouseY;
        break;
      }
    }
  }
}

function mouseDragged() {
  if (draggingBubble) {
    draggingBubble.x = mouseX + draggingBubble.offsetX;
    draggingBubble.y = mouseY + draggingBubble.offsetY;
  }
}

function mouseReleased() {
  draggingBubble = null;
}
