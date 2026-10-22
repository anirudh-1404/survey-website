import { Scale, Fingerprint, LineChart } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Neutral Editorial Framing",
      description:
        "Every question is formulated by non-partisan researchers following strict anti-bias guidelines, complete with objective context and verified sources.",
      icon: Scale,
    },
    {
      step: "02",
      title: "Verified Human Participation",
      description:
        "Our voting pipeline uses multi-factor verification to deter automated bots and brigading, ensuring high-integrity public opinion metrics.",
      icon: Fingerprint,
    },
    {
      step: "03",
      title: "Open Sentiment Analytics",
      description:
        "Explore real-time data breakdowns, statistical significance indicators, and moderated civil arguments from diverse perspectives.",
      icon: LineChart,
    },
  ];

  return (
    <section id="how-it-works" className="border-t border-white/10 py-16 lg:py-24 bg-[#090b10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xs font-bold tracking-widest text-rose-400 uppercase">
            Rigorous Civic Polling
          </h2>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            How PULSE measures verified public opinion
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-300">
            A credible opinion platform requires editorial neutrality, robust bot defense,
            and complete analytical transparency.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-xl border border-white/10 bg-[#11131c] p-8 transition-colors hover:border-white/20"
              >
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <span className="font-mono text-2xl font-black text-rose-500/80">
                    {item.step}
                  </span>
                  <div className="rounded-lg bg-white/5 p-2.5 text-zinc-300 border border-white/5">
                    <Icon className="h-5 w-5 text-rose-400" />
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
