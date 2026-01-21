import { v4 as uuidv4 } from 'uuid';
import type { GitHubUser } from './github-oauth.js';

export interface Session {
  id: string;
  user: GitHubUser;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  createSession(user: GitHubUser): string {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      user,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION)
    };
    
    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId);
    
    return sessionId;
  }
  
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) return null;
    
    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last accessed time
    session.lastAccessedAt = new Date();
    
    return session;
  }
  
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  private scheduleCleanup(sessionId: string) {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && new Date() > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }, this.SESSION_DURATION);
  }
  
  // Clean up all expired sessions
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionManager = new SessionManager();

// Periodic cleanup (every hour)
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 60 * 60 * 1000);
