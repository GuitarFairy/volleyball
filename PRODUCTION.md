# 화이큐 운영 인계

운영: https://hwaiq-volleyball.guitarfairy.workers.dev

GitHub: https://github.com/GuitarFairy/volleyball

기존 소스 기준 커밋: `e5990c9c980021741595c9509d07280b9932d54c`.
원본 ZIP을 `work/original-zip`으로 풀어 확인하고 기존 코드를 이어서 작업했습니다.
`dist/`는 실제 소스입니다. 빌드 시 지우지 마세요.
`.openai/hosting.json`과 기존 Work 사이트는 변경하지 않았습니다. `.openai/`는 운영 Git에서 제외했습니다.

## 인증과 팀 접근

GitHub OAuth authorization code + PKCE S256 + 일회용 state를 사용합니다.
GitHub 숫자 user ID를 D1 memberships 허용 목록에 대조하며, GitHub 로그인 성공만으로 팀 접근을 허용하지 않습니다.
초기 관리자: GuitarFairy (`332799345`). 모든 허용 사용자에게 팀 기록 열람·입력·삭제 권한이 있으며 전체 백업 가져오기는 관리자만 가능합니다.

세션은 8시간 절대 만료이며 D1에 토큰 SHA-256 해시만 저장합니다.
브라우저에는 `__Host-hwaiq` HttpOnly/Secure/SameSite=Lax 쿠키를 사용합니다.
비밀 값이나 로그인 토큰을 LocalStorage에 넣지 않습니다.
쓰기 요청은 Origin과 세션 CSRF 토큰을 검증합니다. 모든 관리 HTML·assets·기록 API는 Worker를 먼저 통과합니다.
공개 경로는 로그인 화면·로그인 화면 스크립트·OAuth 시작/콜백뿐입니다.
권한은 매 요청 다시 검사하며 취소 즉시 다음 API 요청이 403이 됩니다.

OAuth 앱 콜백: `https://hwaiq-volleyball.guitarfairy.workers.dev/api/auth/callback`

```powershell
node scripts/cloudflare.mjs secret bulk work/oauth-secrets.json
```

비밀 파일 형식: `{"GITHUB_CLIENT_ID":"...","GITHUB_CLIENT_SECRET":"..."}`.
`work/`와 `.dev.vars*`는 Git에서 제외됩니다. 비밀 값은 서버 secret으로만 배포합니다.
Cloudflare CLI 인증 파일도 `work/config` 아래에 두며 커밋하지 않습니다.

팀원 승인·취소는 Cloudflare 계정에 로그인한 관리자가 실행합니다. 닉네임 변경에도 숫자 ID로 권한을 유지합니다.

```powershell
node scripts/team-admin.mjs allow TeamMemberLogin
node scripts/team-admin.mjs allow AnotherAdmin admin
node scripts/team-admin.mjs revoke TeamMemberLogin
```

## 실행·검증·배포

Node.js 24 이상과 npm을 사용합니다.

```powershell
npm install --ignore-scripts
npm test
npm run test:ui
node scripts/cloudflare.mjs login
npm run db:migrate
npm run deploy
```

기존 `npm start`는 정적 파일 개발 확인용입니다. 운영 인증 확인은 반드시 Worker 경로로 합니다.
Windows 격리 환경의 네이티브 esbuild 경로 제한은 공식 esbuild-wasm을 사용하는 실행 스크립트로 해결했습니다.
`tests/browser-server.mjs`는 localhost에만 바인딩하는 메모리 SQLite/세션 주입 테스트 픽스처이며 운영 Worker에 포함되지 않습니다.

## D1 구조와 동시 저장

D1 이름: `hwaiq-volleyball`; ID: `0edd93b2-224c-4606-8959-965e2246d5b9`.
스키마는 `migrations/0001_initial.sql`에서 생성했습니다.
teams/users/memberships/sessions, players/games/game_players/sets/player_set_stats, audit를 분리합니다.
게임 JSON 원본 스냅샷도 보존하여 과거·추가 필드가 손실되지 않도록 했습니다.
세트별 roster·포지션·순서·role/courtPosition·raw·settingLinks·setNotes·과거 참가자 스냅샷을 보존합니다.
퍼센트는 저장하지 않고 기존 calculations.js에서 raw로 재계산합니다. 종료 승패는 서버에서 재검증합니다.

repository 메모리 화면에 즉시 반영하고 입력마다 저장 큐를 순서대로 전송합니다. 클릭을 debounce로 버리지 않습니다.
변경한 선수/경기만 전송하며 하나의 D1 batch에서 버전 검사·원본·정규화 행·감사 기록을 원자적으로 처리합니다.
JSON 테이블 삽입으로 선수별 개별 SQL 호출을 줄였습니다.
다른 기기가 팀 버전을 먼저 수정했다면 409로 중단하고 마지막 저장으로 덮어쓰지 않습니다.
오프라인/실패 시 자동 저장 완료로 표시하지 않으며 미저장 메모리를 백업할 수 있습니다.
생성·완료·화면 이동은 저장 큐 완료를 기다립니다. 저장 중 창을 닫으면 브라우저 확인을 표시합니다.

