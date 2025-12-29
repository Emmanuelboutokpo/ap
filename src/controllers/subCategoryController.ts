import { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function createSubCategory(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { name, categoryId } = req.body

    const subCategory = await prisma.$transaction(async (tx) => {
      return await tx.subCategory.create({
        data: {
          name,
          categoryId
        }
      })
    })

    res.status(201).json({ success: true, data: subCategory })

  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getSubCategories(req: Request, res: Response) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const search = req.query.search?.toString()
    const categoryId = req.query.categoryId?.toString()

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const [total, subCategories] = await prisma.$transaction([
      prisma.subCategory.count({ where }),
      prisma.subCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: { id: true, name: true },
          },
          planches: {
            select: {
              id: true,
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
      data: subCategories,
    })
  } catch (err: any) {
    console.error("❌ getSubCategories error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}

export async function getSubCategoryById(req: Request, res: Response) {
  try {
    const { id } = req.params

    const subCategory = await prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: true,
        planches: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!subCategory) {
      return res.status(404).json({
        message: "Sous-catégorie introuvable",
      })
    }

    res.status(200).json({
      success: true,
      data: subCategory,
    })
  } catch (err: any) {
    console.error("❌ getSubCategoryById error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}

export async function updateSubCategory(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { id } = req.params
    const { name, categoryId } = req.body

    const existing = await prisma.subCategory.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ message: "Sous-catégorie introuvable" })
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })
      if (!category) {
        return res.status(404).json({ message: "Catégorie introuvable" })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.subCategory.update({
        where: { id },
        data: {
          name,
          categoryId,
        },
      })
    })

    res.status(200).json({
      success: true,
      message: "Sous-catégorie mise à jour",
      data: updated,
    })
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Nom déjà utilisé dans cette catégorie",
      })
    }
    res.status(500).json({ message: err.message })
  }
}


export async function deleteSubCategory(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { id } = req.params

    const subCategory = await prisma.subCategory.findUnique({
      where: { id },
      include: {
        planches: true,
      },
    })

    if (!subCategory) {
      return res.status(404).json({ message: "Sous-catégorie introuvable" })
    }

    if (subCategory.planches.length > 0) {
      return res.status(400).json({
        message: "Impossible de supprimer une sous-catégorie contenant des planches",
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.subCategory.delete({ where: { id } })
    })

    res.status(200).json({
      success: true,
      message: "Sous-catégorie supprimée avec succès",
    })
  } catch (err: any) {
    console.error("❌ deleteSubCategory error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
