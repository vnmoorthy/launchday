import { Auth0Client } from "@auth0/nextjs-auth0/server";

const configured = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET,
);

export const auth0 = configured ? new Auth0Client() : null;
export const hasAuth0Configuration = configured;
