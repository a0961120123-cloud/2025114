// Global variables for the quiz
let quizTable; // Stores the loaded CSV data
let allQuestions = []; // Array to hold parsed question objects
let selectedQuestions = []; // Array to hold 3 randomly selected questions for the current quiz
let currentQuestionIndex = 0; // Index of the current question being displayed
let userAnswers = []; // Stores user's selected option index for each question
let score = 0; // User's score
let quizState = 'blank'; // 'blank'（預設空白), 'start', 'question', 'result'

let startButton;
let submitButton;
let restartButton;

let feedbackText = "";
let feedbackColor;

// Interactive elements for visual effects
let particles = [];
let backgroundColor;

// Sidebar menu variables
let sidebarWidth = 200;
let sidebarX = -sidebarWidth;
let sidebarTargetX = -sidebarWidth;
// 新增：加入淡江大學主項
let sidebarItems = ['首頁', '第一單元', '淡江大學', '測驗', '作品筆記'];
let sidebarItemHeight = 50;
let sidebarHover = -1;

// 新增：淡江子選單狀態
let showTkuSubmenu = false;

// 新增：blog iframe 與 HTML 側邊欄變數，以及 p5 canvas 參考
let blogIframe = null;
let htmlSidebar = null;
let p5Canvas = null;

// Preload function to load the CSV file
function preload() {
  quizTable = loadTable('questions.csv', 'csv', 'header');
}

// Setup function to initialize the p5.js canvas and quiz elements
function setup() {
  // 改為保留畫布參考並把畫布放在頁面底層（iframe 會覆蓋在上面）
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.style('position', 'fixed');
  p5Canvas.style('left', '0px');
  p5Canvas.style('top', '0px');
  p5Canvas.style('z-index', '0');

  textAlign(CENTER, CENTER);
  textSize(20);
  rectMode(CENTER);

  // Parse questions from the loaded table
  parseQuestions();

  // Create UI buttons
  startButton = createButton('Start Quiz');
  startButton.mousePressed(startQuiz);

  submitButton = createButton('Submit Answer');
  submitButton.mousePressed(submitAnswer);

  restartButton = createButton('Restart Quiz');
  restartButton.mousePressed(resetQuiz);

  positionButtons();
  backgroundColor = color(220); // Initial background color

  // 初始隱藏所有按鈕，必須從左側選單選「測驗」才會顯示
  startButton.hide();
  submitButton.hide();
  restartButton.hide();

  particles = [];
}

// Draw function to render the quiz based on its state
function draw() {
  background(backgroundColor);

  switch (quizState) {
    case 'start':
      displayStartScreen();
      break;
    case 'question':
      displayQuestion();
      break;
    case 'result':
      displayResultScreen();
      break;
    case 'notes':
      displayNotesScreen();
      break;
  }

  // Draw sidebar menu (滑出選單)
  drawSidebarMenu();

  // Update and display particles for interactive effects
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isFinished()) {
      particles.splice(i, 1);
    }
  }
}

// Parses questions from the CSV table
function parseQuestions() {
  for (let r = 0; r < quizTable.getRowCount(); r++) {
    let row = quizTable.getRow(r);
    allQuestions.push({
      question: row.getString('Question'),
      options: [
        row.getString('Option1'),
        row.getString('Option2'),
        row.getString('Option3'),
        row.getString('Option4')
      ],
      correctAnswer: parseInt(row.getString('CorrectAnswerIndex'))
    });
  }
}

// Starts the quiz
function startQuiz() {
  selectRandomQuestions(5); // Select 5 questions
  currentQuestionIndex = 0;
  userAnswers = new Array(selectedQuestions.length).fill(-1); // -1 indicates no answer yet
  score = 0;
  quizState = 'question';
  startButton.hide();
  submitButton.show();
  restartButton.hide();
  backgroundColor = color(220);
  particles = [];
}

