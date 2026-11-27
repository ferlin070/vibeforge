const malay = Object.freeze({
  Overview: "Gambaran keseluruhan",
  "My projects": "Projek saya",
  "Project studio": "Studio projek",
  "Template library": "Pustaka templat",
  Workflow: "Aliran kerja",
  Documentation: "Dokumentasi",
  "Prompt lab": "Makmal prompt",
  "AI blueprint": "Pelan induk AI",
  "GitHub intelligence": "Analisis GitHub",
  "Context manager": "Pengurus konteks",
  "Agent hub": "Pusat ejen",
  "Mission control": "Kawalan misi",
  "Quality studio": "Studio kualiti",
  "Workspace operations": "Operasi ruang kerja",
  "Cloud account": "Akaun awan",
  "Team collaboration": "Kolaborasi pasukan",
  "Help & privacy": "Bantuan & privasi",
  Workspace: "Ruang kerja",
  Build: "Bina",
  Verify: "Sahkan",
  Account: "Akaun",
  "My workspace": "Ruang kerja saya",
  "Personal workspace": "Ruang kerja peribadi",
  "Workspace navigation": "Navigasi ruang kerja",
  "Workspace sidebar": "Bar sisi ruang kerja",
  "Cloud session active": "Sesi awan aktif",
  "Local-first mode": "Mod setempat",
  "Cloud backups are manual. Local data stays on this browser.":
    "Sandaran awan dilakukan secara manual. Data setempat kekal dalam pelayar ini.",
  "Local projects stay on this browser. Sign in for cloud snapshots.":
    "Projek setempat kekal dalam pelayar ini. Log masuk untuk sandaran awan.",
  "Back to website": "Kembali ke laman web",
  "Skip to content": "Langkau ke kandungan",
  "Close navigation": "Tutup navigasi",
  "Toggle navigation": "Buka atau tutup navigasi",
  "Sign in": "Log masuk",
  "New project": "Projek baharu",
  "Interface language": "Bahasa antara muka",
  "Navigation and operations only; other modules remain in English.":
    "Navigasi dan operasi sahaja; modul lain kekal dalam bahasa Inggeris.",
  "Local projects and recorded evidence only. Not platform administration or live service monitoring.":
    "Projek setempat dan bukti yang direkod sahaja. Bukan pentadbiran platform atau pemantauan perkhidmatan langsung.",
  Projects: "Projek",
  "Open critical/high bugs": "Bug kritikal/tinggi terbuka",
  "Blocked/unapproved tasks": "Tugasan tersekat/belum diluluskan",
  "Awaiting review": "Menunggu semakan",
  "Missing release gates": "Syarat pelepasan belum dipenuhi",
  "Project priority": "Keutamaan projek",
  "Reviewed tasks": "Tugasan disemak",
  "Inspect quality": "Semak kualiti",
  "Continue work": "Sambung kerja",
  "Export aggregate report": "Eksport laporan ringkas",
  "No local projects.": "Tiada projek setempat.",
  "Create project": "Cipta projek",
  "No matching projects.": "Tiada projek sepadan.",
  "Show more": "Papar lagi",
  "Search projects": "Cari projek",
  "Export requested.": "Eksport diminta.",
});

export function normalizeLanguage(value) {
  return value === "ms" ? "ms" : "en";
}

export function translate(language, key) {
  return language === "ms" && Object.hasOwn(malay, key) ? malay[key] : key;
}
