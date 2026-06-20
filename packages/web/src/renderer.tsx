import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script, ViteClient } from "vite-ssr-components/hono";

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>Mikuru</title>
        <ViteClient />
        <Link href="/src/styles/global.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Script src="/src/client/main.tsx" />
      </body>
    </html>
  );
});
