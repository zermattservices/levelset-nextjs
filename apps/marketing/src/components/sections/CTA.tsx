import { WaitlistForm } from '@/components/forms/WaitlistForm';

export function CTA() {
  return (
    <section className="py-24 md:py-32 bg-[#1e3f2e] relative overflow-hidden">
      {/* Background depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #264D38 0%, #1a3d2d 40%, #162e23 100%)',
        }}
      />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#31664A]/10 blur-3xl" />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to ditch the spreadsheets?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Join the waitlist and be among the first Chick-fil-A operators to run their team on Levelset.
          </p>
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/20 w-full max-w-md">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
