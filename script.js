/* script.js - GPS 디버깅 & URL 수정 버전 */

// ✅ 사용자 API 키
const API_KEY = "2400a3d0d18960973fb137ff6d8eb9be"; 

// GitHub 데이터 URL
const DB_URL = 'https://raw.githubusercontent.com/eatpeoples/eatpeopls-location/main/menu_db.json'; 

const form = document.getElementById('recommendationForm');
const resultContainer = document.getElementById('resultContainer');

// 검색어 보정 사전
const searchFixes = {
    "해산물 스튜": "양식 맛집",
    "에그 베네딕트": "브런치 카페",
    "김밥천국 라면": "분식",
    "감바스 알 아히요": "감바스",
    "마카롱 10구": "마카롱",
    "베이컨 포테이토 피자": "피자",
    "청년다방": "차돌 떡볶이",
    "엽기떡볶이": "매운 떡볶이",
    "신전떡볶이": "떡볶이",
    "역전우동": "우동",
    "칸스테이크하우스": "스테이크" 
};

// 예산 체크
function checkBudget(price, budgetType) {
    const p = Number(price); 
    if (budgetType === 'Low') return p <= 10000;
    if (budgetType === 'Mid') return p > 10000 && p <= 20000;
    if (budgetType === 'High') return p > 20000;
    return false;
}

// 메뉴명 정리
function cleanMenuName(name) {
    let cleaned = name.replace(/\(.*\)/gi, '');
    const removeWords = ["세트", "정식", "콤보", "1인", "패밀리", "미니", "반마리", "한마리", "기본", "박스"];
    removeWords.forEach(word => { cleaned = cleaned.replace(word, ''); });
    cleaned = cleaned.replace(/\d+[구개p]/gi, ''); 
    cleaned = cleaned.replace(/\+/g, ' '); 
    return cleaned.trim();
}

// 날씨 가져오기
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
    } catch (error) {
        return 'Clear';
    }
}

// 가중치 랜덤 선택
function weightedRandomSelect(menuList, weatherCondition) {
    let pool = [];
    menuList.forEach(item => {
        pool.push(item);
        if (item.Weather_Tag === weatherCondition) {
            pool.push(item);
            pool.push(item);
            pool.push(item);
        }
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
        
        // 날씨용 GPS 호출 (조용히 시도)
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }); // 3초 타임아웃
                });
                weatherCondition = await getCurrentWeather(position.coords.latitude, position.coords.longitude);
                const wLabel = { "Clear": "☀️ 맑음", "Rain": "☔ 비", "Hot": "🔥 무더위", "Cold": "❄️ 추위", "Cloudy": "☁️ 흐림" };
                weatherText = wLabel[weatherCondition] ? `(현재 날씨: ${wLabel[weatherCondition]})` : "";
            } catch (err) {
                console.log("날씨 로딩 중 GPS 실패 (기본값 사용)");
            }
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

// ✅ [핵심 수정] 지도 버튼 클릭 시 실행되는 함수
function openMapWithGPS(type, keyword) {
    // 1. 카카오맵은 GPS 없이 바로 실행
    if (type === 'KAKAO') {
        window.open(`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent("대전 " + keyword)}`, '_blank');
        return; 
    }

    // 2. 브라우저 GPS 지원 여부 확인
    if (!navigator.geolocation) {
        alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
        fallbackMap(type, keyword);
        return;
    }

    // 3. 사용자에게 진행 상황 알림 (먹통 방지용)
    alert("📡 내 위치를 찾는 중입니다...\n(잠시만 기다려주세요)");

    // 4. GPS 요청 (옵션 추가: 정확도 높임, 5초 타임아웃)
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // ✅ 성공 시 알림 (디버깅용) -> 나중에 삭제 가능
            // alert("위치 찾기 성공! 지도를 엽니다."); 

            if (type === 'NAVER') {
                const url = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(keyword)}&c=${lng},${lat},15`;
                window.open(url, '_blank');
            } else if (type === 'GOOGLE') {
                // ✅ [수정] 구글맵 URL HTTPS 표준으로 변경
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(keyword)}&center=${lat},${lng}`;
                window.open(url, '_blank');
            }
        },
        (error) => {
            // 🚨 실패 시 원인 알려주기
            let msg = "위치 확인 실패";
            if (error.code === 1) msg = "위치 정보 허용이 차단되었습니다.\n설정에서 허용해주세요.";
            else if (error.code === 2) msg = "위치를 감지할 수 없습니다. (GPS 신호 약함)";
            else if (error.code === 3) msg = "시간이 초과되었습니다.";
            
            alert(`⚠️ ${msg}\n대신 키워드로 검색합니다.`);
            fallbackMap(type, keyword);
        },
        {
            enableHighAccuracy: true, // 정확도 우선
            timeout: 5000,            // 5초 안에 못 찾으면 포기
            maximumAge: 0             // 캐시된 위치 쓰지 않음
        }
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
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => alert("복사 완료! 카톡에 붙여넣으세요.")).catch(() => alert("복사 실패"));
}
