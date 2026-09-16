import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { randomBytes, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const origin = { Origin: base };
test("production workspace: authentication, editing, ingestion, runtime isolation and responsive pages", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get("/api/portal/data")).status()).toBe(401);
  expect(
    (
      await request.post("/api/portal/login", {
        data: { email: "admin@gmail.com", password: "wrong" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@gmail.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText("incorrect");
  await page.getByLabel("Password", { exact: true }).fill("admin");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("heading", { name: "Conversation activity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Minutes", exact: true }).click();
  await expect(page.locator(".chart-summary")).toBeVisible();
  await page.getByRole("button", { name: "Calls", exact: true }).click();
  await page.getByLabel("Date range").selectOption("90");
  await expect(page.getByText("over the last 90 days")).toBeVisible();
  await page.getByRole("button", { name: "View conversation" }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Conversation details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  const before = await (await page.request.get("/api/portal/data")).json();
  expect(before.agents.length).toBeGreaterThan(0);
  expect(JSON.stringify(before)).not.toMatch(
    /runtime_token_hash|WHATSAPP_ACCESS_TOKEN|password_hash/,
  );
  const marker = `QA-${Date.now()}`;
  let testAgent = "",
    testDoc = "",
    testProduct = "";
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  try {
    await page
      .getByRole("link", { name: "Knowledge Base", exact: true })
      .click();
    await page
      .getByLabel("Upload document", { exact: true })
      .setInputFiles({
        name: `${marker}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(
          `The ${marker} concierge support line is open from 9am to 5pm. Reference code: orchid-test-742. This is an automated QA document.`,
        ),
      });
    await expect(
      page.getByRole("button", { name: `${marker}.txt 0.1 KB` }),
    ).toBeVisible();
    let state = await (await page.request.get("/api/portal/data")).json();
    testDoc = state.documents.find(
      (d: { name: string }) => d.name === `${marker}.txt`,
    ).id;
    await page.getByRole("button", { name: new RegExp(`^${marker}`) }).click();
    await expect(
      page.getByText(/Reference code: orchid-test-742/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("link", { name: "Product Catalogue", exact: true })
      .click();
    const workbook = new ExcelJS.Workbook(),
      sheet = workbook.addWorksheet("Products");
    sheet.addRow([
      "name",
      "sku",
      "description",
      "category",
      "price",
      "currency",
      "stock",
      "status",
    ]);
    sheet.addRow([
      marker,
      "QA-742",
      "Automated integration test product",
      "Service",
      125,
      "USD",
      2,
      "active",
    ]);
    await page
      .getByLabel("Import Excel workbook")
      .setInputFiles({
        name: "qa.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      });
    await expect(
      page.getByRole("dialog", { name: "Review your Excel import" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Import 1 items" }).click();
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const latest = await (await page.request.get("/api/portal/data")).json();
      return latest.products.some((p: { name: string }) => p.name === marker);
    }).toBe(true);
    state = await (await page.request.get("/api/portal/data")).json();
    testProduct = state.products.find(
      (p: { name: string }) => p.name === marker,
    ).id;
    await page.getByRole("button", { name: "Add row", exact: true }).click();
    const inputs = page.getByLabel(/Product name row/);
    await expect(inputs.last()).toBeVisible();
    await inputs.last().fill(`${marker}-manual`);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText(`${marker}-manual`, { exact: true }),
    ).toBeVisible();
    state = await (await page.request.get("/api/portal/data")).json();
    const manual = state.products.find(
      (p: { name: string }) => p.name === `${marker}-manual`,
    );
    expect(manual).toBeTruthy();
    await page.request.delete(`/api/portal/products/${manual.id}`, {
      headers: origin,
    });
    await page
      .getByRole("link", { name: "Agent Management", exact: true })
      .click();
    await page.getByRole("button", { name: "New voice agent" }).click();
    await page.getByRole("dialog").getByLabel("Agent name").fill(marker);
    await page
      .getByRole("button", { name: "Create agent", exact: true })
      .click();
    await expect(page.locator(".agent-editor-heading h2")).toHaveText(marker);
    state = await (await page.request.get("/api/portal/data")).json();
    testAgent = state.agents.find(
      (a: { name: string }) => a.name === marker,
    ).id;
    await page
      .getByLabel("System prompt", { exact: true })
      .fill(
        "You are a QA concierge. Use the knowledge base and product catalogue to answer questions.",
      );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("configuration saved");
    await page.reload();
    await page.locator(".agent-list-card").filter({ hasText: marker }).click();
    await expect(page.getByLabel("System prompt", { exact: true })).toHaveValue(
      /QA concierge/,
    );
    await page.getByRole("button", { name: "Tools & behaviour" }).click();
    const switcher = page.getByRole("switch").first();
    await switcher.uncheck();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("configuration saved");
    state = await (await page.request.get("/api/portal/data")).json();
    expect(
      state.agents.find((a: { id: string }) => a.id === testAgent).tools,
    ).not.toContain("search_knowledge");
    await switcher.check();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("configuration saved");
    await page.getByRole("button", { name: "Compute", exact: true }).click();
    await page.getByRole("button", { name: "Find available compute" }).click();
    await expect(
      page.getByRole("heading", { name: "Live compute offers" }),
    ).toBeVisible({ timeout: 30000 });
    const liveOffers = await (
      await page.request.get("/api/portal/offers?budget=0.2")
    ).json();
    expect(liveOffers.offers).toBeInstanceOf(Array);
    if (sql) {
      const token = randomBytes(32).toString("hex"),
        hash = createHash("sha256").update(token).digest("hex");
      await sql`update portal_agents set runtime_token_hash=${hash} where id=${testAgent}`;
      const headers = { Authorization: `Bearer ${token}` };
      const knowledge = await request.post("/api/runtime/search", {
        headers,
        data: { tool: "search_knowledge", query: marker },
      });
      expect(knowledge.status()).toBe(200);
      expect(JSON.stringify(await knowledge.json())).toContain(
        "orchid-test-742",
      );
      const products = await request.post("/api/runtime/search", {
        headers,
        data: { tool: "search_products", query: marker },
      });
      expect(products.status()).toBe(200);
      expect(JSON.stringify(await products.json())).toContain("QA-742");
      await sql`update portal_agents set tools=array[]::text[] where id=${testAgent}`;
      expect(
        (
          await request.post("/api/runtime/search", {
            headers,
            data: { tool: "search_products", query: marker },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await request.get("/api/runtime/config", {
            headers: { Authorization: "Bearer invalid" },
          })
        ).status(),
      ).toBe(401);
      const id = `${testAgent}:qa-call`;
      const call = {
        id: "qa-call",
        customer_phone: "",
        status: "completed",
        transcript: "Automated test call record",
        duration_seconds: 60,
        tokens: 120,
        started_at: Date.now() / 1000,
      };
      expect(
        (
          await request.post("/api/runtime/calls", { headers, data: call })
        ).status(),
      ).toBe(200);
      expect(
        (
          await request.post("/api/runtime/calls", { headers, data: call })
        ).status(),
      ).toBe(200);
      const [count] =
        await sql`select count(*)::int as count from portal_calls where id=${id}`;
      expect(count.count).toBe(1);
      await sql`delete from portal_calls where id=${id}`;
      await sql`update portal_agents set tools=array['create_order','create_ticket'] where id=${testAgent}`;
      const order = { call_id: "qa-order", customer_phone: "+94770000000", customer_name: marker, items: [{ name: "QA product", quantity: 2 }], delivery_address: "Colombo", notes: "QA order" };
      expect((await request.post("/api/runtime/orders", { headers, data: order })).status()).toBe(200);
      expect((await request.post("/api/runtime/orders", { headers, data: order })).status()).toBe(200);
      const [orderCount] = await sql`select count(*)::int as count from portal_orders where customer_id='908153ff-146c-418f-b8ca-2c88ba314c44' and call_id='qa-order'`;
      expect(orderCount.count).toBe(1);
      const ticket = { call_id: "qa-ticket", customer_phone: "+94770000000", customer_name: marker, subject: "QA issue", description: "Automated support ticket", priority: "high" };
      expect((await request.post("/api/runtime/tickets", { headers, data: ticket })).status()).toBe(200);
      const stateWithRecords = await (await page.request.get("/api/portal/data")).json();
      expect(stateWithRecords.orders.some((o: { call_id: string }) => o.call_id === "qa-order")).toBe(true);
      expect(stateWithRecords.tickets.some((t: { call_id: string }) => t.call_id === "qa-ticket")).toBe(true);
      await sql`delete from portal_orders where customer_id='908153ff-146c-418f-b8ca-2c88ba314c44' and call_id='qa-order'`;
      await sql`delete from portal_tickets where customer_id='908153ff-146c-418f-b8ca-2c88ba314c44' and call_id='qa-ticket'`;
      const foreign = "9930bc78-d2d0-4b46-bd86-b667373d2164";
      const [doc] =
        await sql`insert into portal_documents(customer_id,name,content,bytes,type) values(${foreign},${marker},${marker},30,'txt') returning id`;
      try {
        expect(
          (await page.request.get(`/api/portal/documents/${doc.id}`)).status(),
        ).toBe(404);
      } finally {
        await sql`delete from portal_documents where id=${doc.id}`;
      }
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of [
        "dashboard",
        "appointments",
        "orders",
        "tickets",
        "knowledge",
        "catalogue",
        "agents",
      ]) {
        await page.goto(`/${section}`);
        await expect(page.locator("main h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/${section}-${width}.png`,
          fullPage: true,
        });
      }
    }
    expect(errors).toEqual([]);
  } finally {
    if (testDoc)
      await page.request.delete(`/api/portal/documents/${testDoc}`, {
        headers: origin,
      });
    if (testProduct)
      await page.request.delete(`/api/portal/products/${testProduct}`, {
        headers: origin,
      });
    if (testAgent)
      await page.request.delete(`/api/portal/agents/${testAgent}`, {
        headers: origin,
      });
    if (sql) {
      await sql`delete from portal_products where name like ${marker + "%"} and customer_id='908153ff-146c-418f-b8ca-2c88ba314c44'`;
      await sql`delete from portal_events where detail like ${marker + "%"} and customer_id='908153ff-146c-418f-b8ca-2c88ba314c44'`;
    }
  }
});
