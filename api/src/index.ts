import express from "express";

const app = express();
const port = process.env.PORT || 3000;

import { tariffRouter } from "./controllers/tariff";
import { reservoirRouter } from "./controllers/reservoir";
import { consumerRouter } from "./controllers/consumer";

app.use(express.json()); // Middleware to parse JSON bodies
app.use("/tariff", tariffRouter);
app.use("/reservoir", reservoirRouter);
app.use("/consumer", consumerRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
