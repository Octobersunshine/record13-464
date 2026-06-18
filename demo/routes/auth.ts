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

// 用户登录接口 - 上线中
router.post('/login', (req: Request, res: Response) => {
  const body: AuthLoginRequest = req.body;
  res.json({ success: true, token: 'mock-token', username: body.username });
});

// WIP: 用户注册 - 开发中
router.post('/register', (req: Request, res: Response) => {
  const { username, email, password, confirmPassword, invitationCode } = req.body;
  res.json({ success: true, id: Date.now(), username, email });
});

// @deprecated 旧版用户资料更新接口
router.put('/profile', (req: Request, res: Response) => {
  const nickname = req.body.nickname;
  const avatar = req.body.avatar;
  res.json({ success: true, nickname, avatar });
});

export default router;
