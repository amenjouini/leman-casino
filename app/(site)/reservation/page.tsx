import type { Metadata } from "next";
import { LookupForm } from "@/components/booking/ManageForms";

export const metadata: Metadata = { title: "Retrouver ma réservation", robots: { index: false } };

export default function LookupPage() {
  return (
    <section className="pb-24 pt-10 lg:pt-14">
      <div className="container-x max-w-md">
        <p className="eyebrow">Espace joueur</p>
        <h1 className="mt-3 text-5xl leading-none text-ivory">Retrouver ma réservation</h1>
        <p className="mt-4 text-mist">Saisissez la référence reçue lors de votre demande et l’e-mail utilisé pour consulter, modifier ou annuler votre réservation.</p>
        <div className="surface mt-8 p-6">
          <LookupForm />
        </div>
      </div>
    </section>
  );
}
