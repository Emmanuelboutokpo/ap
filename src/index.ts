import express from 'express'
import 'dotenv/config'
import bodyParser from 'body-parser'
import cors from 'cors'

import userRoute from "./routes/users.routes"
import authRoute from "./routes/auth.routes"
import catRoute from "./routes/category.routes"
import subCatRoute from "./routes/subCategory.routes"
import plancheRoute from "./routes/planche.routes"  

const app = express()

app.use(cors({origin: "*", credentials: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use('/api', authRoute);
app.use("/api", userRoute);
app.use("/api", catRoute);
app.use("/api", subCatRoute);
app.use("/api", plancheRoute);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
});

 const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8888

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

