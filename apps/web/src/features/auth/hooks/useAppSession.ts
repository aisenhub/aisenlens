import { useEffect, useState } from "react";
import type { UserProfile } from "../types";
import { getCurrentSession, onAuthStateChange, signOut } from "../../../services/auth/auth";
import { clearPlatformSession, exchangePlatformSession, getPlatformSession } from "../../../services/aisenhub/client";
import { getCurrentProfile } from "../../../services/aisenhub/profile";

export default function useAppSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getCurrentSession()
      .then(async (authSession) => {
        if (!isMounted) return;
        const platformSession = authSession
          ? await exchangePlatformSession(authSession.access_token)
          : await getPlatformSession();
        if (!isMounted) return;
        setIsLoggedIn(platformSession.data.authenticated);
        if (platformSession.data.authenticated) {
          void getCurrentProfile().then((profile) => {
            if (isMounted) setCurrentProfile(profile);
          });
        }
      })
      .catch(() => {
        if (isMounted) setIsLoggedIn(false);
      });

    const { data: { subscription } } = onAuthStateChange((session) => {
      if (!session) {
        clearPlatformSession();
        setCurrentProfile(null);
        setIsLoggedIn(false);
        return;
      }
      void exchangePlatformSession(session.access_token)
        .then(() => getCurrentProfile())
        .then((profile) => {
          if (isMounted) {
            setIsLoggedIn(Boolean(profile));
            setCurrentProfile(profile);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoggedIn(false);
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      clearPlatformSession();
      setIsLoggedIn(false);
      setCurrentProfile(null);
    }
  };

  return { isLoggedIn, currentProfile, setIsLoggedIn, setCurrentProfile, handleSignOut };
}
