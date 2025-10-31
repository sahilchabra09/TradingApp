import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db/index.js";
import { testTable } from "../db/schema/test.js";

const app = new OpenAPIHono();

// Schema for creating a test entry
const createTestSchema = z.object({
  name: z.string().min(1).openapi({ example: "John Doe" }),
  message: z.string().min(1).openapi({ example: "Hello from Drizzle!" }),
});

// Schema for test response
const testResponseSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "John Doe" }),
  message: z.string().openapi({ example: "Hello from Drizzle!" }),
  createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

// POST route - Create a test entry
const createTestRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Test"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Test entry created successfully",
      content: {
        "application/json": {
          schema: testResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(createTestRoute, async (c) => {
  try {
    const { name, message } = c.req.valid("json");
    
    const [result] = await db
      .insert(testTable)
      .values({ name, message })
      .returning();

    return c.json(
      {
        id: result.id,
        name: result.name,
        message: result.message,
        createdAt: result.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Error creating test entry:", error);
    return c.json({ error: "Failed to create test entry" }, 500);
  }
});

// GET route - Get all test entries
const getTestsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Test"],
  responses: {
    200: {
      description: "List of all test entries",
      content: {
        "application/json": {
          schema: z.array(testResponseSchema),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(getTestsRoute, async (c) => {
  try {
    const results = await db.select().from(testTable);
    
    return c.json(
      results.map((result) => ({
        id: result.id,
        name: result.name,
        message: result.message,
        createdAt: result.createdAt.toISOString(),
      })),
      200
    );
  } catch (error) {
    console.error("Error fetching test entries:", error);
    return c.json({ error: "Failed to fetch test entries" }, 500);
  }
});

export default app;
