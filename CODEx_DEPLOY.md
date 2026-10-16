# 화이큐 배구 기록 시스템 — Codex 배포 인수인계

## 시작
1. ZIP을 압축 해제하고 Codex에서 이 프로젝트 폴더를 엽니다.
2. CODEX_PROMPT.txt 내용을 Codex에 붙여넣습니다.
3. GitHub/Cloudflare 인증이 필요하면 계정을 연결합니다.

## 현재 상태
정적 ES module 앱, package.json 의존성 없음. dist/가 실제 편집 소스입니다.
로컬 실행: npm start (Python 필요), http://localhost:8000
검증: npm test (Node 20 이상 권장). 이번 패키지 준비 시 14개 단위 테스트 통과.
현재 운영 로그인/서버 DB는 미연결입니다. server/access.js는 인증 경계만 준비되어 있으며 실제 세션 제공자가 아닙니다.
현재 Work URL: https://volleyball-match-recorder.myungsms.chatgpt.site

## 원본과 저장 데이터
ZIP은 코드와 테스트만 포함합니다. 브라우저에 저장한 실제 경기/선수 기록은 포함하지 않습니다.
volleyball-system-v2 및 구버전 volleyball-record-v1은 기존 브라우저 LocalStorage에 있으며, 운영 이전 시 명시적 가져오기 작업이 필요합니다.
실제 첨부 Excel 원본은 이 패키지에 포함되지 않습니다. definitions.js/calculations.js가 구현된 항목과 수식의 기준입니다.

## 우선 읽을 파일
- CODEX_PROMPT.txt: 실행 요청
- AUTH_HANDOFF.md: 로그인·세션·팀 접근 권한 연결
- HANDOFF.md: 기존 기능과 최신 피드백(최신 섹션이 이전 설명을 대체)
- dist/repository.js: 저장소 교체 경계
- dist/calculations.js: 보존할 원본 계산식
- dist/setting-link.js / setting-analysis.js: 유형 토스 연결과 배분 분석
- dist/roster-edit.js: 세트별 선수 포지션·순서·교환

## 배포 시 주의
기존 Work 사이트는 공개 미리보기로 유지합니다. .openai/hosting.json은 Work 전용이며 Cloudflare Wrangler 설정이 아닙니다.
GitHub와 Cloudflare 운영 리소스는 Codex에서 별도로 만들고, 서버에서 인증/권한을 확인한 다음 운영 공개합니다.
기존 tests/ui-flow.mjs는 로컬 브라우저 환경에 의존합니다. 최신 UI와 설치 환경에 맞춰 검증해야 합니다.
