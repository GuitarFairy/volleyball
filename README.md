# 화이큐 9인제 배구 기록

[운영 서비스](https://hwaiq-volleyball.guitarfairy.workers.dev) · [운영·인증·백업 안내](PRODUCTION.md)

기존 Excel형 기록표와 디자인을 유지한 Cloudflare Worker + 정적 assets + D1 서비스입니다.
GitHub OAuth와 서버 세션으로 로그인하며 화이큐 허용 목록에 등록된 계정만 기록을 읽고 입력할 수 있습니다.

`dist/`는 실제 소스입니다. 빌드 산출물로 보고 삭제하지 마세요.
기존 Work 사이트와 `.openai/hosting.json`은 운영 배포와 분리되어 있습니다.

```sh
npm ci --ignore-scripts
npm test
npm run test:ui
node scripts/cloudflare.mjs login
npm run db:migrate
npm run deploy
```

Node.js 24 이상이 필요합니다. 서버 비밀 값과 브라우저 기록은 Git에 넣지 않습니다.
기존 기록은 로그인 후 백업 파일을 선택하고 본인 확인·명시적 가져오기 승인을 거쳐 이전합니다.
