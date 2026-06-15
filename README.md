# Mikuru

Mikuruは、同じユーザー名のアカウントが複数のサービスに存在するか調べるCLIツールです。

見つかったアカウントだけを表示するため、ユーザー名から公開プロフィールを探したい場合にそのまま利用できます。

## 対応サービス

<details>
<summary>対応サービス一覧（55サービス）</summary>

- GitHub
- GitLab
- Docker Hub
- Bluesky
- Instagram
- X (Twitter)
- YouTube
- Pinterest
- Medium
- Zenn
- note
- SoundCloud
- Threads
- Steam
- npm
- Twitch
- Qiita
- DEV
- Codeberg
- Hugging Face
- AtCoder
- Linktree
- Behance
- Lichess
- Chess.com
- Tumblr
- Codeforces
- LeetCode
- Dribbble
- Vimeo
- Product Hunt
- Gravatar
- Patreon
- RubyGems
- Packagist
- CodePen
- SourceHut
- itch.io
- Hatena
- Kaggle
- Mastodon.social
- Misskey.io
- Bitbucket
- Gitea.com
- NuGet
- Codewars
- Speaker Deck
- Wantedly
- AniList
- Discogs
- Pastebin
- Telegram
- Matrix.org
- VK
- QQ (Qzone)

</details>

サービス側の制限や仕様変更により、一時的に判定できない場合があります。

QQは公開Qzoneの存在を確認します。QQアカウントが存在していても、Qzoneが公開されていない場合は検出できません。

## Skills

`skills` CLIを使って、GitHubからMikuruスキルをインストールできます。

```bash
bunx skills add p1atdev/mikuru
```

`skills` CLIが対応するエージェントとインストール先を環境から判定します。既定では現在のプロジェクトへ追加されます。特定のエージェントやグローバル環境へ追加したい場合は、`--agent` や `--global` を必要に応じて指定できます。

Codex、Claude Codeなど、`skills` CLIが対応するエージェントで利用できます。

スキルは初回実行時にGitHubからMikuruを取得してビルドするため、Mikuruのソースコードが現在の作業ディレクトリになくても利用できます。

インストール後、エージェントには次のように依頼できます。

```text
Mikuruを使って alice のアカウントを探して
```

同じユーザー名が見つかっても、それらのアカウントが同一人物によって管理されているとは限りません。

## インストール

[Bun](https://bun.sh/)とGitが必要です。

```bash
git clone https://github.com/p1atdev/mikuru.git
cd mikuru
bun install --frozen-lockfile
bun run build
```

実行ファイルは `dist/mikuru` に生成されます。

## 使い方

ユーザー名を指定して検索します。

```bash
./dist/mikuru alice
```

複数のユーザー名も一度に指定できます。

```bash
./dist/mikuru alice bob
```

特定のサービスだけを検索する場合は `--site` を指定します。複数回指定できます。

```bash
./dist/mikuru --site instagram --site twitter alice
```

既定では、アカウントが見つかったサービスだけを表示します。

```text
alice
  FOUND     GitHub  https://github.com/alice

Summary: found=1 not_found=13
```

## JSON出力

エージェントやスクリプトから利用する場合はJSONまたはJSON Lines形式を指定できます。

```bash
./dist/mikuru --format json alice
./dist/mikuru --format jsonl alice bob
```

JSONの `results` には、既定では `found` の結果だけが入ります。

```json
{
  "results": [
    {
      "username": "alice",
      "site": {
        "id": "github",
        "name": "GitHub"
      },
      "status": "found",
      "profileUrl": "https://github.com/alice"
    }
  ]
}
```

## 全結果を確認する

未検出や判定不能も含めて確認する場合は `--all` を指定します。

```bash
./dist/mikuru --all alice
```

ステータスの意味:

| ステータス  | 意味                                         |
| ----------- | -------------------------------------------- |
| `found`     | アカウントが見つかった                       |
| `not_found` | アカウントが見つからなかった                 |
| `invalid`   | そのサービスでは使用できない形式のユーザー名 |
| `blocked`   | WAFやレート制限により判定できなかった        |
| `unknown`   | レスポンスから判定できなかった               |
| `error`     | 通信エラーやタイムアウトが発生した           |

`not_found` は、そのユーザー名で新規登録できることを保証するものではありません。

## オプション

```text
-f, --format <text|json|jsonl>  出力形式
-s, --site <id|name>            検索対象を限定。複数指定可能
-a, --all                       未検出や判定不能も表示
    --concurrency <number>      同時リクエスト数
    --timeout <milliseconds>    サービスごとのタイムアウト
-h, --help                      ヘルプ
-v, --version                   バージョン
```
