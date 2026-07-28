import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkPassphrase, issueToken, setPassphrase, requireAuth } from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many login attempts — try again later' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { passphrase } = req.body || {};
  if (!passphrase || !checkPassphrase(passphrase)) {
    return res.status(401).json({ error: 'incorrect passphrase' });
  }
  const token = issueToken();
  res.json({ token });
});

router.post('/change-passphrase', requireAuth, (req, res) => {
  const { currentPassphrase, newPassphrase } = req.body || {};
  if (!currentPassphrase || !checkPassphrase(currentPassphrase)) {
    return res.status(401).json({ error: 'current passphrase is incorrect' });
  }
  if (!newPassphrase || String(newPassphrase).length < 4) {
    return res.status(400).json({ error: 'new passphrase must be at least 4 characters' });
  }
  setPassphrase(newPassphrase);
  const token = issueToken();
  res.json({ token });
});

export default router;
