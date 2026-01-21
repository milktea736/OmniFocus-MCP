import express, { type Request, type Response } from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from '../config/index.js';
import { setupGitHubOAuth } from '../auth/github-oauth.js';
import { requireAuth } from '../auth/middleware.js';
import { sessionManager } from '../auth/session-manager.js';

export async function startHttpServer(server: McpServer, config: Config) {
  if (!config.http || !config.oauth) {
    throw new Error('HTTP config missing');
  }
  
  const app = express();
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false // Required for SSE
  }));
  
  app.use(cors({
    origin: config.http.corsOrigins,
    credentials: true
  }));
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Session configuration
  app.use(session({
    secret: config.oauth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());
  setupGitHubOAuth(config);
  
  // ============ Routes ============
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'http' });
  });
  
  // OAuth routes
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
  
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth/failed' }),
    (req, res) => {
      // Create session token for SSE connection
      const sessionToken = sessionManager.createSession(req.user as any);
      
      // Redirect to success page with token
      res.redirect(`/auth/success?token=${sessionToken}`);
    }
  );
  
  app.get('/auth/failed', (req, res) => {
    res.status(401).json({ error: 'Authentication failed' });
  });
  
  app.get('/auth/success', (req, res) => {
    const token = req.query.token;
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .token { background: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; }
          .copy-btn { margin-top: 10px; padding: 10px 20px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>✅ Authentication Successful</h1>
        <p>Your session token:</p>
        <div class="token" id="token">${token}</div>
        <button class="copy-btn" onclick="copyToken()">Copy Token</button>
        <h2>Next Steps:</h2>
        <ol>
          <li>Copy the token above</li>
          <li>Add it to your MCP client configuration</li>
          <li>Connect to the SSE endpoint at <code>/sse</code></li>
        </ol>
        <script>
          function copyToken() {
            const token = document.getElementById('token').textContent;
            navigator.clipboard.writeText(token);
            alert('Token copied to clipboard!');
          }
        </script>
      </body>
      </html>
    `);
  });
  
  app.get('/auth/logout', (req, res) => {
    const sessionToken = req.query.token as string;
    if (sessionToken) {
      sessionManager.deleteSession(sessionToken);
    }
    req.logout(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // SSE endpoint (protected)
  app.get('/sse', requireAuth, async (req: Request, res: Response) => {
    console.error(`SSE connection from user: ${(req.user as any)?.username}`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
    
    req.on('close', () => {
      console.error('SSE connection closed');
    });
  });
  
  // Messages endpoint (protected)
  app.post('/messages', requireAuth, async (req: Request, res: Response) => {
    // Handle incoming MCP messages
    try {
      res.json({ status: 'received' });
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Start server
  const { host, port } = config.http;
  const httpServer = app.listen(port, host, () => {
    console.error(`MCP Server listening on http://${host}:${port}`);
    console.error(`OAuth login: http://${host}:${port}/auth/github`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.error('Shutting down HTTP server...');
    httpServer.close(() => {
      console.error('HTTP server closed');
      process.exit(0);
    });
  });
  
  return httpServer;
}
