import express from "express";

const app = express();
const port = process.env.PORT || 3000;

const tariffRouter = require("./controllers/tarrif");

app.use(express.json()); // Middleware to parse JSON bodies
app.use("/tariff", tariffRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
