"use client";

import React, { useState } from "react";
import { Building2 } from "lucide-react";

interface CompanyLogoProps {
  company?: string | null;
  size?: number;
  className?: string;
  showFallbackBuilding?: boolean;
}

/**
 * Preloaded high-fidelity vector SVGs for the most common tech companies.
 * Ensures instant 0ms render, zero network requests, and pixel-perfect fidelity.
 */
function renderPreloadedLogo(companyNormalized: string, size: number) {
  switch (companyNormalized) {
    case "microsoft":
    case "microsoft corporation":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" rx="1" />
          <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" rx="1" />
          <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
          <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" rx="1" />
        </svg>
      );

    case "google":
    case "alphabet":
    case "google llc":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      );

    case "apple":
    case "apple inc":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-zinc-900">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.66-.8 1.11-1.92.99-3.04-.95.04-2.1.63-2.78 1.43-.6.69-1.12 1.83-1 2.93 1.07.08 2.13-.52 2.79-1.32z" />
        </svg>
      );

    case "meta":
    case "facebook":
    case "meta platforms":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M6.23 6.01c-3.19 0-5.23 2.4-5.23 5.99 0 3.68 2.12 6.01 5.07 6.01 2.29 0 3.76-1.39 5.09-3.32 1.34 1.93 2.8 3.32 5.09 3.32 2.95 0 5.07-2.33 5.07-6.01 0-3.59-2.04-5.99-5.23-5.99-2.54 0-4.08 1.54-5.07 3.1-1-1.56-2.54-3.1-4.79-3.1zm-.05 2.15c1.47 0 2.65 1.09 3.51 2.62-1.05 1.88-2.22 3.09-3.46 3.09-1.74 0-2.88-1.52-2.88-3.86 0-2.33 1.14-3.85 2.83-3.85zm10.74 0c1.69 0 2.83 1.52 2.83 3.85 0 2.34-1.14 3.86-2.88 3.86-1.24 0-2.41-1.21-3.46-3.09.86-1.53 2.04-2.62 3.51-2.62z"
            fill="#0668E1"
          />
        </svg>
      );

    case "amazon":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-amber-500">
          <path d="M15.42 16.58c-3.32 2.45-8.15 3.75-12.3 1.25-.23-.14-.42.1-.25.29 2.28 2.61 6.32 3.88 10.37 3.88 2.55 0 5.22-.55 7.6-1.77.37-.19.34-.63-.04-.54-1.7.4-3.56.55-5.38.39zm4.27-.92c-.43-.55-2.83-.26-3.92-.13-.33.04-.38-.25-.09-.46 1.91-1.34 5.03-.95 5.4 1.41.13.82-.44 1.95-1.08 2.48-.25.21-.49.1-.38-.17.37-.92.51-2.58.07-3.13z" />
          <path d="M14.36 10.33c0-1.72-.08-3.16-1.52-4.23-1.2-.89-2.84-1.24-4.34-1.24-2.48 0-4.9.89-5.46 3.56-.07.35.15.54.45.57l2.12.21c.29-.02.43-.22.49-.49.33-1.42 1.34-1.99 2.57-1.99 1.05 0 2.14.49 2.14 1.76v.56c-1.32.08-3.04.14-4.41.74-1.8.78-2.69 2.07-2.69 3.89 0 2.28 1.55 3.63 3.65 3.63 1.71 0 2.87-.71 3.57-1.89h.08c.19 1.15.33 1.63 1.5 1.63h1.99c.34 0 .5-.26.5-.56v-7.98zm-3.53 4.19c-.31.81-1.06 1.4-1.94 1.4-.95 0-1.52-.65-1.52-1.59 0-1.35 1.06-1.86 2.31-1.94 1.15-.08 1.15-.08 1.15.53v1.6z" />
        </svg>
      );

    case "stripe":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect width="24" height="24" rx="5" fill="#635BFF" />
          <path
            d="M13.84 8.78c0-.79-.65-1.1-1.72-1.1-.98 0-2.22.37-3.2.9V6.05c1.08-.43 2.25-.62 3.4-.62 2.68 0 4.47 1.32 4.47 3.86 0 3.73-5.12 3.13-5.12 4.74 0 .95.83 1.25 2.02 1.25 1.22 0 2.65-.5 3.66-1.12v2.55c-1.18.52-2.48.74-3.79.74-2.8 0-4.83-1.34-4.83-3.89-.01-4.04 5.11-3.32 5.11-4.78z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "figma":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M8 24C10.2091 24 12 22.2091 12 20V16H8C5.79086 16 4 17.7909 4 20C4 22.2091 5.79086 24 8 24Z" fill="#0ACF83" />
          <path d="M4 12C4 9.79086 5.79086 8 8 8H12V16H8C5.79086 16 4 14.2091 4 12Z" fill="#A259FF" />
          <path d="M4 4C4 1.79086 5.79086 0 8 0H12V8H8C5.79086 8 4 6.20914 4 4Z" fill="#F24E1E" />
          <path d="M12 0H16C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8H12V0Z" fill="#FF7262" />
          <path d="M20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12Z" fill="#1ABCFE" />
        </svg>
      );

    case "netflix":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect width="24" height="24" rx="4" fill="#000000" />
          <path d="M6 3.5V20.5L9.5 19V3.5H6Z" fill="#E50914" />
          <path d="M14.5 3.5L9.5 19L14.5 20.5V3.5H14.5Z" fill="#B81D24" />
          <path d="M14.5 3.5V20.5L18 19V3.5H14.5Z" fill="#E50914" />
        </svg>
      );

    case "spotify":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <circle cx="12" cy="12" r="11" fill="#1ED760" />
          <path
            d="M17.15 15.65c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.35.1-.7-.15-.8-.5-.1-.35.15-.7.5-.8 4.1-1 7.6-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.25.4-.75.5-1.15.25-2.85-1.75-7.2-2.25-10.6-1.25-.45.15-.95-.1-1.1-.55-.15-.45.1-.95.55-1.1 3.9-1.15 8.7-.6 11.9 1.4.4.25.5.8.3 1.25zm.1-2.8c-3.45-2.05-9.15-2.25-12.45-1.25-.55.15-1.1-.15-1.25-.7-.15-.55.15-1.1.7-1.25 3.8-1.15 10.1-.9 14.1 1.45.5.3.65.95.35 1.45-.3.45-.95.6-1.45.3z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "openai":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect width="24" height="24" rx="5" fill="#10A37F" />
          <path
            d="M19.5 10.5c-.2-1.4-.9-2.6-2-3.4-.4-.3-.8-.5-1.3-.7-.2-.6-.5-1.2-.9-1.7-1.1-1.3-2.7-2-4.4-1.9-1.2.1-2.3.6-3.1 1.4-.4-.2-.8-.3-1.3-.3-1.9 0-3.6 1.2-4.2 3-.5.4-.8.9-1.1 1.4-.8 1.6-.7 3.4.1 4.9.2 1.4.9 2.6 2 3.4.4.3.8.5 1.3.7.2.6.5 1.2.9 1.7 1.1 1.3 2.7 2 4.4 1.9 1.2-.1 2.3-.6 3.1-1.4.4.2.8.3 1.3.3 1.9 0 3.6-1.2 4.2-3 .5-.4.8-.9 1.1-1.4.8-1.6.7-3.4-.1-4.9zm-7.5 7.5c-1.5 0-2.8-.7-3.5-1.9l1.6-1c.4.7 1.1 1.1 1.9 1.1 1.2 0 2.2-1 2.2-2.2v-1.1l1.5.9c-.1 2.3-1.8 4.2-3.7 4.2zm-4.7-2.7c-.5-.8-.7-1.8-.5-2.8l1.8.5c-.1.6 0 1.2.3 1.8-.6.2-1.1.4-1.6.5zm-1.1-4.8c.3-.9.9-1.6 1.7-2.1l1 1.6c-.5.3-.9.7-1.1 1.3l-1.6-.8zm5.8-3.5c1.5 0 2.8.7 3.5 1.9l-1.6 1c-.4-.7-1.1-1.1-1.9-1.1-1.2 0-2.2 1-2.2 2.2v1.1l-1.5-.9c.1-2.3 1.8-4.2 3.7-4.2zm4.7 2.7c.5.8.7 1.8.5 2.8l-1.8-.5c.1-.6 0-1.2-.3-1.8.6-.2 1.1-.4 1.6-.5zm1.1 4.8c-.3.9-.9 1.6-1.7 2.1l-1-1.6c.5-.3.9-.7 1.1-1.3l1.6.8z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "linkedin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect width="24" height="24" rx="4" fill="#0A66C2" />
          <path
            d="M7.1 8.8H4.6V19h2.5V8.8zM5.8 4.8C5 4.8 4.3 5.5 4.3 6.3c0 .8.7 1.5 1.5 1.5.8 0 1.5-.7 1.5-1.5 0-.8-.7-1.5-1.5-1.5zm13.6 8.3c0-3.3-1.8-4.8-4.1-4.8-1.9 0-2.7 1-3.2 1.8V8.8H9.6c.03.7 0 10.2 0 10.2h2.5v-5.7c0-.3 0-.6.1-.8.3-.8 1-1.6 2.2-1.6 1.5 0 2.2 1.2 2.2 2.9v5.2h2.5v-5.9z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "airbnb":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF5A5F" className="shrink-0">
          <path d="M12 2C7.58 2 4 5.58 4 10c0 4.14 4.54 9.4 7.42 12.35.33.34.87.34 1.2 0C15.46 19.4 20 14.14 20 10c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 6.5 12 6.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
      );

    case "uber":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect width="24" height="24" rx="4" fill="#000000" />
          <path
            d="M6 8v8h12V8H6zm10.5 6.5h-9v-5h9v5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return null;
  }
}

