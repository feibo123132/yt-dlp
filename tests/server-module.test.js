import test from "node:test";
import assert from "node:assert/strict";

import { startServer } from "../server.js";

test("server module can be imported without starting the app", () => {
  assert.equal(typeof startServer, "function");
});
