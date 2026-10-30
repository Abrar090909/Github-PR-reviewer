import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";

const CONTACT = "mailto:abrar.dev26@gmail.com";

const PLANS = [
  {
    name: "Free",
    status: "available now",
    price: "$0",
    per: null,
    for: "Public repositories",
    features: ["Architecture and data-flow diagrams", "Walkthrough and diff evidence", "One comment per PR, kept current", "Fair-use limits apply"],
    cta: "Add to GitHub",
    href: GITHUB_APP_INSTALL_URL,
    primary: true,
  },
  {
    name: "Team",
    status: "planned",
    price: "$16",
    per: "per developer / month",
    for: "Private repositories",
    features: ["Everything in Free", "Private repository analysis", "Team billing and administration"],
    cta: "Ask about Team",
    href: `${CONTACT}?subject=Contour%20Team%20plan`,
    primary: false,
  },
  {
    name: "Enterprise",
    status: "planned",
    price: "Custom",
    per: null,
    for: "Requirements discussed first",
    features: ["Everything in Team", "Terms agreed before purchase"],
    cta: "Contact us",
    href: `${CONTACT}?subject=Contour%20Enterprise`,
    primary: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Pricing</p>
        <h2 className="heading">Free for public repositories</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-fg-2">
          Paid plans are planned and not on sale yet. Installing Contour never asks for payment.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.primary ? "border-fg/15 bg-ink-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "border-line bg-ink-850"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[17px] font-medium">{plan.name}</h3>
                <span className={`font-mono text-xs ${plan.primary ? "text-accent" : "text-fg-3"}`}>{plan.status}</span>
              </div>
              <p className="mt-1 text-sm text-fg-2">{plan.for}</p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-[32px] font-medium leading-none tabular-nums">{plan.price}</span>
                {plan.per && <span className="text-sm text-fg-3">{plan.per}</span>}
              </p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm leading-6 text-fg-2">
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                target={plan.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`${plan.primary ? "btn-primary" : "btn-secondary"} mt-8 w-full`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
