# Mikuru

`sherlock-project/sherlock` の Bun 再実装。
core, cli, web のモノレポ。

## 機能

- `packages/core`
- `packages/cli`

有力なサイトに絞って、アカウントの存在をチェックする。

元の sherlock は最新のレスポンス形式に必ずしも追いついていないので、どのサイトが今ちゃんと対応できているのか把握できるように、サイトごとにテストを用意して把握できるようにする。

元の sherlock と同様に、サイトごとに判定方法を設定できると良い。例えは、HEAD で十分な場合は HEAD ですまして、必要な場合は HTMLRewriter を使う感じにする。

HTMLRewrite は癖が強いので、もし使う場合は適切なラッパーを用意すると良いと思う。

最終的に、Codex のスキルとして呼び出せるようにしたい (`bun build` による single file) ので、JSON 形式などエージェントが読みやすい形での出力に対応して欲しい。

対応するサイトやそれぞれの判定方法の記述は Yaml で行う。
ベースラインは `https://github.com/sherlock-project/sherlock/blob/master/sherlock_project/resources/data.json` の JSON を使って良いが、100%信頼できる検証方法とは限らない。

## 依存

必要に応じて `bun add` で依存追加して良い。(サンドボックスの都合で拒否される可能性もあるが、権限申請すれば良い。)

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Web

- `packages/web`

mikuru を cloudflare workers 上で動かす。

### UI

Kumo UI を用いる。詳細は

```bash
bunx @cloudflare/kumo help
```

で調べること。

