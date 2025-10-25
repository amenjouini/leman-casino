"use client";
import { motion } from "framer-motion";
import { useTranslation } from "../i18n"; // 👈 import your local i18n file

export function LemanPresentation() {
  const { t, i18n } = useTranslation();

  const sections = [
    { title: t("welcome"), text: t("welcome_desc") },
    { title: t("space"), text: t("space_desc") },
    { title: t("tournmanets"), text: t("tournmanets_desc") },
    { title: t("team"), text: t("team_desc") },
    { title: t("club"), text: t("club_desc") },
  ];

  return (
    <>
      <section className="bg-black text-gold min-h-screen flex flex-col justify-center items-center font-[Playfair_Display]">
        {sections.map((s, i) => (
          <motion.div
            key={i}
            className="max-w-3xl text-center py-20 px-6"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: i * 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">{s.title}</h2>
            <p className="text-lg text-white/90 leading-relaxed">{s.text}</p>
            <h1>hii this is :
              {t("welcome")}
            </h1>
          </motion.div>
        ))}
      </section>

      {/* Language Switcher */}
      <div className="text-center py-6 bg-black">
        <button
          onClick={() => i18n.changeLanguage("en")}
          className="mx-2 px-4 py-2 bg-white text-black rounded"
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage("fr")}
          className="mx-2 px-4 py-2 bg-white text-black rounded"
        >
          Français
        </button>
      </div>
    </>
  );
}
