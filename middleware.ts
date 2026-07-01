import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const currentHost = hostname.replace(/:\d+$/, "").split(".")[0];

  const reserved = ["kls3-dev", "www", "auto-ecole", "localhost"];
  const isVercelPreview = hostname.includes("vercel.app");

  if (reserved.includes(currentHost) || isVercelPreview) {
    return NextResponse.next();
  }

  // /login reste une route globale même sur un sous-domaine tenant
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/tenant/${currentHost}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
