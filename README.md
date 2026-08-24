# atnhub

学校向け出席管理プラットフォーム

## 概要

- **ドメイン**: atnhub.ryopc.org
- **フロントエンド**: Vite + React + TypeScript + Tailwind CSS
- **バックエンド**: Cloudflare Pages Functions + Hono + D1
- **認証**: ID/パスワード（adminはメール/パスワード）
- **マルチテナント**: school_id で学校ごとに分離
- **リアルタイム**: 未実装（手動更新）

## 主な機能（出席管理中心）

1. **認証システム**
   - 管理者: メール/パスワード
   - 教師・生徒: ログインID/パスワード + school_id

2. **学校管理（管理者のみ）**
   - 学校の作成・一覧取得

3. **ユーザー管理**
   - 教師・生徒の作成・一覧取得

4. **出席管理（コア機能）**
   - 出席/欠席/遅刻/早退の記録
   - 日付・ユーザーごとの検索・集計
   - 手動更新による確実な記録

5. **チャット機能（補助機能）**
   - ルームタイプ: クラス、学年、部活、職員室、DM
   - メッセージの送信・履歴取得

## セットアップ

### 必要条件

- Node.js 20+
- Cloudflare アカウント
- Wrangler CLI

### インストール

```bash
npm install
```

### 開発サーバー起動

フロントエンド:
```bash
npm run dev
```

バックエンド (Pages Functions ローカル開発):
```bash
npx wrangler pages dev dist --binding DB=atnhub
```

### データベースセットアップ

1. D1データベースを作成:
```bash
npx wrangler d1 create atnhub-db
```

2. `wrangler.jsonc` の `database_id` を更新

3. マイグレーション実行:
```bash
npx wrangler d1 migrations apply atnhub-db --local
npx wrangler d1 migrations apply atnhub-db --remote
```

### デプロイ

```bash
npm run deploy
```

## プロジェクト構造

```
atnhub/
├── functions/           # Cloudflare Pages Functions (API)
│   ├── api/             # 個別ルートファイル方式
│   │   ├── auth/
│   │   ├── admin/
│   │   └── schools/
│   └── hello.ts         # テスト用エンドポイント
├── migrations/          # D1 マイグレーションファイル
├── public/              # 静的アセット
├── src/                 # フロントエンドソース
│   ├── components/      # React コンポーネント
│   ├── pages/           # ページコンポーネント
│   ├── hooks/           # カスタムフック
│   ├── utils/           # ユーティリティ
│   ├── types/           # TypeScript 型定義
│   ├── App.tsx          # ルーティング
│   ├── main.tsx         # エントリーポイント
│   └── index.css        # Tailwind インポート
├── index.html           # HTML テンプレート
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── wrangler.jsonc       # Cloudflare 設定
```

## API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン

### 管理者
- `GET /api/admin/schools` - 学校一覧
- `POST /api/admin/schools` - 学校作成

### 学校共通
- `GET /api/schools/:schoolId/users` - ユーザー一覧
- `POST /api/schools/:schoolId/users` - ユーザー作成
- `GET /api/schools/:schoolId/attendance` - 出席記録取得
- `POST /api/schools/:schoolId/attendance` - 出席記録作成/更新

### チャット（補助機能）
- `GET /api/schools/:schoolId/chat/rooms` - ルーム一覧
- `POST /api/schools/:schoolId/chat/rooms` - ルーム作成
- `GET /api/schools/:schoolId/chat/rooms/:roomId/messages` - メッセージ取得
- `POST /api/schools/:schoolId/chat/rooms/:roomId/messages` - メッセージ送信

### ヘルスチェック
- `GET /api/health` - ヘルスチェック

## 環境変数

`wrangler.jsonc` で設定:
- `DB` - D1 データベースバインディング
- `ENVIRONMENT` - 環境名 (development/production)

## ライセンス

MIT
