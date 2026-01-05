import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { cloudinary } from "../lib/cloudinary";

export async function createPlanche(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const { title, subCategoryId } = req.body

    const uploadedFiles: string[] = []
    const uploadedAudios: string[] = []

    const files = req.files as {
      planche?: Express.Multer.File[]
      audios?: Express.Multer.File[]
    }

    if (!files?.planche?.length) {
      return res.status(400).json({ message: "Fichiers PDF ou images requis" })
    }

    /* ---------- Upload PDF / Images ---------- */
    for (const file of files.planche) {
      const upload = await cloudinary.uploader.upload(file.path, {
        folder: "mont-sinai/planches",
        resource_type:  "image",
        timeout: 60000,
      })
      uploadedFiles.push(upload.secure_url)
    }

    /* ---------- Upload Audios ---------- */
    if (files.audios) {
      for (const audio of files.audios) {
        const upload = await cloudinary.uploader.upload(audio.path, {
          folder: "mont-sinai/audios",
          resource_type: "video",
          timeout: 60000,
        })
        uploadedAudios.push(upload.secure_url)
      }
    }

    const subCategoryExists = await prisma.subCategory.findFirst({
      where: { 
        id: subCategoryId,
      }
    })

    if (!subCategoryExists) {
      return res.status(404).json({ message: "Sous-catégorie non trouvée ou n'appartient pas à la catégorie" })
    }

    /* ---------- Transaction Prisma ---------- */
    const planche = await prisma.$transaction(async (tx) => {
      return await tx.planche.create({
        data: {
          title,
          planche: uploadedFiles,
          audio: uploadedAudios,
          subCategoryId,
          uploadedById: req.user!.id,
        } as any,

        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  catalogue: true
                }
              }
            }
          },
          
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      })
    })

    return res.status(201).json({
      success: true,
      message: "Planche créée avec succès",
      data: planche,
    })

  } catch (err: any) {
    console.error("❌ createPlanche error:", err)
    res.status(500).json({
      success: false,
      message: err.message || "Erreur serveur",
    })
  }
}

export async function getPlanches(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise" })
    }

    /* ---------- Query params ---------- */
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const search = req.query.search?.toString()
    const categoryId = req.query.categoryId?.toString()
    const subCategoryId = req.query.subCategoryId?.toString()
    const fileType = req.query.fileType as "PDF" | "IMAGE" | undefined

    const skip = (page - 1) * limit

    /* ---------- Filters ---------- */
    const where: any = {}

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      }
    }

    if (fileType) {
      where.fileType = fileType
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId
    }

    if (categoryId) {
      where.subCategory = {
        categoryId
      }
    }

    /* ---------- Prisma transaction ---------- */
    const [total, planches] = await prisma.$transaction([
      prisma.planche.count({ where }),
      prisma.planche.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subCategory: {
            include: {
              category: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
    ])

    /* ---------- Response ---------- */
    res.status(200).json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: planches,
    })

  } catch (err: any) {
    console.error("❌ getPlanches error:", err)
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    })
  }
}

export async function getPlancheById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const planche = await prisma.planche.findUnique({
      where: { id },
      include: {
        subCategory: {  
          include: {
            category: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })  

    if (!planche) {
      return res.status(404).json({ message: "Planche introuvable" })
    } 

    res.json({ success: true, data: planche })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
  

export async function getCatalogues(req: Request, res: Response) {
 try {
    const catalogues = await prisma.catalogue.findMany();
    res.status(200).json(catalogues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function updatePlanche(req: Request, res: Response) {
  try {
    const { id } = req.params

    const planche = await prisma.planche.findUnique({ where: { id } })
    if (!planche) {
      return res.status(404).json({ message: "Planche introuvable" })
    }

    const newFiles: string[] = []
    const newAudios: string[] = []

    const files = req.files as any

    if (files?.files) {
      for (const file of files.files) {
        const upload = await cloudinary.uploader.upload(file.path, {
          folder: "mont-sinai/planches",
          resource_type: "raw",
        })
        newFiles.push(upload.secure_url)
      }
    }

    if (files?.audios) {
      for (const audio of files.audios) {
        const upload = await cloudinary.uploader.upload(audio.path, {
          folder: "mont-sinai/audios",
          resource_type: "video",
        })
        newAudios.push(upload.secure_url)
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.planche.update({
        where: { id },
        data: {
          files: [...planche.files, ...newFiles],
          audioFiles: [...planche.audioFiles, ...newAudios],
        }
      })
    })

    res.json({ success: true, data: updated })

  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function deletePlanche(req: Request, res: Response) {
  try {
    const { id } = req.params
    const planche = await prisma.planche.findUnique({ where: { id } })
    if (!planche) {
      return res.status(404).json({ message: "Planche introuvable" })
    }
    await prisma.planche.delete({ where: { id } })
    res.json({ success: true, message: "Planche supprimée avec succès" })
  }
  catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

 