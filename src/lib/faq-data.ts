/**
 * Shared FAQ data for Prother. Plain (non-"use client") module so both client
 * components (Faq accordion) and server components (the /about JSON-LD) can
 * import the real array — client-module exports become opaque client
 * references on the server, and calling .map on one crashes prerender.
 */
export const FAQS = [
  {
    q: "What is Prother?",
    a: "A curated search and discovery directory for AI products and tools. Every listing is indexed across eight categories (AI models, conversational AI, generative content, NLP utilities, computer vision, data analytics, automation, and developer platforms) with honest pricing, real reviews, and side-by-side comparisons.",
  },
  {
    q: "How are tools ranked?",
    a: "Editorial curation first: Editor's Pick and curated badges are earned through hands-on testing, never payment. Within the directory, listings surface by review ratings and trending engagement (comments, reviews, and saves). Sponsored slots exist and are always labeled; they never touch organic results.",
  },
  {
    q: "Do you host launches?",
    a: "No. Prother is a pure directory: no launch days, no upvoting, no leaderboards. Tools are listed once they pass our six published standards, and they stay listed on merit. Want the newest arrivals? Sort the directory by newest.",
  },
  {
    q: "How much does it cost?",
    a: "Free for users, forever: browsing, search, collections, and reviews. Listings are free for makers too. The only paid thing on Prother is clearly labeled advertising, and it never influences ranking or editorial picks.",
  },
];
