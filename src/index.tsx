#!/usr/bin/env bun
import "dotenv/config";
import { render } from "ink";
import { App } from "./app.js";
import { loadConfig } from "./config.js";
import { createModel } from "./model.js";
import { createToolRegistry } from "./tools/registry.js";

const config = loadConfig();
const model = createModel(config);
const tools = createToolRegistry();

render(<App config={config} model={model} tools={tools} />);
