import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

export default {
  port: 8080,
  fetch: app.fetch,
};
