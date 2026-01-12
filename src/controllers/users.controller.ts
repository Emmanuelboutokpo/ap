import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

// controllers/user.controller.ts
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: { in: ["CHORISTE", "ADMIN"] },
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in getUsers:", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    });
  }
};


// controllers/user.controller.ts
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullName, email, role, isValidated } = req.body;

  try {
    // ✅ Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    // ✅ Construire la mise à jour du profile si nécessaire
    const profileData =
      fullName !== undefined
        ? {
            update: {
              ...(fullName !== undefined && { fullName }),
            },
          }
        : undefined;

    // ✅ Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isValidated !== undefined && { isValidated }),
        ...(profileData && { profile: profileData }),
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Utilisateur mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de l'utilisateur",
    });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    // ✅ Vérifier que le rôle est valide
    const validRoles = ['CHORISTE', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Rôle invalide. Les rôles valides sont: ${validRoles.join(', ')}`,
      });
      return;
    }

    // ✅ Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    if (existingUser.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: 'Impossible de retirer le dernier administrateur',
        });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role as any, 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `Rôle de l'utilisateur mis à jour avec succès (${existingUser.role} → ${role})`,
    });

  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du rôle de l'utilisateur",
      ...(process.env.NODE_ENV === 'development' && { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Tentative de suppression de l'utilisateur: ${id}`);

    // ✅ Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      console.log(`❌ Utilisateur ${id} non trouvé`);
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });

  } catch (error: any) {
    console.error('❌ Erreur suppression utilisateur:', error);

    // ✅ Gestion des erreurs spécifiques Prisma
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
   const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
   
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// controllers/user.controller.ts
export const getEmployeesAndControleurs = async (req: Request, res: Response): Promise<void> => {
  const { 
    isValidated,
    search 
  } = req.query;

  try {
    // ✅ Filtre pour employés et contrôleurs seulement
    const where: any = {
      role: {
        in: ['CHORISTE'],
      },
    };

    // ✅ Filtre par disponibilité
    if (isValidated !== undefined) {
      where.isValidated = isValidated === 'false' || isValidated === 'true';
    }

    // ✅ Recherche
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { isValidated: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        role: 'asc', // ✅ Trier par rôle
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching employees and controleurs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des employés et contrôleurs' 
    });
  }
};