/**
 * Normalizes company names to derive public domains for the Google Favicon CDN.
 * e.g., "Microsoft Corporation" -> "microsoft.com", "Stripe Inc" -> "stripe.com"
 */
function cleanCompanyDomain(company: string): string {
  const normalized = company
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|technologies|labs|co|ltd|gmbh)\b/g, "")
    .trim()
    .replace(/[^a-z0-9]/g, "");

  return `${normalized}.com`;
}

export function CompanyLogo({
  company,
  size = 20,
  className = "",
  showFallbackBuilding = true,
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);

  if (!company || !company.trim()) {
    return showFallbackBuilding ? (
      <div
        className={`flex items-center justify-center rounded-md bg-stone-100 text-stone-400 border border-stone-200/80 shadow-2xs shrink-0 ${className}`}
        style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      >
        <Building2 style={{ width: `${size * 0.65}px`, height: `${size * 0.65}px` }} />
      </div>
    ) : null;
  }

  const trimmedCompany = company.trim();
  const companyKey = trimmedCompany.toLowerCase();

  // 1. First Priority: Check preloaded zero-latency vector SVGs
  const preloaded = renderPreloadedLogo(companyKey, size);
  if (preloaded) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title={trimmedCompany}
      >
        {preloaded}
      </div>
    );
  }

  // 2. Second Priority: Google Favicon CDN if preloaded vector isn't available
  const domain = cleanCompanyDomain(trimmedCompany);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  if (!imageError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-md bg-white border border-stone-200/80 p-0.5 shadow-2xs overflow-hidden shrink-0 ${className}`}
        style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
        title={trimmedCompany}
      >
        <img
          src={faviconUrl}
          alt={`${trimmedCompany} logo`}
          width={size}
          height={size}
          className="object-contain rounded-xs"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // 3. Fallback: LinkedIn-style neutral company emblem with clean monogram
  const initial = trimmedCompany.charAt(0).toUpperCase();

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-stone-100 font-mono font-bold text-stone-600 border border-stone-200 shadow-2xs shrink-0 ${className}`}
      style={{
        width: `${size + 4}px`,
        height: `${size + 4}px`,
        fontSize: `${Math.max(10, Math.floor(size * 0.55))}px`,
      }}
      title={trimmedCompany}
    >
      {initial || <Building2 style={{ width: `${size * 0.65}px`, height: `${size * 0.65}px` }} />}
    </div>
  );
}
