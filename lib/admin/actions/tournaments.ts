"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actorOf, requireUser } from "../../auth/session";
import { createTournament, duplicateTournament, setTournamentStatus, updateTournament } from "../../tournaments";
import { parseTournamentForm } from "../tournament-form";
import { runAction, str, FormError, type ActionState } from "../action";

const uuid = z.uuid();

export async function saveTournamentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    const user = await requireUser("tournaments.manage");
    const parsed = parseTournamentForm(fd);
    if ("errors" in parsed) throw new FormError("Veuillez corriger les champs signalés.", parsed.errors);
    const id = str(fd, "id");
    if (id) {
      await updateTournament(uuid.parse(id), parsed.fields, actorOf(user));
      revalidatePath("/admin", "layout");
      revalidatePath("/", "layout");
      return "Tournoi enregistré.";
    }
    const t = await createTournament(parsed.fields, actorOf(user));
    createdId = t.id;
  });
  if (createdId) {
    revalidatePath("/", "layout");
    redirect(`/admin/tournois/${createdId}?cree=1`);
  }
  return result;
}

export async function tournamentStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("tournaments.manage");
    const id = uuid.parse(str(fd, "id"));
    const status = z.enum(["draft", "published", "archived"]).parse(str(fd, "status"));
    await setTournamentStatus(id, status, actorOf(user));
    revalidatePath("/admin", "layout");
    revalidatePath("/", "layout");
    return { draft: "Tournoi dépublié (brouillon).", published: "Tournoi publié.", archived: "Tournoi archivé." }[status];
  });
}

export async function duplicateTournamentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let copyId: string | null = null;
  const result = await runAction(async () => {
    const user = await requireUser("tournaments.manage");
    const copy = await duplicateTournament(uuid.parse(str(fd, "id")), actorOf(user));
    copyId = copy.id;
  });
  if (copyId) redirect(`/admin/tournois/${copyId}?copie=1`);
  return result;
}