// Selects N random questions from the allQuestions array
function selectRandomQuestions(num) {
  selectedQuestions = [];
  let availableIndices = Array.from({ length: allQuestions.length }, (_, i) => i);
  for (let i = 0; i < num; i++) {
    if (availableIndices.length === 0) break; // No more questions to select
    let randomIndex = floor(random(availableIndices.length));
    let questionIndex = availableIndices[randomIndex];
    selectedQuestions.push(allQuestions[questionIndex]);
    availableIndices.splice(randomIndex, 1); // Remove selected index to avoid duplicates
  }
}

// Displays the start screen
function displayStartScreen() {
  fill(0);
  text('Welcome to the Quiz!', width / 2, height / 2 - 50);
  startButton.show();
  submitButton.hide();
  restartButton.hide();
}

// Displays the current question and options
function displayQuestion() {
  let q = selectedQuestions[currentQuestionIndex];
  fill(0);
  text(`Question ${currentQuestionIndex + 1} of ${selectedQuestions.length}:`, width / 2, 50);
  text(q.question, width / 2, 150);

  let optionY = 250;
  let optionHeight = 50;
  let optionWidth = width * 0.6;
  let optionX = width / 2;

  for (let i = 0; i < q.options.length; i++) {
    let isSelected = userAnswers[currentQuestionIndex] === i;
    
    // Draw option box
    if (isSelected) {
      fill(150, 200, 255); // Highlight selected option
    } else {
      fill(240);
    }
    rect(optionX, optionY + i * (optionHeight + 10), optionWidth, optionHeight, 10);

    // Draw option text
    fill(0);
    text(q.options[i], optionX, optionY + i * (optionHeight + 10));
  }
}

// Handles mouse clicks for option selection and button presses
function mousePressed() {
  // 如果側邊欄在可點擊範圍內，先處理選單點擊
  let visibleThreshold = -sidebarWidth + 20; // 當 sidebarX 接近可視時允許點擊
  if (mouseX >= 0 && mouseX <= sidebarWidth && sidebarX > visibleThreshold) {
    // 偵測點擊到哪一個主選單項目
    for (let i = 0; i < sidebarItems.length; i++) {
      let y = 100 + i * (sidebarItemHeight + 10);
      let top = y - sidebarItemHeight / 2;
      let bottom = y + sidebarItemHeight / 2;
      if (mouseY >= top && mouseY <= bottom) {
        handleSidebarClick(i);
        return; // 避免點擊穿透到題目
      }
    }

    // 如果淡江子選單展開，偵測子項（教育科技系）點擊
    if (showTkuSubmenu) {
      // 子選單位置：放在「淡江大學」項目下面一格
      let parentIndex = 2; // 淡江大學在 sidebarItems 的索引
      let subY = 100 + parentIndex * (sidebarItemHeight + 10) + (sidebarItemHeight + 10);
      let subTop = subY - sidebarItemHeight / 2;
      let subBottom = subY + sidebarItemHeight / 2;
      // 判斷點擊範圍
      if (mouseY >= subTop && mouseY <= subBottom) {
        // 開啟教育科技系網址於 iframe（同頁）
        openContentIframe('https://www.et.tku.edu.tw/');
        return;
      }
    }
  }

  // 其餘區域的點擊（例如測驗選項）
  if (quizState === 'question') {
    let optionY = 250;
    let optionHeight = 50;
    let optionWidth = width * 0.6;
    let optionX = width / 2;

    for (let i = 0; i < selectedQuestions[currentQuestionIndex].options.length; i++) {
      let rectLeft = optionX - optionWidth / 2;
      let rectRight = optionX + optionWidth / 2;
      let rectTop = optionY + i * (optionHeight + 10) - optionHeight / 2;
      let rectBottom = optionY + i * (optionHeight + 10) + optionHeight / 2;

      if (mouseX > rectLeft && mouseX < rectRight && mouseY > rectTop && mouseY < rectBottom) {
        userAnswers[currentQuestionIndex] = i;
        // Add a particle effect on selection
        for (let p = 0; p < 5; p++) {
          particles.push(new Particle(mouseX, mouseY, color(0, 150, 255)));
        }
        break;
      }
    }
  }
}

