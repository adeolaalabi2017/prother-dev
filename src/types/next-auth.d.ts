import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string | null;
      createdAt?: Date;
    } & DefaultSession["user"];
  }

  interface User {
    handle?: string | null;
    createdAt?: Date;
  }
}
