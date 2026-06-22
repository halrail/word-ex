let allWords = [];
let testWords = [];
let currentIndex = 0;
let correctCount = 0;
let isReviewPhase = false;
let currentJsonFile = "";

function getFavorites() {
    const favs = localStorage.getItem('word_stage_favs');
    return favs ? JSON.parse(favs) : [];
}

function saveFavorites(favs) {
    localStorage.setItem('word_stage_favs', JSON.stringify(favs));
}

// 最初に目次（menu.json）を読み込んでセレクトボックスを自動生成
async function loadMenuAndInit() {
    try {
        const response = await fetch('json/menu.json');
        const menuItems = await response.json();
        
        const stageSelect = document.getElementById('stage-select');
        const listStageSelect = document.getElementById('list-stage-select');
        
        stageSelect.innerHTML = "";
        listStageSelect.innerHTML = "";
        
        menuItems.forEach(item => {
            const opt1 = document.createElement('option');
            opt1.value = item.file;
            opt1.innerText = item.title;
            stageSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = item.file;
            opt2.innerText = item.title;
            listStageSelect.appendChild(opt2);
        });
        
        if (menuItems.length > 0) {
            loadGameData(menuItems[0].file);
        }
    } catch (error) {
        alert("目次（menu.json）の読み込みに失敗したぜ、ブラザー");
    }
}

async function loadGameData(jsonFile) {
    currentJsonFile = jsonFile;
    try {
        const response = await fetch(jsonFile);
        allWords = await response.json();
        
        updateFavMenuButton();
        renderWordList();
    } catch (error) {
        alert("データのロードに失敗しましたYO: " + jsonFile);
    }
}

function updateFavMenuButton() {
    const favs = getFavorites();
    const currentFavWords = allWords.filter(item => favs.includes(item.word));
    const favBtn = document.getElementById('btn-fav-mode');
    
    if (currentFavWords.length === 0) {
        favBtn.style.opacity = "0.4";
        favBtn.style.pointerEvents = "none";
        document.querySelector('#btn-fav-mode .mode-desc').innerText = "この範囲にお気に入りは未登録です";
    } else {
        favBtn.style.opacity = "1";
        favBtn.style.pointerEvents = "auto";
        document.querySelector('#btn-fav-mode .mode-desc').innerText = "お気に入り（★）だけで完答特訓する";
    }
}

