import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/20 via-transparent to-transparent" />

        <div className="relative z-10 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              PYrte Radio Shack
            </span>
          </h1>

          <p className="mb-8 text-xl text-text-secondary md:text-2xl">
            AI-Powered Community Radio
          </p>

          <p className="mx-auto mb-12 max-w-2xl text-lg text-text-tertiary">
            Submit music prompts via WhatsApp or Telegram. Our AI generates your tracks
            and broadcasts them on genre-specific radio channels. Join thousands of
            listeners creating music together.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/browse"
              className="button rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-black transition-all hover:bg-brand-primaryHover hover:shadow-glow-primary"
            >
              Browse Channels
            </Link>

            <Link
              href="/dashboard"
              className="button glass rounded-full px-8 py-4 text-lg font-semibold transition-all hover:bg-glass-heavy"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass rounded-xl p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/20 text-2xl">
                📱
              </div>
              <h3 className="mb-3 text-xl font-semibold">Submit Prompts</h3>
              <p className="text-text-secondary">
                Send music generation prompts via WhatsApp or Telegram. Describe the
                vibe, genre, and mood you want.
              </p>
            </div>

            <div className="glass rounded-xl p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/20 text-2xl">
                🎵
              </div>
              <h3 className="mb-3 text-xl font-semibold">AI Generation</h3>
              <p className="text-text-secondary">
                Our AI (powered by Suno) generates your track. Content moderation
                ensures quality and appropriateness.
              </p>
            </div>

            <div className="glass rounded-xl p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/20 text-2xl">
                📻
              </div>
              <h3 className="mb-3 text-xl font-semibold">Live Broadcast</h3>
              <p className="text-text-secondary">
                Your track enters the queue and plays on the appropriate genre channel.
                Listeners worldwide hear your creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="glass mx-auto max-w-4xl rounded-2xl p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Create?</h2>
          <p className="mb-8 text-lg text-text-secondary">
            Join our community of music creators and listeners. Start broadcasting your
            AI-generated tracks today.
          </p>
          <Link
            href="/signup"
            className="button inline-block rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-black transition-all hover:bg-brand-primaryHover hover:shadow-glow-primary"
          >
            Sign Up Free
          </Link>
        </div>
      </section>
    </main>
  );
}
