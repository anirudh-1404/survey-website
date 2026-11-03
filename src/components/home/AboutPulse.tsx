import { Vote, Compass, MessageSquare } from "lucide-react";

export function AboutPulse() {
  const values = [
    {
      title: "Vote on the issues",
      description: "Participate in public polls on current topics.",
      icon: Vote,
    },
    {
      title: "Explore perspectives",
      description: "See poll results and understand how opinions differ.",
      icon: Compass,
    },
    {
      title: "Join the discussion",
      description: "Share arguments, reply to others, and contribute respectfully.",
      icon: MessageSquare,
    },
  ];

  return (
    <section id="about-pulse" className="border-t border-white/10 py-16 lg:py-20 bg-[#090b10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            A clearer view of public opinion.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
            SayNow brings people together to vote on important issues, explore different perspectives,
            and take part in meaningful public discussions. Every poll invites participation,
            while live citizen chats help surface the reasoning behind different viewpoints.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {values.map((val) => {
            const Icon = val.icon;
            return (
              <div
                key={val.title}
                className="flex flex-col items-center text-center rounded-xl border border-white/10 bg-[#11131c] p-7 transition-colors hover:border-white/20"
              >
                <div className="rounded-lg bg-white/5 p-3 text-rose-400 border border-white/5 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {val.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
