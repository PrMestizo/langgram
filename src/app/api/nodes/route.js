import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET() {
  try {
    console.log('Prisma client initialized:', !!prisma);
    const models = Object.keys(prisma).filter(key => typeof prisma[key]?.findMany === 'function');
    console.log('Available models:', models);
    
    const nodes = await prisma.nodeTemplate.findMany();
    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Error in /api/nodes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prismaError: error.code
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch nodes",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
