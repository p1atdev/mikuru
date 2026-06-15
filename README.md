# Mikuru

有力なサイトに絞ってユーザー名の存在を調べる、Bun製のCLIです。サイトごとの取得方法と判定ルールは [`sites.yaml`](./sites.yaml) に定義します。

## Usage

```bash
bun index.ts sherlock-project
bun index.ts --site github --format json sherlock-project
bun index.ts --format jsonl alice bob
bun index.ts --all alice
```

出力形式は `text`、`json`、`jsonl` に対応しています。既定ではアカウントが見つかったサイトだけを `results` に含めます。未検出・無効なユーザー名・判定不能・通信エラーも確認する場合は `--all` を指定します。

ステータスは、アカウントが見つかった場合は `found`、未検出の場合は `not_found` です。`not_found` はユーザー名を新規登録できることまでは保証しません。

## Commands

```bash
bun test
bun run typecheck
bun run build
bun run verify-sites --format json
```

`bun run build` は `dist/mikuru` に単一実行ファイルを生成します。

Codex用のプロジェクトローカルスキルは
`.agents/skills/mikuru/SKILL.md` にあります。スキルはこの実行ファイルを
JSONモードで呼び出します。

実サイトを使うテストは通常のテストから分離しています。

```bash
bun run test:live
```

無効化したサイトも含めて状態を調べる場合は
`bun run verify-sites --include-disabled` を使います。

## Site Manifest

```yaml
version: 1
sites:
  - id: example
    name: Example
    profileUrl: https://example.com/{username}
    request:
      method: HEAD
    rules:
      - result: found
        when:
          all:
            - type: status
              in: [200]
      - result: not_found
        when:
          all:
            - type: status
              in: [404]
```

判定条件はHTTPステータス、最終URL、ヘッダー、本文、JSONパス、HTMLセレクターに対応します。条件は `all`、`any`、`not` で組み合わせられます。一致するルールがない場合は、誤って未使用と判定せず `unknown` を返します。

外部マニフェストも指定できます。

```bash
bun index.ts --config ./custom-sites.yaml username
```

## Sherlock Import

Sherlockの `data.json` をMikuru形式へ変換できます。変換結果は標準出力へYAMLとして出ます。

```bash
bun run import:sherlock ./data.json > imported-sites.yaml
```

変換は移行の出発点です。各サイトのライブ検証を行い、安定したプローブURLと判定ルールへ調整してください。
