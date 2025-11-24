# デイリーレポート Webアプリ  
日々の気分・HP/MP・時報ログ（Hourly Report）を手軽に記録できる、軽量なWebアプリです。  
**HTML / CSS / JavaScript + PHP + Google Apps Script (GAS)** を利用し、データはすべて **Googleスプレッドシート** に保存されます。

[デモページはこちら](https://www.laboratomie.com/daily-report/)

---

## 📌 概要

このアプリは、「スマホを開いたら、すぐ書ける日報」を目指して開発されました。

主な特徴：

- 📝 毎日の記録（Daily Report）
- 🕒 時報ログ（Hourly Report）
- 📊 Googleスプレッドシートに自動保存
- 📱 スマホ最適化された軽量UI
- 🔒 PHPによる安全な中継（CORS対策）
- 🌙 深夜3時を基準にした “日付リセット” ロジック
- 🏠 ホーム画面追加（PWA準備済み）

---

## 🧩 技術構成

| レイヤー | 技術 | 役割 |
|---------|------|------|
| フロントエンド | HTML / CSS / JavaScript | 入力フォーム、画面表示 |
| バックエンド中継 | PHP (relay.php) | GASへのPOST中継、CORS対策、安全性 |
| データ保存 | Google Spreadsheet | Daily / Hourly のデータ保存 |
| バックエンド処理 | Google Apps Script | POST受信、appendRow、日付区切り処理 |
| その他 | manifest.json、アイコン類 | スマホのホーム画面対応 |

---

## 📂 ディレクトリ構成
├── php/

│ └── relay.php

├── daily-report/

│ ├── index.html

│ ├── style.css

│ ├── script.js

│ ├── manifest.json

│ ├── favicon-16.png

│ └── favicon-32.png

└── gas/

  └── daily_report.gs


---

## 🗄️ スプレッドシート構造

### DailyReport シート

| Timestamp | HP | MP | Mood | Memo |
|-----------|----|----|------|------|

### HourlyReport シート

| Timestamp | Hour | HP | MP | Mood | Memo |
|-----------|------|----|----|------|------|

※ シートは **初回アクセス時に自動で作成** されます。

---

## 🚀 セットアップ手順

### 1. Googleスプレッドシートの準備
1. 新しいスプレッドシートを作成  
2. URLをコピー  
3. `/d/` と `/edit` の間にあるIDを控える

---

### 2. Google Apps Script（GAS）の準備
1. スプレッドシート → **拡張機能** → **Apps Script** を開く  
2. `daily_report.gs` の内容を貼り付ける  
3. **Webアプリとしてデプロイ**  
4. 設定  
   - 実行ユーザー：**自分（または全員）**  
   - アクセス権：**全員（匿名含む）**  
5. WebアプリのURLをコピーする

---

### 3. relay.php の設定

php

$gas_url = "ここにGASのWebアプリURLを入れる";'

※ relay.php は必ず HTTPSで動くサーバー にアップロードしてください。

---

### 4. フロントエンドの配置

index.html

style.css

script.js

manifest.json

favicon 画像類

script.js 内の relay.php のパスを、自分のサーバー環境に合わせて修正してください。

## 🌙 深夜3時の“日付リセット”仕様

デイリーレポートは 3:00 AM を1日の境界 として扱います。

理由：

夜型の人でも自然な区切りになる

0時直後の記録が「前日扱い」にならない

日付を跨いだ活動にも柔軟に対応できる

この判定ロジックは GAS 側で実装されています。

## 🛠️ 開発メモ（トラブルシュート）
### ✔ 1. 404エラー

原因： relay.php のパスがずれていた
解決： 絶対パスに修正

### ✔ 2. GASの “unknown error”

原因： スプレッドシート権限不足
解決： doPost() を一度手動実行して権限を付与

### ✔ 3. 時報（Hourly）が保存されない

原因： payload の type 判定ミス
解決： JSON構造を修正

### ✔ 4. 3時跨ぎで日付がズレる

原因： formatDate のフォーマット統一不足
解決： JST固定でフォーマットを統一

## 🔮 今後のアップデート予定

スプレッドシートURL → ID 自動抽出機能

HP/MP のバー表示など UI強化

分析画面（グラフ）

月次まとめの自動生成

他アプリ（Goal Planner / Reflector など）との連携


## 🤝 コントリビュートについて

Issue / Pull Request 歓迎します！

バグ報告

改善提案

新機能リクエスト

どなたでも気軽にどうぞ。


## 📄 ライセンス

MIT License（予定）

## 💬 制作者

LaboratoMie

日々の生活を少しだけ軽くする、小さなWebアプリを制作しています。

[Website](https://www.laboratomie.com/) / [note](https://note.com/kayochang38) / [X(Twitter)](https://x.com/kayochang38)
