import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CARole } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentUserProfile = await prisma.cAProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (currentUserProfile?.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can change roles" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { role, hubspotOwnerId } = await req.json();

    // Validate role if provided
    if (role && !Object.values(CARole).includes(role)) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      );
    }

    // Update or create CAProfile
    const updatedProfile = await prisma.cAProfile.upsert({
      where: { userId: id },
      update: {
        ...(role && { role }),
        ...(hubspotOwnerId !== undefined && { hubspotOwnerId }),
      },
      create: {
        userId: id,
        role: role || "member",
        hubspotOwnerId: hubspotOwnerId || null,
      },
    });

    return NextResponse.json({
      id,
      role: updatedProfile.role,
      hubspotOwnerId: updatedProfile.hubspotOwnerId,
    });
  } catch (error) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { message: "Failed to update team member" },
      { status: 500 }
    );
  }
}