function startGame(mode) {
    const favs = getFavorites();
    if (mode === 'fav') {
        testWords = allWords.filter(item => favs.includes(item.word));
    } else {
        testWords = [...allWords];
    }

    if (testWords.length === 0) return;
    
    // カウントやインデックスを初期化（リロードなしで周回するためのリセット）
    currentIndex = 0;
    correctCount = 0;
    
    testWords.sort(() => Math.random() - 0.5);

    document.getElementById('select-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('total-q').innerText = testWords.length;
    
    showQuestion();
}

function showQuestion() {
    if (currentIndex >= testWords.length) {
        showResult();
        return;
    }
    
    isReviewPhase = false;
    
    document.getElementById('current-q').innerText = currentIndex + 1;
    document.getElementById('review-container').style.display = 'none';
    document.getElementById('judge-overlay').className = "";
    
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.innerText = "ENTER";
    submitBtn.classList.remove('next-phase');
    
    const inputEl = document.getElementById('user-input');
    inputEl.value = "";
    inputEl.readOnly = false;
    inputEl.focus();
    
    const currentData = testWords[currentIndex];

    if (currentData.sentence) {
    // 英文（穴あき）と日本語訳を改行（\n）でセットにして表示！
        document.getElementById('meaning-display').innerText = currentData.sentence + "\n\n（意味: " + currentData.meaning + "）";
    } else {
    // 万が一 sentence が無いデータの場合は日本語だけを出す安全弁
        document.getElementById('meaning-display').innerText = currentData.meaning;
    }
    const favs = getFavorites();
    const favBtn = document.getElementById('btn-fav');
    if (favs.includes(currentData.word)) {
        favBtn.classList.add('active');
    } else {
        favBtn.classList.remove('active');
    }
}

function handleFavToggle() {
    const currentWord = testWords[currentIndex].word;
    toggleFavoriteStatus(currentWord);
    
    const favs = getFavorites();
    const favBtn = document.getElementById('btn-fav');
    if (favs.includes(currentWord)) {
        favBtn.classList.add('active');
    } else {
        favBtn.classList.remove('active');
    }
}

function toggleFavoriteStatus(word) {
    let favs = getFavorites();
    if (favs.includes(word)) {
        favs = favs.filter(w => w !== word);
    } else {
        favs.push(word);
    }
    saveFavorites(favs);
    updateFavMenuButton();
}

function renderWordList() {
    const container = document.getElementById('word-list-container');
    container.innerHTML = "";
    const favs = getFavorites();

    allWords.forEach(item => {
        // ⭐ リスト画面でもカッコを消さずに、データに入っている文章（または単語）をそのまま綺麗に出すぜ
        const displayPhrase = item.sentence ? item.sentence : item.word;
        const isFav = favs.includes(item.word);

        const itemEl = document.createElement('div');
        itemEl.className = "word-item";
        itemEl.innerHTML = `
            <div class="word-info">
                <div class="word-eng">${displayPhrase}</div>
                <div class="word-jpn">${item.meaning}</div>
            </div>
            <button class="list-fav-btn ${isFav ? 'active' : ''}">★</button>
        `;

        itemEl.querySelector('.list-fav-btn').addEventListener('click', (e) => {
            toggleFavoriteStatus(item.word);
            e.target.classList.toggle('active');
        });

        container.appendChild(itemEl);
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isReviewPhase) {
        currentIndex++;
        showQuestion();
        return;
    }
    
    const inputEl = document.getElementById('user-input');
    const userInput = inputEl.value.trim().toLowerCase();
    
    const currentData = testWords[currentIndex];
    
    // ⭐【ここが最大のハック！】
    // 出題文に [ _ _ _ ] が入っていても、ユーザーが入力して判定する正解は
    // 常に「item.word（ピュアな単語/フレーズ単体）」になるように固定したぜ！
    const correctAnswer = currentData.word.trim().toLowerCase();
    
    const overlay = document.getElementById('judge-overlay');
    const statusEl = document.getElementById('review-status');
    const userDisplayEl = document.getElementById('review-user');
    
    if (userInput === correctAnswer) {
        correctCount++;
        overlay.className = "correct-flash";
        statusEl.innerText = "⭕ CORRECT";
        statusEl.className = "status-correct";
        userDisplayEl.style.color = "#00ffcc";
    } else {
        overlay.className = "wrong-flash";
        statusEl.innerText = "❌ WRONG";
        statusEl.className = "status-wrong";
        userDisplayEl.style.color = "#ff007f";
    }
    
    document.getElementById('review-correct').innerText = correctAnswer;
    userDisplayEl.innerText = userInput || "(空欄)";
    document.getElementById('review-container').style.display = 'flex';
    
    isReviewPhase = true;
    inputEl.readOnly = true;
    
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.innerText = "NEXT STAGE";
    submitBtn.classList.add('next-phase');
    submitBtn.focus();
}

function showResult() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    const accuracy = Math.round((correctCount / testWords.length) * 100);
    document.getElementById('accuracy').innerText = accuracy;
    document.getElementById('correct-count').innerText = correctCount;
    document.getElementById('total-count').innerText = testWords.length;

    const rankEl = document.getElementById('rank');
    if (accuracy === 100) { rankEl.innerText = "SSS"; rankEl.style.color = "#ffff00"; }
    else if (accuracy >= 90) { rankEl.innerText = "S"; rankEl.style.color = "#ff007f"; }
    else if (accuracy >= 75) { rankEl.innerText = "A"; rankEl.style.color = "#00ffcc"; }
    else if (accuracy >= 50) { rankEl.innerText = "B"; rankEl.style.color = "#ffffff"; }
    else { rankEl.innerText = "C"; rankEl.style.color = "#888888"; }
}

// 🔥 【新機能】リロードせずにタイトル（選択画面）に帰還する
function backToTitle() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('select-screen').style.display = 'block';
    // 今選ばれているセレクトボックスの状態を維持したまま、メニューのお気に入りボタン等を再計算
    loadGameData(document.getElementById('stage-select').value);
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    if (viewName === 'game') {
        document.getElementById('select-screen').style.display = 'block';
        document.getElementById('nav-home-btn').classList.add('active');
        loadGameData(document.getElementById('stage-select').value);
    } else if (viewName === 'list') {
        document.getElementById('list-screen').style.display = 'block';
        document.getElementById('nav-list-btn').classList.add('active');
        loadGameData(document.getElementById('list-stage-select').value);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadMenuAndInit();

    const stageSelect = document.getElementById('stage-select');
    const listStageSelect = document.getElementById('list-stage-select');

    stageSelect.addEventListener('change', (e) => {
        listStageSelect.value = e.target.value;
        loadGameData(e.target.value);
    });
    listStageSelect.addEventListener('change', (e) => {
        stageSelect.value = e.target.value;
        loadGameData(e.target.value);
    });

    document.getElementById('nav-home-btn').addEventListener('click', () => switchView('game'));
    document.getElementById('nav-list-btn').addEventListener('click', () => switchView('list'));

    document.getElementById('btn-all-mode').addEventListener('click', () => startGame('all'));
    document.getElementById('btn-fav-mode').addEventListener('click', () => startGame('fav'));
    document.getElementById('btn-fav').addEventListener('click', handleFavToggle);
    document.getElementById('answer-form').addEventListener('submit', handleFormSubmit);
});