// Submits the current answer and moves to the next question or results
function submitAnswer() {
  if (userAnswers[currentQuestionIndex] === -1) {
    // User hasn't selected an answer
    // Optional: provide visual feedback that an answer is required
    return;
  }

  // Check answer and provide immediate feedback
  let q = selectedQuestions[currentQuestionIndex];
  let isCorrect = userAnswers[currentQuestionIndex] === q.correctAnswer;

  if (isCorrect) {
    score++;
    feedbackText = "Correct!";
    feedbackColor = color(0, 200, 0); // Green
    for (let p = 0; p < 20; p++) {
      particles.push(new Particle(width / 2, height / 2, feedbackColor));
    }
  } else {
    feedbackText = "Incorrect. The correct answer was: " + q.options[q.correctAnswer];
    feedbackColor = color(200, 0, 0); // Red
    for (let p = 0; p < 20; p++) {
      particles.push(new Particle(width / 2, height / 2, feedbackColor));
    }
  }
  
  // Briefly show feedback, then move to next question
  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < selectedQuestions.length) {
      // Move to next question
      feedbackText = ""; // Clear feedback
    } else {
      // Quiz finished, show results
      quizState = 'result';
      submitButton.hide();
      restartButton.show();
    }
  }, 1500); // Show feedback for 1.5 seconds
}

// Displays the result screen
function displayResultScreen() {
  fill(0);
  text('Quiz Finished!', width / 2, height / 2 - 100);
  text(`You scored ${score} out of ${selectedQuestions.length} questions.`, width / 2, height / 2 - 50);

  let percentage = (score / selectedQuestions.length) * 100;
  let resultFeedback = "";
  if (percentage === 100) {
    resultFeedback = "Excellent! You got all answers correct!";
    backgroundColor = color(150, 255, 150); // Light green for perfect score
  } else if (percentage >= 70) {
    resultFeedback = "Good job! You did well.";
    backgroundColor = color(200, 200, 100); // Yellowish for good score
  } else {
    resultFeedback = "Keep practicing! You'll get better.";
    backgroundColor = color(255, 150, 150); // Light red for low score
  }
  text(resultFeedback, width / 2, height / 2);

  restartButton.show();
}

// Resets the quiz to the start screen
function resetQuiz() {
  quizState = 'start';
  startButton.show();
  submitButton.hide();
  restartButton.hide();
  backgroundColor = color(220);
  particles = [];
}

// Repositions buttons when the window is resized
function positionButtons() {
  startButton.position(width / 2 - startButton.width / 2, height / 2 + 50);
  submitButton.position(width / 2 - submitButton.width / 2, height - 50);
  restartButton.position(width / 2 - restartButton.width / 2, height / 2 + 100);
}

// Handles window resize events
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionButtons();
  if (blogIframe) {
    blogIframe.style('left', sidebarWidth + 'px');
    blogIframe.style('width', `calc(100% - ${sidebarWidth}px)`);
    blogIframe.style('height', '100%');
  }
  if (htmlSidebar) {
    htmlSidebar.style('height', '100%');
  }
}

// Particle class for visual effects
class Particle {
  constructor(x, y, c) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(1, 5));
    this.acc = createVector(0, 0.1); // Gravity-like effect
    this.lifespan = 255;
    this.color = c;
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 5;
  }

  display() {
    stroke(this.color, this.lifespan);
    strokeWeight(2);
    fill(this.color, this.lifespan);
    ellipse(this.pos.x, this.pos.y, 10);
  }

  isFinished() {
    return this.lifespan < 0;
  }
}

