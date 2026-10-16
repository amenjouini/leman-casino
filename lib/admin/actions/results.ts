"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorOf, requireUser } from "../../auth/session";
import { resultRowSchema, saveResults } from "../../results";
import { runAction, str, bool, FormError, type ActionState } from "../action";

export async function saveResultsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("tournaments.manage");
    const tournamentId = z.uuid().parse(str(fd, "tournamentId"));
    let raw: unknown;
    try {
      raw = JSON.parse(str(fd, "rows") || "[]");
    } catch {
      throw new FormError("Classement illisible.");
    }
    const rows = z.array(resultRowSchema).max(500).safeParse(raw);
    if (!rows.success) {
      const issue = rows.error.issues[0];
      throw new FormError(`Ligne ${Number(issue.path[0]) + 1} : ${issue.message}`);
    }
    const entriesRaw = str(fd, "entriesCount").trim();
    const entriesCount = entriesRaw === "" ? null : Number(entriesRaw);
    if (entriesCount !== null && (!Number.isInteger(entriesCount) || entriesCount < 0 || entriesCount > 100000)) {
      throw new FormError("Nombre d’entrées invalide.");
    }
    const published = bool(fd, "published");
    await saveResults(tournamentId, { entriesCount, published, rows: rows.data }, actorOf(user));
    revalidatePath("/resultats");
    revalidatePath(`/admin/tournois/${tournamentId}`);
    return published && rows.data.length ? "Classement enregistré et publié." : "Classement enregistré (non publié).";
  });
}
