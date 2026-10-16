import { PageHero } from "./Section";
import { RichText } from "./RichText";

export function LegalPage({ title, text, fallback, children }: { title: string; text: string; fallback?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <>
      <PageHero title={title} />
      <section className="py-16 lg:py-20">
        <div className="container-x max-w-3xl">
          {text.trim() ? (
            <RichText text={text} />
          ) : (
            fallback ?? (
              <p className="rounded-2xl border border-dashed border-white/15 p-8 text-mist">
                Ce contenu est en cours de rédaction par l’établissement. Pour toute question, utilisez nos coordonnées de contact.
              </p>
            )
          )}
          {children}
        </div>
      </section>
    </>
  );
}
