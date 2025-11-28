/* script.js (최종 수정본) */
const API_KEY = "2400a3d0d18960973fb137ff6d8eb9be"; 
const DB_URL = 'https://raw.githubusercontent.com/eatpeoples/eatpeopls-location/main/menu_db.json'; 

const form = document.getElementById('recommendationForm');
const resultContainer = document.getElementById('resultContainer');

const searchFixes = {
    "해산물 스튜": "양식 맛집", "에그 베네딕트": "브런치 카페", "김밥천국 라면": "분식",
    "감바스 알 아히요": "감바스", "마카롱 10구": "마카롱", "베이컨 포테이토 피자": "피자",
    "청년다방": "차돌 떡볶이", "엽기떡볶이": "매운 떡볶이", "신전떡볶이": "떡볶이",
    "역전우동": "우동", "칸스테이크하우스": "스테이크" 
};

function checkBudget(price, budgetType) {
    const p = Number(price); 
    if (budgetType === 'Low') return p <= 10000;
    if (budgetType === 'Mid') return p > 10000 && p <= 20000;
    if (budgetType === 'High') return p > 20000;
    return false;
}

function cleanMenuName(name) {
    let cleaned = name.replace(/\(.*\)/gi, '');
    const removeWords = ["세트", "정식", "콤보", "1인", "패밀리", "미니", "반마리", "한마리", "기본", "박스"];
    removeWords.forEach(word => { cleaned = cleaned.replace(word, ''); });
    cleaned = cleaned.replace(/\d+[구개p]/gi, ''); 
    cleaned = cleaned.replace(/\+/g, ' '); 
    return cleaned.trim();
}

async function getCurrentWeather(lat, lon) {
    if (!API_KEY) return 'Clear';
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const res = await fetch(url);
        const data = await res.json();
        const id = data.weather[0].id;
        if (id >= 200 && id <= 531) return 'Rain';   
        if (id >= 600 && id <= 622) return 'Cold';   
        if (id >= 800) {
             const temp = data.main.temp;
             if (temp >= 28) return 'Hot'; 
             if (temp <= 5) return 'Cold'; 
             if (id === 800) return 'Clear';
             return 'Cloudy';
        }
        return 'Clear';
    } catch (error) { return 'Clear'; }
}

