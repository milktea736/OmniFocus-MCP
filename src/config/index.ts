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
    
    config.oauth = {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
      },
      sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production'
    };
    
    // Validate required config
    if (!config.oauth.github.clientId || !config.oauth.github.clientSecret) {
      throw new Error('GitHub OAuth credentials are required in HTTP mode');
    }
  }
  
  return config;
}
