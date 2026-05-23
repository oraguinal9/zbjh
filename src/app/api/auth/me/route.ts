import { getCurrentUser } from "@/lib/supabase";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ email: null });
    return Response.json({
      email: user.email,
      id: user.id,
      created_at: user.created_at,
    });
  } catch (error: any) {
    console.error("[获取用户信息]", error.message);
    return Response.json({ email: null }, { status: 500 });
  }
}
