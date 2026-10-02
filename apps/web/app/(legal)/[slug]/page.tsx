import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ContourLogo from "../../components/ContourLogo";

const supportEmail = "abrar.dev26@gmail.com";
const supportPhone = "+91 93484 73185";
const updated = "2 October 2026";

type Section = { heading: string; body: ReactNode };
type Document = { title: string; intro: string; sections: Section[] };

const documents: Record<string, Document> = {
  about: {
    title: "About Contour",
    intro: "Contour is a digital software service for reviewing GitHub pull requests.",
    sections: [
      { heading: "What the service does", body: <p>After you install the Contour GitHub App on selected repositories, Contour reads pull request changes, produces an architecture and risk summary, and posts a diagram and explanation to the pull request. The local CLI can also create diagrams without installing the hosted app.</p> },
      { heading: "Who operates it", body: <p>Contour is currently an independent software project operated from India under the Contour name. For support and business enquiries, use the details on our <Link href="/contact">contact page</Link>.</p> },
      { heading: "How it is delivered", body: <p>Contour is delivered online through the GitHub App and CLI. No physical goods are shipped. See our <Link href="/delivery">delivery policy</Link> for access details.</p> },
    ],
  },
  contact: {
    title: "Contact and support",
    intro: "Reach Contour for product, billing, privacy, refund, or security questions.",
    sections: [
      { heading: "Operator details", body: <><p>Project name: Contour</p><p>Operator: independent developer based in India</p><p>Contour is not currently represented as an incorporated company.</p></> },
      { heading: "Customer support", body: <><p>Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p><p>Phone: <a href="tel:+919348473185">{supportPhone}</a></p><p>Please include your GitHub account or organization, repository, and pull request number when reporting a product issue. Do not email API keys or private source code.</p></> },
      { heading: "Billing and complaints", body: <p>For a payment or refund enquiry, include the order or invoice identifier. You can also use this address to request access to or deletion of personal data. We aim to acknowledge support requests within two business days.</p> },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This policy explains how Contour handles information when you visit the site or use its GitHub App.",
    sections: [
      { heading: "Information we process", body: <p>When the GitHub App is installed, we receive the GitHub account and installation identifiers, selected repository names and identifiers, pull request metadata, and changed file content needed to analyse a pull request. We store generated graph documents, diagrams, status information, and identifiers of comments the app posts. If you contact us, we process the details you provide. Hosting providers may record technical request data such as IP addresses and logs.</p> },
      { heading: "Why we use it", body: <p>We use this information to authenticate the GitHub installation, analyse changes, deliver diagrams and comments, prevent duplicate or abusive requests, troubleshoot failures, respond to support requests, and maintain service security. We do not sell repository content or personal information.</p> },
      { heading: "Service providers and AI", body: <p>Contour obtains pull request data from GitHub and sends relevant change information to Google Gemini for analysis. Supabase stores installation and analysis records, Upstash provides queues and temporary processing state, and Vercel hosts the website and application. These providers may process data in other countries under their own terms. If paid billing is introduced through Dodo Payments, Dodo will process checkout, payment, tax, and order information under its own privacy terms; Contour should not receive full payment card details.</p> },
      { heading: "Cookies and site data", body: <p>The public website does not currently use advertising cookies. Our hosting and security providers may use essential cookies or similar technical data to deliver the site and protect it from abuse. If analytics or optional tracking is added later, this policy will be updated and any legally required choice will be offered.</p> },
      { heading: "Retention and deletion", body: <p>Analysis records and diagrams are kept while the related GitHub installation and repository remain connected, unless we remove them earlier. Removing a repository or uninstalling the app triggers deletion of its stored analysis records and assets from the active database. Copies in backups or provider logs may remain for a limited period according to provider retention practices. Contact us to request deletion or ask about a specific record.</p> },
      { heading: "Your choices and rights", body: <p>You control which repositories the GitHub App can access through GitHub settings. You may remove access at any time. Contact us to request access, correction, or deletion of personal information, or to raise a privacy concern. We will handle requests under applicable law.</p> },
      { heading: "Security and changes", body: <p>We use server-side credentials, signed webhook checks, access controls, and encrypted transport. No online service can promise absolute security. We may update this policy as the product or legal requirements change and will show a new update date here.</p> },
    ],
  },
  terms: {
    title: "Terms of service",
    intro: "These terms govern use of the Contour website, GitHub App, and CLI.",
    sections: [
      { heading: "Service and eligibility", body: <p>Contour provides automated pull request diagrams and review assistance. You must have authority to connect a repository and permit analysis of its contents. You remain responsible for reviewing code, security decisions, and any changes made from a Contour report.</p> },
      { heading: "Your content and permissions", body: <p>You retain ownership of your repositories and code. You permit Contour to access selected GitHub repositories, process pull request changes with its service providers, store resulting analysis, and post comments and diagrams for the purpose of delivering the service. Do not connect content you lack permission to share with these providers.</p> },
      { heading: "Acceptable use", body: <p>Do not use Contour to violate law, infringe others' rights, attack the service, bypass access controls, or process content you are not authorized to submit. We may suspend access where necessary to protect the service or others.</p> },
      { heading: "Plans and payment", body: <p>The Free plan has no fee. Paid subscriptions are planned and are not currently available through this website. Before any future purchase, checkout will show the available features, total price, billing interval, tax, trial terms if any, and seller of record. A GitHub App installation by itself does not constitute a paid subscription.</p> },
      { heading: "Cancellation and refunds", body: <p>You may uninstall the GitHub App from GitHub. That stops future access but does not by itself cancel a separate paid subscription. For a paid subscription, use the cancellation method shown at checkout or contact support. Our <Link href="/refunds">refund and cancellation policy</Link> explains the process.</p> },
      { heading: "Availability and limitations", body: <p>We work to keep Contour available but cannot guarantee uninterrupted operation or that generated analysis is complete or error-free. To the extent permitted by applicable law, the service is provided without warranties beyond those expressly stated at purchase. Nothing here limits rights that cannot legally be excluded.</p> },
      { heading: "Changes and contact", body: <p>We may revise these terms with an updated date. Material changes to a paid service should be communicated before they take effect where required. For questions or complaints, <Link href="/contact">contact us</Link>.</p> },
    ],
  },
  refunds: {
    title: "Refund and cancellation policy",
    intro: "Contour is a digital service. This page explains how paid subscription requests are handled.",
    sections: [
      { heading: "Before purchase", body: <p>Contour does not currently accept payments on this website. Installing the free GitHub App does not charge you. When paid subscriptions launch, a subscription will begin only after a separate checkout that shows the price, billing period, any trial, and the seller of record.</p> },
      { heading: "Cancel a subscription", body: <p>Request cancellation using the billing management option provided with your purchase or email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order identifier. We will confirm the request and stop future renewals as soon as the billing provider permits. Unless checkout says otherwise, access continues to the end of the period already paid for. Uninstalling the GitHub App does not cancel billing.</p> },
      { heading: "Request a refund", body: <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> within 14 days of a paid charge, with the order identifier and reason. We will review requests, including duplicate charges, service failure, or accidental renewal, and submit approved refunds through Dodo Payments to the original payment method. Refund eligibility may also be required by applicable consumer law or the seller-of-record terms. The payment provider and bank control the time it takes for funds to appear after approval.</p> },
      { heading: "Disputes", body: <p>Contact us first so we can investigate promptly. You retain any legal right to dispute a charge with your payment provider. We will not request full card details by email.</p> },
    ],
  },
  delivery: {
    title: "Shipping and digital delivery policy",
    intro: "Contour is delivered online; no physical items are shipped.",
    sections: [
      { heading: "Free GitHub App", body: <p>After you install Contour and select repositories in GitHub, eligible pull request events are queued for analysis. Diagrams and review information appear as a comment on the pull request after processing. Processing time depends on GitHub, queue, and AI provider availability.</p> },
      { heading: "Paid access", body: <p>Paid access is not currently sold. When it launches, checkout and confirmation will state when access starts and which features are included. If access does not activate as described, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order identifier so we can resolve it or review a refund.</p> },
      { heading: "Service requirements", body: <p>The hosted service needs an active GitHub account, a valid installation with access to the selected repository, and an internet connection. The CLI requires a supported local runtime. We do not send a physical shipment or tracking number.</p> },
    ],
  },
  security: {
    title: "Security",
    intro: "Contour processes source code changes, so access is limited to the repositories you select.",
    sections: [
      { heading: "Access and processing", body: <p>The GitHub App requests repository and pull request access needed to generate reviews. GitHub installation tokens are short-lived. Webhook signatures are checked before events are processed, and queued worker requests are signed. Server credentials are kept outside the browser bundle.</p> },
      { heading: "Stored information", body: <p>Contour stores installation metadata, generated analysis, and diagram assets in its backend. Asset links require a random access token and stop working when the corresponding analysis or installation is no longer active. Data is transmitted over HTTPS.</p> },
      { heading: "Report a vulnerability", body: <p>Email <a href={`mailto:${supportEmail}?subject=Contour%20security%20report`}>{supportEmail}</a> with a description and steps to reproduce. Please do not include live credentials in the report. We will acknowledge receipt and coordinate a fix.</p> },
      { heading: "Assurance", body: <p>We do not claim a third-party security certification or a guarantee that every vulnerability will be detected by the product.</p> },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(documents).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: documents[slug]?.title ?? "Legal information" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = documents[slug];
  if (!document) notFound();

  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="legal-brand"><ContourLogo size={38} /><span>Contour</span></Link>
        <Link href="/">Back to site</Link>
      </header>
      <article className="legal-content">
        <p className="legal-eyebrow">CONTOUR / INFORMATION</p>
        <h1>{document.title}</h1>
        <p className="legal-intro">{document.intro}</p>
        <p className="legal-date">Last updated {updated}</p>
        {document.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.body}</section>)}
      </article>
      <footer className="legal-footer">
        {Object.entries(documents).map(([path, item]) => <Link key={path} href={`/${path}`}>{item.title}</Link>)}
      </footer>
    </main>
  );
}
