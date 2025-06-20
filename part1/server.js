// server.js
const app = require('./app');
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log(`  GET http://localhost:${PORT}/api/dogs`);
    console.log(`  GET http://localhost:${PORT}/api/walkrequests/open`);
    console.log(`  GET http://localhost:${PORT}/api/walkers/summary`);
});