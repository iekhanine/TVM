import {
  ArrowRight,
  Monitor,
  Check,
  Clock3,
  ExternalLink,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Store,
  Tv,
  Wifi,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

const features = [
  ['No proprietary hardware', 'Use the TVs and displays you already own. If it runs a modern browser, it can run OneTime Menu.', Tv],
  ['Remote menu updates', 'Change a price, hide an item, or mark it sold out from the admin dashboard and displays update automatically.', RefreshCw],
  ['Scheduled dayparts', 'Configure breakfast, lunch, dinner, late-night, happy hour, and event menus around your operating hours.', Clock3],
  ['Multiple screens', 'Run a main counter board, bar display, drive-through board, cafe screen, or another browser-driven display.', MonitorSmartphone],
  ['Browser-native', 'Chrome, Edge, Firefox, Safari, and modern embedded browsers are all the hardware layer you need.', Monitor],
  ['Restaurant-first', 'Built for independent restaurants, bars, coffee shops, breweries, food trucks, and small chains.', Store],
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav shell">
        <BrandMark />
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link to="/admin" className="button button--ghost">Admin Dashboard</Link>
        </nav>
      </header>

      <main>
        <section className="hero shell">
          <div className="hero__copy">
            <span className="pill"><Wifi size={14} /> Browser-powered digital signage</span>
            <h1>Turn any screen into a <em>digital menu board.</em></h1>
            <p className="hero__lede">OneTime Menu turns ordinary browser-enabled TVs and displays into polished restaurant menu boards. No proprietary player box. No special television. No unnecessary hardware lock-in.</p>
            <div className="hero__actions">
              <Link to="/display/main" className="button button--primary">View Demo Menu <ExternalLink size={17} /></Link>
              <Link to="/admin" className="button button--secondary">Open Admin Dashboard <ArrowRight size={17} /></Link>
            </div>
            <div className="hero__proof">
              <span><Check size={15} /> Fullscreen ready</span>
              <span><Check size={15} /> Local-first prototype</span>
              <span><Check size={15} /> 1080p and 4K</span>
            </div>
          </div>

          <div className="hero-screen-wrap" aria-label="Digital menu preview">
            <div className="hero-screen">
              <div className="hero-screen__bar">
                <span></span><span></span><span></span>
                <div>display.copperfork.local/main</div>
              </div>
              <div className="mini-menu">
                <div className="mini-menu__header">
                  <div><b>CF</b><span>THE COPPER FORK</span></div>
                  <small>DINNER • LIVE</small>
                </div>
                <div className="mini-menu__special">MONDAY SMASH & DRAFT <strong>$18</strong></div>
                <div className="mini-menu__grid">
                  <div><h3>BURGERS</h3><p><b>The Copper Burger</b><span>$16.50</span></p><p><b>Firehouse Burger</b><span>$17</span></p></div>
                  <div><h3>ENTREES</h3><p><b>Lake Perch Plate</b><span>$21</span></p><p><b>Braised Short Rib</b><span>$26</span></p></div>
                  <div><h3>DRINKS</h3><p><b>House Lemonade</b><span>$4</span></p><p><b>Cold Brew</b><span>$5</span></p></div>
                </div>
              </div>
            </div>
            <div className="hero-screen__stand" />
          </div>
        </section>

        <section className="browser-strip">
          <div className="shell browser-strip__inner">
            <strong>If it has a modern browser, it can be a menu board.</strong>
            <span>Chrome</span><span>Edge</span><span>Firefox</span><span>Safari</span><span>Embedded WebView</span>
          </div>
        </section>

        <section id="how-it-works" className="section shell">
          <div className="section-heading">
            <span className="eyebrow">No appliance required</span>
            <h2>A digital signage system without the hardware tax.</h2>
            <p>Open a display URL on the restaurant's screen, enter fullscreen mode, and manage the content from another browser.</p>
          </div>
          <div className="steps-grid">
            <article><span>01</span><Tv /><h3>Use your screen</h3><p>Connect any browser-capable TV, mini PC, existing POS display, tablet, or signage computer.</p></article>
            <article><span>02</span><Monitor /><h3>Open the display URL</h3><p>Load the dedicated screen route in Chrome, Edge, Firefox, Safari, or another modern browser.</p></article>
            <article><span>03</span><MonitorSmartphone /><h3>Go fullscreen</h3><p>Press F11 on Windows or use the browser/device fullscreen experience. The menu fills the viewport.</p></article>
            <article><span>04</span><RefreshCw /><h3>Update remotely</h3><p>Change products, pricing, specials, themes, and schedules from the restaurant admin dashboard.</p></article>
          </div>
        </section>

        <section id="features" className="section section--tinted">
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div><span className="eyebrow">Built for real restaurants</span><h2>Simple where it matters. Flexible where it counts.</h2></div>
              <p>OneTime Menu is designed around the operational stuff restaurant teams actually change: prices, availability, specials, dayparts, and screen assignments.</p>
            </div>
            <div className="feature-grid">
              {features.map(([title, text, Icon]) => {
                const FeatureIcon = Icon as typeof Tv;
                return <article key={String(title)}><span><FeatureIcon size={20} /></span><h3>{String(title)}</h3><p>{String(text)}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section className="section shell ownership-section">
          <div>
            <span className="eyebrow">OneTime Labs philosophy</span>
            <h2>Buy software. Own software.</h2>
            <p>OneTime Menu is being built around a simple principle: restaurants should not need a proprietary television, a mystery box behind every screen, or an endless stack of avoidable subscriptions just to show a menu.</p>
            <div className="ownership-points">
              <span><ShieldCheck size={18} /> Open browser delivery model</span>
              <span><ShieldCheck size={18} /> Clean path to self-hosted deployments</span>
              <span><ShieldCheck size={18} /> No artificial device lock-in</span>
            </div>
          </div>
          <aside>
            <small>PRODUCT PRINCIPLE</small>
            <blockquote>“The restaurant should not have to buy special TVs. If a screen can run a modern browser, it can run OneTime Menu.”</blockquote>
            <span>OneTime Labs</span>
          </aside>
        </section>

        <section className="cta-section">
          <div className="shell cta-section__inner">
            <div><span className="eyebrow">Interactive prototype</span><h2>Try the entire workflow right now.</h2><p>Edit a menu, mark an item sold out, publish a special, change the display template, then open the live display.</p></div>
            <div className="cta-section__actions"><Link className="button button--primary" to="/admin">Open Admin Dashboard</Link><Link className="button button--ghost-light" to="/display/main">View Demo Menu</Link></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer shell">
        <BrandMark compact />
        <span>Digital menus. Any screen. No proprietary hardware.</span>
        <small>© 2026 OneTime Labs</small>
      </footer>
    </div>
  );
}
