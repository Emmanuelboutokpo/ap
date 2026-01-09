import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { cloudinary, extractPublicIdFromUrl } from "../lib/cloudinary";
import { Prisma } from "@prisma/client";

export async function createPlanche(req: Request, res: Response) {
  try {
    /* ---------- Sécurité ---------- */
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    /* ---------- Validation body ---------- */
    const { title, subCategoryId } = req.body;

    if (!title || !subCategoryId) {
      return res.status(400).json({
        message: "title et subCategoryId sont requis",
      });
    }

    /* ---------- Typage fichiers ---------- */
    const files = req.files as {
      planche?: Express.Multer.File[];
      audios?: Express.Multer.File[];
    };

    if (!files?.planche?.length) {
      return res
        .status(400)
        .json({ message: "Fichiers PDF ou images requis" });
    }

    /* ---------- Vérifier sous-catégorie ---------- */
    const subCategoryExists = await prisma.subCategory.findUnique({
      where: { id: subCategoryId },
    });

    if (!subCategoryExists) {
      return res.status(404).json({
        message: "Sous-catégorie non trouvée",
      });
    }

    /* ---------- Upload planches (images / PDF) ---------- */
    const uploadedFiles = (
      await Promise.all(
        files.planche.map(async (file) => {
          const isPDF = file.mimetype === 'application/pdf';
          const upload = await cloudinary.uploader.upload(file.path, {
            folder: "mont-sinai/planches",
            resource_type:  isPDF ? "raw" : "image",
            ...(isPDF && { format: 'pdf' }),
            timeout: 60000,
            type  : 'upload'
          });
          return upload.secure_url;
        })
      )
    ).filter(Boolean);

    /* ---------- Upload audios ---------- */
 
   const uploadedAudios = files.audios?.length
  ? (
      await Promise.all(
        files.audios.map(async (audio) => {
          const upload = await cloudinary.uploader.upload(audio.path, {
            folder: "mont-sinai/audios",
            resource_type: "video",
            type  : 'upload'
          });

          if (!upload.secure_url) {
            throw new Error("Échec upload audio Cloudinary !");
          }

          return upload.secure_url;
        })
      )
    )
  : [];
  
    /* ---------- Transaction Prisma ---------- */
    const planche = await prisma.planche.create({
        data: {
          title,
          files: uploadedFiles,
          audioFiles: uploadedAudios,
          subCategoryId,
          uploadedById: req.user!.id,
        } as any,

        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  catalogue: true,
                },
              },
            },
          },
          
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      })

    return res.status(201).json({
      success: true,
      message: "Planche créée avec succès !",
      data: planche,
    });

  } catch (err: any) {
    console.error("❌ createPlanche error:", err);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
}

export async function getPlanches(req: Request, res: Response) {
  try {
    /* ---------- Query params ---------- */
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const skip = (page - 1) * limit

    const search = req.query.search?.toString()
    const subCategoryId = req.query.subCategoryId?.toString()
    const categoryId = req.query.categoryId?.toString()
    const catalogueId = req.query.catalogueId?.toString()

    /* ---------- Where clause ---------- */
    const where: Prisma.PlancheWhereInput = {}

    /* --- Global search --- */
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          uploadedBy: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          subCategory: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          subCategory: {
            category: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ]
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId
    }

    /* --- Relation filters (merge-safe) --- */
    if (categoryId || catalogueId) {
      where.subCategory = {
        category: {
          ...(categoryId && { id: categoryId }),
          ...(catalogueId && { catalogueId }),
        },
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
  } catch (error) {
    console.error("❌ getPlanches error:", error)
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
    
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { id } = req.params;
    const { title, subCategoryId } = req.body;

    const planche = await prisma.planche.findUnique({ 
      where: { id },
      include: {
        subCategory: true,
        uploadedBy: true
      }
    });
    
    if (!planche) {
      return res.status(404).json({ message: "Planche introuvable" });
    }

    if (subCategoryId && subCategoryId !== planche.subCategoryId) {
      const subCategoryExists = await prisma.subCategory.findUnique({
        where: { id: subCategoryId },
      });
      
      if (!subCategoryExists) {
        return res.status(404).json({
          message: "Sous-catégorie non trouvée",
        });
      }
    }

    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (subCategoryId !== undefined) {
      updateData.subCategoryId = subCategoryId;
    }

    const files = req.files as {
      planche?: Express.Multer.File[];
      audios?: Express.Multer.File[];
    };

    const filesToRemove = req.body.removeFiles ? JSON.parse(req.body.removeFiles) : [];
    const audiosToRemove = req.body.removeAudios ? JSON.parse(req.body.removeAudios) : [];

    if (filesToRemove.length > 0) {
      for (const fileUrl of filesToRemove) {
        const publicId = extractPublicIdFromUrl(fileUrl);
        if (publicId) {
          try {

            await cloudinary.uploader.destroy(publicId, {
              resource_type: fileUrl.includes('.pdf') ? 'image' : 'image'
            });

          } catch (cloudinaryError) {
            console.error(`❌ Erreur suppression Cloudinary pour ${publicId}:`, cloudinaryError);
          }
        }
      }
    }

    if (audiosToRemove.length > 0) {
      for (const audioUrl of audiosToRemove) {
        const publicId = extractPublicIdFromUrl(audioUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: 'video'
            });
            console.log(`✅ Audio supprimé de Cloudinary: ${publicId}`);
          } catch (cloudinaryError) {
            console.error(`❌ Erreur suppression audio Cloudinary pour ${publicId}:`, cloudinaryError);
          }
        }
      }
    }

    const filteredFiles = planche.files.filter(file => !filesToRemove.includes(file));
    const filteredAudios = planche.audioFiles.filter(audio => !audiosToRemove.includes(audio));

    const newFiles: string[] = [];
    if (files?.planche && files.planche.length > 0) {
      for (const file of files.planche) {
        const isPDF = file.mimetype === 'application/pdf';
        const upload = await cloudinary.uploader.upload(file.path, {
          folder: "mont-sinai/planches",
          resource_type: isPDF ? "raw" : "image",
          ...(isPDF && { format: 'pdf' }),
          timeout: 60000,
          type  : 'upload'
        });
        newFiles.push(upload.secure_url);
      }
    }

    const newAudios: string[] = [];
    if (files?.audios && files.audios.length > 0) {
      for (const audio of files.audios) {
        const upload = await cloudinary.uploader.upload(audio.path, {
          folder: "mont-sinai/audios",
          resource_type: "video",
          timeout: 60000,
        });
        newAudios.push(upload.secure_url);
      }
    }

    if (filesToRemove.length > 0 || (files?.planche && files.planche.length > 0)) {
      updateData.files = [...filteredFiles, ...newFiles];
    }
    
    if (audiosToRemove.length > 0 || (files?.audios && files.audios.length > 0)) {
      updateData.audioFiles = [...filteredAudios, ...newAudios];
    }

    const updated = await prisma.planche.update({
      where: { id },
      data: updateData,
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
    });

    res.json({ 
      success: true, 
      message: "Planche mise à jour avec succès",
      data: updated 
    });

  } catch (err: any) {
    console.error("❌ updatePlanche error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur lors de la mise à jour" 
    });
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

 