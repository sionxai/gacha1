#gacha1

🎲 웹 기반 가챠 시스템을 갖춘 RPG 게임입니다. Firebase를 이용한 실시간 멀티플레이어 환경에서 장비 수집, 캐릭터 육성, PvP 전투를 즐길 수 있습니다.

## 🎮 주요 기능

### 가챠 시스템
- **장비 뽑기**: SSS+부터 D등급까지 8단계 장비
- **캐릭터 뽑기**: 5개 클래스별 고유 캐릭터
- **펫 시스템**: 다양한 능력치 버프를 제공하는 펫
- **확률 조정**: 관리자 권한으로 뽑기 확률 커스터마이징

### 전투 시스템
- **PvE 전투**: 레벨별 몬스터와의 전투
- **PvP 시스템**: 실시간 플레이어 간 대전
- **장비 강화**: 강화권과 보호권을 이용한 장비 업그레이드
- **전투 시뮬레이션**: 자동/수동 전투 모드

### 소셜 기능
- **실시간 채팅**: 전체 채팅 및 시스템 메시지
- **우편함**: 플레이어 간 아이템 교환
- **랭킹 시스템**: PvP 등급 및 전투력 순위

## 🚀 빠른 시작

### 필요 환경
- 웹 브라우저 (Chrome, Firefox, Safari 권장)
- 인터넷 연결

### 로컬 개발 환경
1. **저장소 클론**
   ```bash
   git clone [repository-url]
   cd gacha
   ```

2. **Firebase 설정**
   - `firebase.js`에서 Firebase 설정 확인
   - Firebase 프로젝트 연결 필요

3. **서버 실행**
   ```bash
   # 간단한 HTTP 서버 실행
   python -m http.server 8000
   # 또는
   npx serve .
   ```

4. **접속**
   - 브라우저에서 `http://localhost:8000` 접속
   - 회원가입 또는 로그인

## 📁 프로젝트 구조

```
├── index.html              # 메인 페이지 (가챠, 장비, 상점)
├── login.html              # 로그인 페이지
├── signup.html             # 회원가입 페이지
├── battle.html             # 전투 페이지
├── pvp.html               # PvP 페이지
├── styles.css             # 메인 스타일시트
│
├── app.js                 # 메인 게임 로직
├── constants.js           # 게임 상수 및 설정값
├── gacha-system.js        # 가챠 시스템 로직
├── ui-utils.js            # UI 유틸리티 함수
├── combat-core.js         # 전투 시스템 코어
├── auth.js                # 인증 시스템
├── firebase.js            # Firebase 설정
├── navigation.js          # 네비게이션 및 채팅
├── mailbox.js             # 우편함 시스템
├── chat.js                # 채팅 시스템
│
├── functions/             # Firebase Cloud Functions
├── assets/                # 게임 이미지 및 리소스
└── tests/                 # 테스트 파일
```

## 🎯 핵심 모듈 설명

### `app.js` - 메인 게임 로직
- 가챠 실행 및 결과 처리
- 장비 관리 및 강화
- 상점 및 포인트 시스템
- 사용자 프로필 관리

### `constants.js` - 게임 설정
- 티어별 확률 및 수치
- 기본 드롭률 및 가격 설정
- 몬스터 스케일링 공식
- 각종 게임 상수

### `gacha-system.js` - 뽑기 시스템
- 확률 기반 티어 선택
- 장비/캐릭터별 스탯 생성
- 전설 등급 판별 로직
- 통계 계산 함수

### `combat-core.js` - 전투 시스템
- 플레이어/몬스터 스탯 계산
- 데미지 공식 및 전투 로직
- 장비 효과 적용
- 캐릭터 능력치 관리

## 🔧 개발 가이드

### 코딩 규칙
- **함수명**: camelCase (예: `drawGacha`, `updateInventory`)
- **상수명**: UPPER_SNAKE_CASE (예: `TIERS`, `DEFAULT_DROP_RATES`)
- **파일명**: kebab-case (예: `gacha-system.js`)

### 테스트 실행
```bash
# 단위 테스트
node tests/constants.test.js
node tests/gacha-system.test.js

# 전체 테스트 (package.json 설정 시)
npm test
```

### 디버깅 팁
1. **브라우저 콘솔**에서 `state` 객체로 게임 상태 확인
2. **Firebase 연결 확인**: `auth.currentUser` 체크
3. **가챠 확률 확인**: `state.config.probs` 객체 확인
4. **장비 정보 확인**: `state.equip` 및 `state.spares` 확인

## 🐛 알려진 이슈

### 팝업 표시 문제
- **증상**: 전설 장비 획득 시 팝업이 외부창 또는 화면 중앙에 다르게 표시됨
- **원인**: 브라우저 팝업 차단 정책
- **해결**: 브라우저 설정에서 팝업 허용 또는 시크릿 모드 사용

### 계정 연결 문제
- **증상**: 로그인 후 즉시 로그아웃되거나 프로필 로드 실패
- **원인**: Firebase 설정 또는 브라우저 캐시
- **해결**: 브라우저 캐시 삭제 후 재시도

## 🤝 기여하기

1. 이슈 보고 또는 기능 제안
2. 포크 후 기능 브랜치 생성
3. 변경사항 커밋 (커밋 메시지 규칙 참고)
4. 풀 리퀘스트 생성

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
docs: 문서 수정
test: 테스트 추가
style: 코드 스타일 변경
```

## 📄 라이선스

이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.