// 修改：繪製側邊欄選單（加入淡江子選單繪製）
function drawSidebarMenu() {
  // 判斷是否應該顯示（滑鼠靠近左側或滑鼠在側邊欄上）
  if (mouseX < 40 || (mouseX >= 0 && mouseX <= sidebarWidth && mouseY >= 0 && mouseY <= height)) {
    sidebarTargetX = 0;
  } else {
    sidebarTargetX = -sidebarWidth;
  }
  // 平滑動畫
  sidebarX = lerp(sidebarX, sidebarTargetX, 0.2);

  push();
  translate(sidebarX, 0);
  rectMode(CORNER);
  noStroke();
  fill(30, 30, 60, 230);
  rect(0, 0, sidebarWidth, height);

  textAlign(LEFT, CENTER);
  textSize(18);
  let localHover = -1;
  for (let i = 0; i < sidebarItems.length; i++) {
    let y = 100 + i * (sidebarItemHeight + 10);
    let top = y - sidebarItemHeight / 2;
    let bottom = y + sidebarItemHeight / 2;
    let localMouseX = mouseX - sidebarX;
    let hovered = localMouseX >= 0 && localMouseX <= sidebarWidth && mouseY >= top && mouseY <= bottom;

    if (hovered) {
      fill(70, 130, 180);
      rect(10, top, sidebarWidth - 20, sidebarItemHeight, 8);
      fill(255);
      localHover = i;
    } else {
      fill(255);
    }
    text(sidebarItems[i], 20, y);
  }

  // 若淡江子選單展開，繪製子選單（教育科技系）
  if (showTkuSubmenu) {
    let parentIndex = 2; // 淡江大學主項索引
    let y = 100 + parentIndex * (sidebarItemHeight + 10) + (sidebarItemHeight + 10); // 下一行
    let top = y - sidebarItemHeight / 2;
    let localMouseX = mouseX - sidebarX;
    let hovered = localMouseX >= 0 && localMouseX <= sidebarWidth && mouseY >= top && mouseY <= top + sidebarItemHeight;

    if (hovered) {
      fill(70, 130, 180);
      rect(20, top, sidebarWidth - 40, sidebarItemHeight, 8);
      fill(255);
    } else {
      fill(230);
    }
    text('教育科技系', 30, y);
  }

  sidebarHover = localHover;
  pop();
}

// 修改：處理側邊欄點擊事件（淡江大學改為切換子選單，不再建立臨時 div）
function handleSidebarClick(index) {
  if (index === 0) {
    // 首頁：顯示預設空白，關閉 blog UI（若存在）
    removeBlogUI();
    showTkuSubmenu = false;
    quizState = 'blank';
    startButton.hide();
    submitButton.hide();
    restartButton.hide();
    backgroundColor = color(220);
    particles = [];
    return;
  }

  if (index === 1) {
    // 第一單元：在同一頁以 iframe 顯示指定網址，左側保留 HTML 側欄
    let url = 'https://a0961120123-cloud.github.io/10142/';
    // 使用共用函式開啟 iframe
    openContentIframe(url);
    showTkuSubmenu = false;
    return;
  }

  if (index === 2) {
    // 淡江大學：切換子選單顯示（改為更新 HTML 側欄或 canvas 繪製）
    showTkuSubmenu = !showTkuSubmenu;
    // 若 html 側欄存在，重建以反映子選單狀態；若不存在，畫布上已可顯示子選單
    if (htmlSidebar) {
      createHtmlSidebar();
    }
    return;
  }

  if (index === 3) {
    // 測驗：關閉 blog UI（若存在），回到測驗起始畫面
    removeBlogUI();
    showTkuSubmenu = false;
    quizState = 'start';
    startButton.show();
    submitButton.hide();
    restartButton.hide();
    backgroundColor = color(220);
    particles = [];
    return;
  }

  if (index === 4) {
    // 作品筆記：關閉 blog UI（若存在），顯示筆記畫面
    removeBlogUI();
    showTkuSubmenu = false;
    quizState = 'notes';
    startButton.hide();
    submitButton.hide();
    restartButton.show();
    backgroundColor = color(245);
    return;
  }
}

