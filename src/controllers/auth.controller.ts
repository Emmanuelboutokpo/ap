import bcrypt from "bcrypt";
import * as c from "crypto";
import prisma from '../lib/prisma';
import { Redis } from "@upstash/redis";
import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../lib/jwt";
import { sendConfirmationEmail, sendOPT } from "../services/mails/emailServices";

const hashPassword = async (password: string) => bcrypt.hashSync(password, 10);

const generateNumericOTP = () => {
  const n = c.randomInt(0, 1000000)
  return n.toString().padStart(0, '0');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const signUpEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, password, fullName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User with this email already exists');

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName
      }
    });

    const otp = generateNumericOTP();
    await redis.set(`otp:${email}`, otp, { ex: 600 }); // OTP valid for 5 minutes
    await sendOPT({ email, otp, user: { name: fullName || 'User' } });
    res.status(201).json({ message: 'User created successfully. Please verify your email.' });
    return;

  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }

}

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable" });
    return;
  }

  if (!email || !otp) {
    res.status(400).json({ message: "Email et OTP requis" });
    return;
  }

  const storedOtp = await redis.get(`otp:${email}`);


  if (!storedOtp || storedOtp !== otp) {
    res.status(400).json({ message: "OTP invalide ou expiré" });
    return;
  }

  await redis.del(`otp:${email}`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "PENDING_MC_APPROVAL",
    },
  });

  res.status(200).json({
    message:
      "Email vérifié avec succès. Votre compte est en attente de validation par le Maitre de choeur.",
  });
};



export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Identifiants invalides" });
      return;
    }

     if (user.status !== "ACTIVE") {
    return res.json({
      status: user.status,
      message: "Compte non actif",
    });
  }

    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ id: user.id });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const resendOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email requis' });
      return;
    }

    /* -------------------- CHECK USER -------------------- */
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ message: 'Utilisateur introuvable' });
      return;
    }

    /* -------------------- RATE LIMIT -------------------- */
    const resendKey = `otp:resend:${email}`;
    const cooldown = await redis.get(resendKey);

    if (cooldown) {
      res.status(429).json({
        message: 'Veuillez patienter avant de renvoyer le code',
      });
      return;
    }

    /* -------------------- GENERATE OTP -------------------- */
    const otp = generateNumericOTP();;

    await redis.set(`otp:${email}`, otp, { ex: 300 }); // 5 min
    await redis.set(resendKey, '1', { ex: 60 }); // cooldown 60s

    /* -------------------- SEND EMAIL -------------------- */
    await sendOPT({ email, otp, user: { name: user.fullName || 'User' } });

    res.status(200).json({
      message: 'OTP renvoyé avec succès',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


export const refreshTokens = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const decoded = verifyToken(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.refreshToken) {
      res.status(401).json({ message: "Refresh token invalide" });
      return;
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      res.status(401).json({ message: "Refresh token invalide" });
      return;
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({ id: user.id });
    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};


export const validateUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id},
    data: { status: "ACTIVE" },
  });

  await sendConfirmationEmail(user.email, {
    name: user.fullName || "User",
  });

  res.status(200).json({
    message: "Compte validé avec succès",
    user,
  });
};


export const logoutUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { refreshToken: null }
    });
  } catch (error) {
    console.error('Error during logout', error);
    return res.status(500).json({ message: 'Server error during logout' });
  }
}