function weightedRandomSelect(menuList, weatherCondition) {
    let pool = [];
    menuList.forEach(item => {
        pool.push(item);
        if (item.Weather_Tag === weatherCondition) { pool.push(item); pool.push(item); pool.push(item); }
    });
    return pool[Math.floor(Math.random() * pool.length)];
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultContainer.innerHTML = `<div class="result"><div class="loading">⛅ 하늘의 기운과 맛집 데이터를 모으는 중...</div></div>`;
    const selectedCategory = document.getElementById('category').value;
    const selectedAge = document.getElementById('age').value;
    const selectedBudget = document.getElementById('budget').value;

    try {
        let weatherCondition = 'Clear';
        let weatherText = "";
        
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                });
                weatherCondition = await getCurrentWeather(position.coords.latitude, position.coords.longitude);
                const wLabel = { "Clear": "☀️ 맑음", "Rain": "☔ 비", "Hot": "🔥 무더위", "Cold": "❄️ 추위", "Cloudy": "☁️ 흐림" };
                weatherText = wLabel[weatherCondition] ? `(현재 날씨: ${wLabel[weatherCondition]})` : "";
            } catch (err) { console.log("GPS Timeout or Error"); }
        }

        const response = await fetch(DB_URL);
        const allMenu = await response.json();
        const filteredMenu = allMenu.filter(item => {
            return item.Category === selectedCategory && item.Recommended_Age === selectedAge && checkBudget(item.Price, selectedBudget);
        });

        if (filteredMenu.length > 0) {
            const randomPick = weightedRandomSelect(filteredMenu, weatherCondition);
            const formattedPrice = Number(randomPick.Price).toLocaleString();
            
            const ageMap = { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대+" };
            const displayAge = ageMap[randomPick.Recommended_Age] || randomPick.Recommended_Age;
            const weatherMap = { "Clear": "☀️ 맑은 날", "Rain": "☔ 비 오는 날", "Hot": "🔥 더운 날", "Cold": "❄️ 추운 날", "Cloudy": "☁️ 흐린 날" };
            const displayWeather = weatherMap[randomPick.Weather_Tag] || randomPick.Weather_Tag;
            const healthMap = { "Balanced": "🥗 균형잡힌", "High-Protein": "💪 고단백", "Diet": "light 다이어트", "Heavy": "🍖 든든한", "Sweet": "🍭 달달한" };
            const displayHealth = healthMap[randomPick.Health_Tag] || randomPick.Health_Tag;
            
            const cleanName = cleanMenuName(randomPick.Menu_Name);
            let baseKeyword = searchFixes[cleanName] || (cleanName + " 맛집");
            const searchKeyword = baseKeyword; 
            const schoolMapUrl = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent('궁동 ' + searchKeyword)}`;

            resultContainer.innerHTML = `
                <div class="result">
                    <div style="font-size: 13px; color: #666; margin-bottom: 5px;">${weatherText}</div>
                    <div style="font-size: 48px; margin-bottom: 10px;">${randomPick.Emoji}</div>
                    <h2>오늘의 추천: <span class="highlight">${randomPick.Menu_Name}</span></h2>
                    <div class="ai-comment-box">"${randomPick.AI_Comment}"</div>
                    <p>🏷️ 카테고리: ${randomPick.Category}</p>
                    <p>💰 가격: <strong>${formattedPrice}원</strong></p>
                    <div style="margin-top: 15px; margin-bottom: 15px;">
                        <span class="tag-badge">#${displayAge}픽</span>
                        <span class="tag-badge">#${displayHealth}</span>
                        <span class="tag-badge">#${displayWeather}추천</span>
                    </div>
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                    <p style="font-size:14px; font-weight:bold; margin-bottom:5px;">📍 내 주변 식당 찾기</p>
                    <div class="map-btn-group">
                        <button onclick="openMapWithGPS('NAVER', '${searchKeyword}')" class="map-btn" style="background:#03c75a; color:white;">N</button>
                        <button onclick="openMapWithGPS('KAKAO', '${searchKeyword}')" class="map-btn" style="background:#fee500; color:black;">K</button>
                        <button onclick="openMapWithGPS('GOOGLE', '${searchKeyword}')" class="map-btn btn-google">G</button>
                    </div>
                    <div class="recommend-text">
                        <span class="tip-row">🟡 <span class="tip-label">Kakao:</span> '대전' 지역 검색</span>
                        <span class="tip-row">🔵 <span class="tip-label">Google:</span> 찐맛집/리스트</span>
                        <span class="tip-row">💚 <span class="tip-label">Naver:</span> 내 위치 정확</span>
                    </div>
                    <div style="margin-top: 10px;">
                         <a href="${schoolMapUrl}" target="_blank" style="flex:1; text-decoration:none;">
                            <button class="map-btn" style="background:#fff; border:1px solid #ddd; color:#333;">🏫 충남대(궁동) 맛집 찾기</button>
                        </a>
                    </div>
                    <button onclick="shareResult('${randomPick.Menu_Name}', '${randomPick.AI_Comment}', '${formattedPrice}')" style="margin-top:20px; background:#555; color:white;">
                        📢 친구에게 공유하기
                    </button>
                </div>
            `;
        } else {
            resultContainer.innerHTML = `<div class="result"><h3>🥲 조건에 맞는 메뉴가 없어요.</h3></div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultContainer.innerHTML = `<div class="result"><p>🚨 데이터 로딩 실패!</p></div>`;
    }
});

// ✅ [핵심] 알림창 뜨는 지도 함수
function openMapWithGPS(type, keyword) {
    if (type === 'KAKAO') {
        window.open(`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent("대전 " + keyword)}`, '_blank');
        return; 
    }
    if (!navigator.geolocation) {
        alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
        fallbackMap(type, keyword);
        return;
    }
    // 🔥 여기가 핵심! 알림창 띄우기
    alert("📡 내 위치를 찾는 중입니다...\n(잠시만 기다려주세요)");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (type === 'NAVER') {
                window.open(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(keyword)}&c=${lng},${lat},15`, '_blank');
            } else if (type === 'GOOGLE') {
                // HTTPS로 수정됨!
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(keyword)}&center=${lat},${lng}`, '_blank');
            }
        },
        (error) => {
            alert(`⚠️ 위치 확인 실패! 대신 검색으로 이동합니다.`);
            fallbackMap(type, keyword);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

function fallbackMap(type, keyword) {
    if (type === 'NAVER') window.open(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent("내 주변 " + keyword)}`, '_blank');
    else if (type === 'GOOGLE') window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("내 주변 " + keyword)}`, '_blank');
    else window.open(`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent("대전 " + keyword)}`, '_blank');
}

function shareResult(menuName, comment, price) {
    const text = `[밥줘 AI]\n🍽️ 추천: ${menuName}\n💰 ${price}원\n🗣️ "${comment}"\n\n추천받기 👇`;
    const url = window.location.href;
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => alert("복사 완료!")).catch(() => alert("복사 실패"));
}
