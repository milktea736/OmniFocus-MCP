import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { Config } from '../config/index.js';

export interface GitHubUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl: string;
}

export function setupGitHubOAuth(config: Config) {
  if (!config.oauth) throw new Error('OAuth config missing');
  
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: config.oauth.github.callbackURL,
        scope: ['user:email']
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user: GitHubUser = {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value || ''
          };
          
          // Check whitelist if configured
          if (!isUserAllowed(user)) {
            return done(null, false, { message: 'User not authorized' });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });
  
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}

function isUserAllowed(user: GitHubUser): boolean {
  const allowedUsers = process.env.ALLOWED_GITHUB_USERS?.split(',') || [];
  const allowedOrgs = process.env.ALLOWED_GITHUB_ORGS?.split(',') || [];
  
  // If no whitelist configured, allow all authenticated users
  if (allowedUsers.length === 0 && allowedOrgs.length === 0) {
    return true;
  }
  
  // Check user whitelist
  if (allowedUsers.includes(user.username)) {
    return true;
  }
  
  // Note: Organization membership checking requires additional GitHub API calls
  // and is not currently implemented. If you need org-based access control,
  // you'll need to implement a separate check using the GitHub API with the
  // access token provided to the OAuth callback.
  if (allowedOrgs.length > 0) {
    console.error('WARNING: ALLOWED_GITHUB_ORGS is configured but organization checking is not implemented');
  }
  
  return false;
}
