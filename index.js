const express = require('express');

const app = express();

// Middleware
app.use(express.json());

// Start server
const PORT = 5000;

app.get('/', (req, res) => {
    res.send('Api Running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
