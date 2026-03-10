const express = require("express");
const cors = require("cors");
require("dotenv").config();

const routes = require("./routes");

console.log("ENV loaded:", {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
});

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => res.send("GamingRank API rodando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));