// 修改：建立 HTML 側邊欄（覆蓋於 iframe 左側，保留互動並支援淡江子選單）
function createHtmlSidebar() {
  // 先移除再重建（確保子選單狀態能即時反映）
  if (htmlSidebar) {
    htmlSidebar.remove();
    htmlSidebar = null;
  }

  htmlSidebar = createDiv();
  htmlSidebar.id('htmlSidebar');
  htmlSidebar.style('position', 'fixed');
  htmlSidebar.style('left', '0px');
  htmlSidebar.style('top', '0px');
  htmlSidebar.style('width', sidebarWidth + 'px');
  htmlSidebar.style('height', '100%');
  htmlSidebar.style('background', 'rgba(30,30,60,0.95)');
  htmlSidebar.style('color', '#fff');
  htmlSidebar.style('padding-top', '20px');
  htmlSidebar.style('z-index', '9999');
  htmlSidebar.style('box-sizing', 'border-box');
  htmlSidebar.style('font-family', 'sans-serif');

  for (let i = 0; i < sidebarItems.length; i++) {
    let item = createDiv(sidebarItems[i]);
    item.parent(htmlSidebar);
    item.style('padding', '12px 16px');
    item.style('cursor', 'pointer');
    item.style('font-size', '18px');
    item.style('border-bottom', '1px solid rgba(255,255,255,0.03)');
    item.mousePressed(() => handleSidebarClick(i));
    item.mouseOver(() => item.style('background', 'rgba(255,255,255,0.06)'));
    item.mouseOut(() => item.style('background', 'transparent'));
  }

  // 若淡江子選單展開，加入 HTML 子選單
  if (showTkuSubmenu) {
    let tkuSubmenuDiv = createDiv();
    tkuSubmenuDiv.parent(htmlSidebar);
    tkuSubmenuDiv.style('padding', '8px 8px 20px 24px');
    tkuSubmenuDiv.style('font-size', '16px');

    // 子項：教育科技系
    let eduItem = createDiv('教育科技系');
    eduItem.parent(tkuSubmenuDiv);
    eduItem.style('padding', '8px 10px');
    eduItem.style('cursor', 'pointer');
    eduItem.style('background', 'rgba(255,255,255,0.02)');
    eduItem.mouseOver(() => eduItem.style('background', 'rgba(255,255,255,0.06)'));
    eduItem.mouseOut(() => eduItem.style('background', 'rgba(255,255,255,0.02)'));
    eduItem.mousePressed(() => {
      openContentIframe('https://www.et.tku.edu.tw/');
    });
  }
}

// 新增：開啟指定網址的 iframe（共用函式）
function openContentIframe(url) {
  // 如果尚未建立 iframe，建立並放置在左側選單右方
  if (!blogIframe) {
    blogIframe = createElement('iframe');
    blogIframe.attribute('src', url);
    // 可根據需求調整 sandbox 屬性，預設空字串會套用最嚴格限制
    blogIframe.attribute('sandbox', '');
    blogIframe.style('position', 'fixed');
    blogIframe.style('left', sidebarWidth + 'px');
    blogIframe.style('top', '0px');
    blogIframe.style('width', `calc(100% - ${sidebarWidth}px)`);
    blogIframe.style('height', '100%');
    blogIframe.style('border', 'none');
    blogIframe.style('z-index', '1');
  } else {
    blogIframe.attribute('src', url);
    blogIframe.show();
  }

  // 建立或顯示 HTML 側邊欄以保持選單（覆蓋於 iframe 上）
  createHtmlSidebar();

  // 隱藏 p5 控制按鈕（與顯示部落格互斥）並隱藏 canvas（內容由 iframe 呈現）
  startButton.hide();
  submitButton.hide();
  restartButton.hide();
  if (p5Canvas && p5Canvas.elt) p5Canvas.style('display', 'none');

  // 設定狀態為 blank（畫面由 iframe 呈現）
  quizState = 'blank';
  backgroundColor = color(220);
  particles = [];
}

// 新增：移除 iframe 與 HTML 側邊，還原 p5 畫布
function removeBlogUI() {
  if (blogIframe) {
    blogIframe.remove();
    blogIframe = null;
  }
  if (htmlSidebar) {
    htmlSidebar.remove();
    htmlSidebar = null;
  }
  if (p5Canvas && p5Canvas.elt) {
    p5Canvas.style('display', 'block');
    p5Canvas.style('z-index', '0');
  }
}