// ============================================================
// pages/_app.js
// Wraps the entire app with Auth0 UserProvider so every page
// can access the current user via useUser() hook
// ============================================================

import { UserProvider } from "@auth0/nextjs-auth0/client";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
