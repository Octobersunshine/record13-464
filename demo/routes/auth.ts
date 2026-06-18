import { Router, Request, Response } from 'express';

const router = Router();

interface AuthLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  captcha?: string;
}

interface AuthRegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationCode?: string;
}

router.post('/login', (req: Request, res: Response) => {
  const body: AuthLoginRequest = req.body;
  res.json({ success: true, token: 'mock-token', username: body.username });
});

router.post('/register', (req: Request, res: Response) => {
  const { username, email, password, confirmPassword, invitationCode } = req.body;
  res.json({ success: true, id: Date.now(), username, email });
});

router.put('/profile', (req: Request, res: Response) => {
  const nickname = req.body.nickname;
  const avatar = req.body.avatar;
  res.json({ success: true, nickname, avatar });
});

export default router;
