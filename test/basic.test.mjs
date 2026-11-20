import { test } from "node:test";
import assert from "node:assert/strict";
import { period, esc, renderIssue } from "../worker/render.js";
import { weekFriday } from "../worker/index.js";

const env = { SITE_URL: "https://x.test", CHANNEL: "@chtotonapsy" };

test("период выпуска по-русски", () => {
  assert.equal(period("2026-11-14", "2026-11-20"), "14–20 ноября 2026");
  assert.equal(period("2026-11-28", "2026-12-04"), "28 ноября – 4 декабря 2026");
  assert.equal(period("2026-12-26", "2027-01-01"), "26 декабря 2026 – 1 января 2027");
});

test("пятница недели: сб и вс относятся к прошлой пятнице", () => {
  assert.equal(weekFriday("2026-11-20", "Fri"), "2026-11-20");
  assert.equal(weekFriday("2026-11-21", "Sat"), "2026-11-20");
  assert.equal(weekFriday("2026-11-26", "Thu"), "2026-11-20");
});

test("текст экранируется, javascript:-ссылки не проходят", () => {
  const page = renderIssue({
    id: "2026-11-20", number: 1, title: "<script>x</script>", lead: "", status: "published",
    period_from: "2026-11-14", period_to: "2026-11-20",
    sections: [{ key: "science", items: [{ title: "a", url: "javascript:alert(1)" }] }],
  }, {}, env);
  assert.ok(!page.includes("<script>x</script>"));
  assert.ok(page.includes(esc("<script>x</script>")));
  assert.ok(!page.includes("javascript:alert"));
});
