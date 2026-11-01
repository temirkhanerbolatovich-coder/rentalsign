import { T } from "@/components/language";

const sections = [
  {
    title: "Заселение и оплата",
    start: 1,
    rules: [
      "Заселение — с 14:00, выселение — до 11:00.",
      "При заезде предъявить администратору удостоверение личности.",
      "Оплата за все оставшиеся дни — сразу после заезда.",
      "За каждый час задержки после 11:00 — дополнительная оплата.",
    ],
  },
  {
    title: "Тишина и порядок",
    start: 5,
    rules: [
      "После 22:00 — соблюдать тишину. Нарушителей выселяем без предупреждения.",
      "Курение в квартире запрещено — штраф 100 000 тг.",
      "Вечеринки и шумные посиделки строго запрещены. Стены тонкие — вы можете помешать соседям. При жалобах от соседей — моментальное выселение без возврата денег.",
    ],
  },
  {
    title: "Чистота и бережное отношение",
    start: 8,
    rules: [
      "Мусор и остатки еды убирать самостоятельно и оставлять пакет у двери при выезде.",
      "Не проливать жидкости на технику и мебель.",
      "Не трогать стены и мебель грязными/жирными руками.",
      "Не оставлять после себя посторонние запахи.",
      "Не выносить из квартиры бытовую химию, полотенца и другие вещи.",
    ],
  },
  {
    title: "Ответственность",
    start: 13,
    rules: [
      "За сломанные вещи — компенсация от 5 000 до 10 000 тг (в зависимости от предмета).",
      "Квартира проверяется при выезде. Ущерб оплачивается по акту приёма-передачи на Kaspi счёт.",
    ],
  },
  {
    title: "Контакты",
    start: 15,
    rules: ["По всем вопросам — обращаться к администрации."],
  },
];

export function HouseRules() {
  return (
    <section
      className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6"
      aria-labelledby="house-rules-title"
    >
      <h2
        id="house-rules-title"
        className="text-lg font-semibold text-slate-900"
      >
        <T text="Правила проживания" />
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        <T text="Уважаемые гости! Просим внимательно ознакомиться с правилами до заселения:" />
      </p>
      <div className="mt-5 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-slate-900">
              <T text={section.title} />
            </h3>
            <ol
              start={section.start}
              className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600"
            >
              {section.rules.map((rule) => (
                <li key={rule}>
                  <T text={rule} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        <T text="Просим отнестись к чужому труду и имуществу с уважением." />
      </p>
      <p className="mt-2 text-sm font-medium text-slate-700">
        <T text="Желаем вам комфортного и приятного проживания!" />
      </p>
    </section>
  );
}
