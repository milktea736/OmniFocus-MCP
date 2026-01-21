export interface Config {
  mode: 'stdio' | 'http';
  http?: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  oauth?: {
    github: {
      clientId: string;
      clientSecret: string;
      callbackURL: string;
    };
    sessionSecret: string;
  };
}

export function loadConfig(): Config {
  const mode = (process.env.MCP_MODE || 'stdio') as 'stdio' | 'http';
  
  const config: Config = { mode };
  
  if (mode === 'http') {
    config.http = {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
    };
    
    const sessionSecret = process.env.SESSION_SECRET || 'change-me-in-production';
    
    // Warn if using default session secret
    if (sessionSecret === 'change-me-in-production') {
      console.error('WARNING: Using default session secret. Generate a secure random secret for production!');
      console.error('Generate one with: openssl rand -hex 32');
    }
    
    config.oauth = {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
      },
      sessionSecret
    };
    
    // Validate required config
    if (!config.oauth.github.clientId || !config.oauth.github.clientSecret) {
      throw new Error('GitHub OAuth credentials are required in HTTP mode');
    }
  }
  
  return config;
}
