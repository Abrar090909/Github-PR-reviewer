import { Check } from "lucide-react";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";

const CONTACT = "mailto:abrar.dev26@gmail.com";

const PLANS = [
  {
    name: "Free",
    status: "Available now",
    price: "$0",
    per: null,
    for: "Public repositories",
    covers: null,
    features: [
      "Architecture and data-flow diagrams",
      "Code review with inline comments",
      "Walkthrough and the interactive map",
      "One comment per PR, kept current",
      "Fair-use limits apply",
    ],
    cta: "Add to GitHub",
    href: GITHUB_APP_INSTALL_URL,
    primary: true,
  },
  {
    name: "Team",
    status: "Planned · not on sale",
    price: "$16",
    per: "per developer / month",
    for: "Private repositories",
    covers: "Everything in Free, on private repositories, plus team billing and administration.",
    features: ["Everything in Free", "Private repository analysis", "Team billing and administration"],
    cta: "Ask about Team",
    href: `${CONTACT}?subject=Contour%20Team%20plan`,
    primary: false,
  },
  {
    name: "Enterprise",
    status: "Planned · not on sale",
    price: "Custom",
    per: null,
    for: "Requirements discussed first",
    covers: null,
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
        <p className="lede">Paid plans are planned and not on sale yet. Installing Contour never asks for payment.</p>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.primary
                  ? "border-accent/50 bg-ink-800 p-7 shadow-[0_16px_48px_rgb(var(--shadow))]"
                  : "border-line bg-ink-850"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`${plan.primary ? "text-xl" : "text-lg"} font-medium`}>{plan.name}</h3>
                <span className={plan.primary ? "chip border-accent/40 bg-accent/15 text-accent" : "chip-unchanged"}>{plan.status}</span>
              </div>
              <p className="mt-1 text-[15px] text-fg-2">{plan.for}</p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className={`${plan.primary ? "text-5xl" : "text-[32px]"} font-medium leading-none tabular-nums`}>{plan.price}</span>
                {plan.per && <span className="text-sm text-fg-2">{plan.per}</span>}
              </p>
              {plan.covers && <p className="mt-3 text-[13px] leading-5 text-fg-3">{plan.covers}</p>}
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-[15px] leading-6 text-fg-2">
                    <Check size={16} strokeWidth={2} className={`mt-1 shrink-0 ${plan.primary ? "text-accent" : "text-fg-3"}`} aria-hidden="true" />
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
