import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

// controllers/user.controller.ts
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    
    const where: Prisma.UserWhereInput = {
      role: { in: ["CHORISTE"] }
    };

    // Recherche corrigée
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,       
    });

    // Transformer les données
    const result = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error) {
    console.error('❌ Error in getEmployeesAndControleurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
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
    const user = await prisma.user.findFirst({ where : {id} });
   
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