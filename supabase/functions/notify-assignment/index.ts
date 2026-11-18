// Edge Function : envoie un email via Gmail (SMTP) quand une demande de
// liaison ou une tâche assignée nécessite de prévenir l'autre personne.
//
// Secrets à configurer (Studio -> Edge Functions -> Secrets) :
//   GMAIL_USER         - jppcompta@gmail.com
//   GMAIL_APP_PASSWORD - mot de passe d'application à 16 caractères
//                         (compte Google -> Sécurité -> Validation en 2 étapes
//                         -> Mots de passe des applications)
//   SUPABASE_URL       - déjà présent par défaut sur la plupart des instances
//   SUPABASE_ANON_KEY  - la clé publishable (la même que dans index.html)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") || "";
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return json({ error: "GMAIL_USER / GMAIL_APP_PASSWORD non configurés" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return json({ error: "Non authentifié" }, 401);

  let payload: { type?: string; target_email?: string; task_text?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { type, target_email, task_text } = payload;
  if (!type || !target_email) return json({ error: "Champs manquants" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Session invalide" }, 401);
  const caller = userRes.user;

  // On vérifie côté serveur qu'il existe bien une vraie demande/tâche
  // correspondante, plutôt que de faire confiance à ce que le client affirme.
  let subject = "";
  let html = "";

  if (type === "link_request") {
    const { data: link } = await supabase
      .from("contact_links")
      .select("id")
      .eq("requester_id", caller.id)
      .eq("target_email", target_email)
      .eq("status", "pending")
      .maybeSingle();
    if (!link) return json({ error: "Aucune demande correspondante" }, 403);
    subject = `${caller.email} veut se lier sur Organizator`;
    html = `<p><b>${escapeHtml(caller.email || "")}</b> aimerait se lier à toi sur Organizator pour pouvoir t'assigner des tâches.</p>
      <p>Ouvre l'app et va dans Réglages pour accepter ou refuser.</p>`;
  } else if (type === "task_assigned") {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("owner_id", caller.id)
      .eq("assignee_email", target_email)
      .eq("archived", false)
      .maybeSingle();
    if (!task) return json({ error: "Aucune tâche correspondante" }, 403);
    subject = `Nouvelle tâche assignée par ${caller.email}`;
    html = `<p><b>${escapeHtml(caller.email || "")}</b> t'a assigné une tâche sur Organizator :</p>
      <p style="font-size:16px"><b>${escapeHtml(task_text || "")}</b></p>
      <p>Ouvre l'app pour la voir.</p>`;
  } else {
    return json({ error: "Type inconnu" }, 400);
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });

  try {
    await client.send({
      from: GMAIL_USER,
      to: target_email,
      subject,
      html,
      content: "auto",
    });
  } catch (err) {
    return json({ error: "Échec envoi SMTP: " + (err as Error).message }, 502);
  } finally {
    await client.close();
  }

  return json({ ok: true });
});
