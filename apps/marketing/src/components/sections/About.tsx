export function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-white">
      <div className="max-w-content mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-5">
            Your operations playbook, finally in one place.
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            You already know how you want to run your restaurant. Levelset takes
            your positions, your standards, and your discipline process and puts
            them into a connected platform your whole leadership team can use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative p-8 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
              Rate by Position, Not by Gut Feel
            </h3>
            <p className="text-text-secondary leading-relaxed text-[15px]">
              Every team member gets rated on every position they work. Your leadership
              team sees exactly who&apos;s ready, who&apos;s improving, and where to focus
              coaching &mdash; backed by real data instead of memory.
            </p>
          </div>

          <div className="relative p-8 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
              Your Discipline Process, Applied Consistently
            </h3>
            <p className="text-text-secondary leading-relaxed text-[15px]">
              Bring your existing discipline framework into Levelset. The system tracks
              infractions over time and automatically recommends the right next step based
              on your rules &mdash; so every leader handles accountability the same way.
            </p>
          </div>

          <div className="relative p-8 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
              One Roster for Your Entire Team
            </h3>
            <p className="text-text-secondary leading-relaxed text-[15px]">
              Every team member&apos;s details, position eligibility, pay, and
              history in a single system. No more digging through spreadsheets
              or binders to find what you need.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
