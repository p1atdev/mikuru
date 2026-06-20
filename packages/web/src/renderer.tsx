import { jsxRenderer } from "hono/jsx-renderer";
import { Link, ViteClient } from "vite-ssr-components/hono";

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Link href="/src/styles/global.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
});
