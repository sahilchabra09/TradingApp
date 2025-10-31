import "dotenv/config";
import { logger } from "./middlewares/pino-logger.js";
import notFound from "stoker/middlewares/not-found";
import onError from "stoker/middlewares/on-error";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

const app = new OpenAPIHono();
app.use(logger());

app.get("/", (c) => {
  return c.text("OK");
});



app.get(
  "/prod-docs",
  Scalar({
    url: "/doc",
    theme: "purple",
    layout: "classic",
  })
);

app.notFound(notFound);
app.onError(onError);
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

export default app;
