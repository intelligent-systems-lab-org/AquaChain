import express from "express";

const app = express();
const port = process.env.PORT || 3000;

const swaggerJsdoc = require("swagger-jsdoc");
const fs = require("fs");
const path = require("path");

const overviewDescription = fs.readFileSync(
  path.resolve(__dirname, "../README.md"),
  "utf-8"
);

import { tariffRouter } from "./controllers/tariff";
import { reservoirRouter } from "./controllers/reservoir";
import { consumerRouter } from "./controllers/consumer";

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static("public"));

app.use("/tariff", tariffRouter);
app.use("/reservoir", reservoirRouter);
app.use("/consumer", consumerRouter);

const options = {
  failOnErrors: true,
  definition: {
    openapi: "3.0.0",
    info: {
      description: overviewDescription,
    },
  },
  apis: ["./src/controllers/*.ts"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

app.get("/docs", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
