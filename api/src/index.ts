import express from "express";

const app = express();
const port = process.env.PORT || 3000;

const swaggerJsdoc = require('swagger-jsdoc');

import { tariffRouter } from "./controllers/tariff";
import { reservoirRouter } from "./controllers/reservoir";
import { consumerRouter } from "./controllers/consumer";

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static('public'));

app.use("/tariff", tariffRouter);
app.use("/reservoir", reservoirRouter);
app.use("/consumer", consumerRouter);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Aquachain API',
      version: '1.0.0',
    },
  },
  apis: ['./src/controllers/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

app.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});