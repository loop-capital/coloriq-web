export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A1A] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-white/60 text-sm mb-8">Last updated: May 11, 2026</p>

        <div className="space-y-8 text-white/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>ColorIq collects information you provide directly, including:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Account information (name, email, password)</li>
              <li>Client hair photos submitted for color analysis</li>
              <li>Color formulations and service records</li>
              <li>Payment information (processed securely through Square)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide AI-powered hair color analysis and formulation</li>
              <li>Process payments and manage your account</li>
              <li>Improve our color matching algorithms</li>
              <li>Send service-related communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Photo Data</h2>
            <p>Client hair photos are used solely for color analysis. Photos are processed securely and are not shared with third parties. You may delete photos at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest. Payment processing is handled by Square and is PCI-DSS compliant.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Square — payment processing</li>
              <li>Supabase — database and authentication</li>
              <li>Cloudflare — media storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
            <p>For privacy questions, contact us at: privacy@getCOLORiq.co</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <a href="/" className="text-purple-400 hover:text-purple-300">← Back to ColorIq</a>
        </div>
      </div>
    </div>
  );
}
