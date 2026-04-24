# 爆走！ワイルドスピナー (Wild Spinner)

Phaser 3 + TypeScript + Tone.js + WebGL で作るブラウザ向け3D風アクションの開発中プロトタイプです。

## 開発スタック

- Phaser 3
- TypeScript (strict)
- Vite
- Tone.js (BGMシーケンス)
- GitHub Actions + GitHub Pages

## セットアップ

```bash
npm install
npm run dev
```

## 主要コマンド

```bash
npm run typecheck
npm run build
npm run preview
```

## 現在実装済み

- タイトル画面
- ステージ選択画面
- ステージ本編の最小ループ
  - 移動 / ジャンプ / 2段ジャンプ / ダッシュ
  - パリィ / 近接攻撃
  - 敵1体の巡回AI
  - チェックポイント復帰
  - ステージクリアで結果画面へ遷移
- 適応難易度ティア反映 (Tier 0-5)
- Tone.js によるBGM
  - 初回入力でアンロック
  - 探索 / 戦闘 / ボスの拍同期遷移
  - フェード制御

## 操作

- 移動: 左右キー
- ジャンプ: 上キー (2段ジャンプ対応)
- ダッシュ: Shift
- パリィ: J
- 攻撃: Z

## デプロイ

- main ブランチへ push で GitHub Pages に自動デプロイ
- Vite の base は `/wild-spinner/` を設定済み