## 기존 브라우저 기록을 가져오기

기존 데이터는 ZIP에 없습니다. 원래 데이터를 저장했던 **같은 브라우저·프로필·데모 주소**에서 다음을 수행합니다.

1. `scripts/export-legacy.txt`의 읽기 전용 스니펫을 해당 데모 페이지 개발자 도구 Console에서 실행하여 원본 JSON을 다운로드합니다.
2. 백업을 별도로 보관하고 운영 서비스에 본인 계정으로 로그인합니다.
3. 관리자 화면 아래의 **백업 다운로드**로 현재 서버 기록부터 보관합니다.
4. **백업 가져오기**에서 파일을 선택하고 경기/선수 수를 확인합니다. 본인 GitHub 로그인명을 입력한 뒤 명시적으로 교체를 확인합니다.
5. 가져오기는 **현재 팀 전체를 교체**합니다. 자동 병합하지 않습니다. 기존/운영 양쪽에 기록이 있다면 먼저 합친 백업을 검토해야 합니다.

v2 원본·운영 백업·v1 원본 export를 받습니다. v1은 기존 repository 마이그레이션을 사용합니다.
원본 LocalStorage를 변경하거나 삭제하지 않습니다. 브라우저 origin 제한으로 운영 주소에서 옛 Work 주소의 LocalStorage를 직접 읽을 수 없습니다.

## 백업과 복구

평소 화면의 **백업 다운로드**는 현재 미저장 상태까지 포함합니다. 반드시 **서버 저장 완료**를 확인한 뒤 운영 백업으로 보관하세요.
`GET /api/backup`은 인증된 서버의 일관된 revision과 원본 raw를 반환합니다.
JSON 복구는 관리자 **백업 가져오기**를 사용하며 가져오기 직전 백업도 다운로드합니다.

DB 전체 SQL 백업은 비공개 경로에서 실행합니다.

```powershell
New-Item -ItemType Directory backups -Force
node scripts/cloudflare.mjs d1 export hwaiq-volleyball --remote --output backups/hwaiq.sql
```

재해 복구는 Cloudflare D1 Time Travel에서 복구 시점을 확인한 후 진행합니다.
현재 복구 전 SQL 백업을 보관하고 모든 기록원의 입력을 멈춘 뒤 실행하세요.

```powershell
node scripts/cloudflare.mjs d1 time-travel info hwaiq-volleyball --timestamp 2026-10-16T13:00:00Z
node scripts/cloudflare.mjs d1 time-travel restore hwaiq-volleyball --timestamp 2026-10-16T13:00:00Z
node scripts/cloudflare.mjs d1 execute hwaiq-volleyball --remote --command "DELETE FROM sessions; DELETE FROM oauth_states;"
```

위 시각은 예시입니다. 실제 복구 시각으로 바꾸고 허용 목록도 복구 후 재검토합니다. 이전 세션을 재사용하지 않도록 전체 로그아웃합니다.
JSON 복구는 비파괴 테스트 DB에서 왕복 검증했습니다. 실제 운영 DB를 과거 시점으로 돌리는 파괴적 복구는 실행하지 않았습니다.

## 제한사항

- 실시간 다중 기록원 병합은 없습니다. 한 팀의 동시 수정은 버전 충돌로 명확히 거부합니다. 충돌 시 미저장 백업을 보관한 뒤 새로고침하여 차이를 재적용하세요.
- 기록 화면은 다른 기기의 수정을 자동으로 덮어받지 않습니다. 저장 완료 후 다시 열거나 새로고침하면 최신 기록을 가져옵니다. 관리 화면은 포커스 복귀 시 변경 여부를 확인합니다.
- 오프라인 서버 저장은 지원하지 않습니다. 미저장 메모리는 창을 닫으면 사라지므로 실패 시 반드시 백업하세요.
- 로그인 제공자는 GitHub입니다. 팀원도 GitHub 계정과 관리자의 승인이 필요합니다.
- JSON 요청은 8MiB까지이며 단일 D1 행 제한 때문에 매우 큰 개별 경기는 별도 분할이 필요할 수 있습니다. 초과 시 전체 트랜잭션을 실패시키고 기존 데이터를 유지합니다.
- 자동 GitHub→Cloudflare 연속 배포는 아직 연결하지 않았습니다. 위 명령으로 검증 후 배포합니다.
- 기존 사용자 기록 가져오기와 실제 다른 물리 기기의 로그인 확인은 사용자의 원본 브라우저·기기에서 진행해야 합니다.

기술 근거: [Worker 우선 라우팅](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [D1 batch 원자성](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [D1 한도](https://developers.cloudflare.com/d1/platform/limits/), [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
