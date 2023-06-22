const express = require('express');
const app = express();
const port = 12233;
app.get('/',(req, res) => {
  res.send("Hell");
  });

app.listen(port,console.log(`http://localhost:${port}`));
