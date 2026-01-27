import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold">Final Note</div>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Your Final Words,<br />
          <span className="text-blue-400">Delivered When It Matters</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
          Final Note is a secure dead man&apos;s switch that ensures your important messages
          reach your loved ones only when verified they need to. Privacy-first,
          with optional human verification.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors"
          >
            Create Your First Switch
          </Link>
          <Link
            href="#how-it-works"
            className="px-8 py-4 border border-gray-600 hover:border-gray-400 rounded-lg text-lg transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Why Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Why Final Note?</h2>
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur">
            <p className="text-lg text-gray-300 leading-relaxed">
              Life is unpredictable. If something happens to you, there may be things you wish
              you had told your loved ones, friends, or colleagues—final thoughts, instructions,
              or even practical matters like pet care. Final Note helps you ensure your important
              messages are delivered, even if you can&apos;t send them yourself.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-gray-800/50 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✍️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Write Your Messages</h3>
            <p className="text-gray-400">
              Create private, encrypted messages for each of your chosen recipients.
              Each person gets their own personal note.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏰</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Regular Check-ins</h3>
            <p className="text-gray-400">
              Set your check-in interval (days to years). You&apos;ll receive gentle
              reminders to confirm you&apos;re okay. One click to check in.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Verified Delivery</h3>
            <p className="text-gray-400">
              If you don&apos;t respond, trusted verifiers (optional) confirm your status
              before messages are sent. No accidental triggers.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Built for Safety</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-gray-800/30 rounded-lg p-5">
            <h3 className="font-semibold mb-2">🔒 End-to-End Encrypted</h3>
            <p className="text-sm text-gray-400">Messages are encrypted and only decrypted at delivery time</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-5">
            <h3 className="font-semibold mb-2">👥 Human Verification</h3>
            <p className="text-sm text-gray-400">Optional trusted verifiers prevent accidental triggers</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-5">
            <h3 className="font-semibold mb-2">📋 Complete Audit Trail</h3>
            <p className="text-sm text-gray-400">Every action is logged for transparency</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-5">
            <h3 className="font-semibold mb-2">🛡️ Safety First</h3>
            <p className="text-sm text-gray-400">Multiple safeguards prevent premature delivery</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-blue-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Create your free account and set up your first dead man&apos;s switch in minutes.
            Your messages, your rules, your peace of mind.
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400">
            © {new Date().getFullYear()} Final Note. Open Source.
          </div>
          <div className="flex gap-6 text-gray-400">
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/auth/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
