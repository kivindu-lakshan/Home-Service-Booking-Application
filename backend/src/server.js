const app = require("./app");
const connectDatabase = require("./config/db");
const port = process.env.PORT || 3000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`API listening on ${port}`)))
  .catch((error) => {
    console.error("Database startup failed:", error.message);
    process.exit(1);
  });
