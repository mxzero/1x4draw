import { Role, Tier } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: Role;
      tier: Tier;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: Role;
    tier: Tier;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    tier: Tier;
  }
}
