import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userPlan: 'free' | 'lite' | 'standard';
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Dev bypass: skip auth in non-production
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true') {
    (req as AuthenticatedRequest).userId = 'dev-user';
    (req as AuthenticatedRequest).userPlan = 'standard';
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user profile for plan info
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).userPlan = (profile?.plan as 'free' | 'lite' | 'standard') || 'free';
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  // Dev bypass: skip auth in non-production
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true') {
    (req as AuthenticatedRequest).userId = 'dev-user';
    (req as AuthenticatedRequest).userPlan = 'standard';
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      (req as AuthenticatedRequest).userId = user.id;
      (req as AuthenticatedRequest).userPlan = (profile?.plan as 'free' | 'lite' | 'standard') || 'free';
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }

  next();
}
