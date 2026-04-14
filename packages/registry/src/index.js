import express from 'express';
import cors from 'cors';
import { seedDatabase } from './seed.js';
import { getStats } from './services/skills.js';
import skillsRouter from './routes/skills.js';
import packagesRouter from './routes/packages.js';
import personasRouter from './routes/personas.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api/skills', skillsRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/personas', personasRouter);

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ data: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Seed and start
async function start() {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 SkillForge Registry API running at http://localhost:${PORT}`);
      console.log(`   📚 Skills:   http://localhost:${PORT}/api/skills`);
      console.log(`   📦 Packages: http://localhost:${PORT}/api/packages`);
      console.log(`   👤 Personas: http://localhost:${PORT}/api/personas`);
      console.log(`   📊 Stats:    http://localhost:${PORT}/api/stats`);
      console.log(`   ❤️  Health:   http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
