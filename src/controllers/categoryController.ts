import { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function getCategories(req: Request, res: Response) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const search = req.query.search?.toString()

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    const [total, categories] = await prisma.$transaction([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subCategories: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    res.status(200).json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: categories,
    })
  } catch (err: any) {
    console.error("❌ getCategories error:", err)
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    })
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const { id } = req.params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: {
          include: {
            planches: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie introuvable",
      })
    }

    res.status(200).json({
      success: true,
      data: category,
    })
  } catch (err: any) {
    console.error("❌ getCategoryById error:", err)
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    })
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { id } = req.params
    const { name, description } = req.body

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ message: "Catégorie introuvable" })
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.category.update({
        where: { id },
        data: {
          name,
          description,
        },
      })
    })

    res.status(200).json({
      success: true,
      message: "Catégorie mise à jour",
      data: updated,
    })
  } catch (err: any) {
    console.error("❌ updateCategory error:", err)
    res.status(500).json({
      success: false,
      message: err.message,
    })
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { id } = req.params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
      },
    })

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable" })
    }

    if (category.subCategories.length > 0) {
      return res.status(400).json({
        message: "Impossible de supprimer une catégorie avec des sous-catégories",
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } })
    })

    res.status(200).json({
      success: true,
      message: "Catégorie supprimée avec succès",
    })
  } catch (err: any) {
    console.error("❌ deleteCategory error:", err)
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    })
  }
}
