"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultContacts, dispatchStorageKey, validPhone, type PublicContacts } from "@/lib/public-contacts";

const ContactContext = createContext<PublicContacts | null>(null);

export function ContactProvider({ contacts, children }: { contacts: PublicContacts; children: ReactNode }) {
  useEffect(() => {
    try { localStorage.setItem(dispatchStorageKey, contacts.dispatchPhone); } catch { /* Storage can be unavailable offline or in private mode. */ }
  }, [contacts.dispatchPhone]);
  return <ContactContext.Provider value={contacts}>{children}</ContactContext.Provider>;
}

export function usePublicContacts(): PublicContacts {
  return useContext(ContactContext) ?? defaultContacts;
}

// The global error document can render outside the root layout and provider.
export function useDispatchPhone(): string {
  const contacts = useContext(ContactContext);
  const [lastKnown, setLastKnown] = useState<string>(defaultContacts.dispatchPhone);
  useEffect(() => {
    if (contacts) return;
    try {
      const saved = localStorage.getItem(dispatchStorageKey);
      if (saved && validPhone(saved)) setLastKnown(saved);
    } catch { /* The bundled emergency number is available on first visit. */ }
  }, [contacts]);
  return contacts?.dispatchPhone ?? lastKnown;
}
