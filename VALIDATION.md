# 검증 결과

- `npm test`: 24개 통과.
- `npm run test:ui`: 최신 12명 등록/코트9·대기3, AL/AM 공격수 선택/자기 제외/포지션 배지/강조/우클릭/Undo, 두 세트 독립 포지션·메모, 50회 연속 입력, 종료·전적·통계·조회 잠금 통과.
- 실제 Chromium localhost 격리 픽스처: 좌/우클릭·Undo, 공격수 P 연동, 50회 입력, 서버 저장 완료, 새로고침 후 raw·메모 복원과 기록표 화면 확인.
- 서버 SQLite/D1 계약 테스트: 비로그인 차단, 비허용 403, CSRF, 만료, 로그아웃, OAuth PKCE/state/세션 재발급/계정 전환, 원자적 롤백, stale revision 409, 별도 세션 복원, 백업 가져오기 왕복, 과거 명단·raw·settingLinks·setNotes 및 soft delete 보존.
- 실제 Cloudflare 배포에서 `/`, `/index.html`, `/record.html`, `/repository.js` 비로그인 302 로그인 이동, `/api/data`·`/api/backup` 401, `/login` 200 확인.
- 실제 D1 마이그레이션과 운영 초기 SQL 백업 export 성공. 사용자 경기 데이터는 아직 가져오지 않음.
- GitHub Actions 최초 소스 검증 성공: https://github.com/GuitarFairy/volleyball/actions/runs/38907759924

## 아직 사용자 연결이 필요한 항목

GitHub OAuth 앱 등록 양식을 준비했으며 Client ID/secret 입력을 기다리는 상태입니다.
현재 `/api/auth/login`은 설정 미완료 시 503으로 거부합니다. 운영 기록을 인증 없이 공개하지 않습니다.
계정 소유자가 OAuth 앱 등록·secret 발급을 완료하고 로컬 `work/oauth-secrets.json`에 저장한 후 Cloudflare secret으로 등록해야 합니다.
그 후 실제 GitHub 로그인 콜백·관리자 진입을 운영 URL에서 최종 확인해야 합니다.
비허용 실제 별도 계정 로그인과 물리적으로 다른 기기에서의 테스트는 해당 계정/기기를 사용자가 준비해야 합니다. 서버 계약은 격리 세션으로 검증했습니다.

기존 Work 사이트와 원본 LocalStorage는 수정·삭제하지 않았습니다.
