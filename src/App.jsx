import { useState } from "react";
import "./App.css";

const API = "https://phonetracker-sihn.onrender.com/api";
const shareToken = new URLSearchParams(window.location.search).get("share");

function Icon({ name }) {
  const paths = {
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    arrow: <><path d="M7 17 17 7"/><path d="M7 7h10v10"/></>,
    lock: <><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V6a5 5 0 0 1 10 0v4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  };

  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.activity}
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand-mark">
      <Icon name="shield" />
      <span>
        PHONE<span className="brand-accent">TRACKER</span>
        <small>NETWORK INTELLIGENCE</small>
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, detail }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

export default function App() {
  const [ip, setIp] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const [phone, setPhone] = useState("");
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  const [shareLink, setShareLink] = useState("");
  const [shareResult, setShareResult] = useState(null);
  const [shareError, setShareError] = useState("");
  const [shareConsent, setShareConsent] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [activeNav, setActiveNav] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [copied, setCopied] = useState(false);

  async function lookup(ipAddress) {
    if (!ipAddress.trim()) {
      setError("Please enter a public IP address.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(`${API}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ipAddress.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "IP lookup failed.");
      }

      setData(result);
      setIp(result.ip);
      setActiveNav("ip");
    } catch (err) {
      setError(err.message || "IP lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function lookupVisitor() {
    if (!consent) {
      setError("Please accept the consent checkbox first.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(`${API}/my-ip`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "IP lookup failed.");
      }

      setData(result);
      setIp(result.ip);
      setActiveNav("ip");
    } catch (err) {
      setError(err.message || "IP lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function lookupPhone(e) {
    e.preventDefault();
    setPhoneError("");
    setPhoneInfo(null);

    try {
      const response = await fetch(`${API}/phone-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Phone lookup failed.");
      }

      setPhoneInfo(result);
      setActiveNav("phone");
    } catch (err) {
      setPhoneError(err.message || "Phone lookup failed.");
    }
  }

  async function createShareLink() {
    setShareError("");
    setShareResult(null);
    setShareLink("");
    setCopied(false);

    try {
      const response = await fetch(`${API}/share/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create link.");
      }

      setShareLink(`${window.location.origin}/?share=${result.token}`);
      setActiveNav("sharing");
    } catch (err) {
      setShareError(
        `${err.message}. Make sure the backend is running and reachable.`
      );
    }
  }

  async function checkSharedLocation() {
    setShareError("");
    setShareResult(null);

    try {
      if (!shareLink) {
        throw new Error("Create a sharing link first.");
      }

      const tokenToCheck = new URL(shareLink).searchParams.get("share");

      if (!tokenToCheck) {
        throw new Error("Token not found. Please create a new link.");
      }

      const response = await fetch(
        `${API}/share/${encodeURIComponent(tokenToCheck)}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not check the link.");
      }

      if (!result.shared || !result.location) {
        setShareError(
          "Location has not been shared yet. The device owner must open the link and approve location access."
        );
        return;
      }

      setShareResult(result.location);
    } catch (err) {
      setShareError(err.message || "Could not check the sharing link.");
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setShareError(
        "Copy was blocked by the browser. Select the link and copy it manually."
      );
    }
  }

  async function shareMyDeviceLocation() {
    if (!shareConsent) {
      setShareError("Please agree before sharing your location.");
      return;
    }

    if (!navigator.geolocation) {
      setShareError("This browser does not support device location.");
      return;
    }

    setSharing(true);
    setShareError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `${API}/share/${encodeURIComponent(shareToken)}/location`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }),
            }
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Sharing failed.");
          }

          setShareError(
            "Location shared successfully. You can close this page."
          );
        } catch (err) {
          setShareError(err.message || "Sharing failed.");
        } finally {
          setSharing(false);
        }
      },
      (err) => {
        setSharing(false);

        setShareError(
          err.code === 1
            ? "Permission denied. Allow location access only if you want to share."
            : "Could not get location. Check device settings and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }

  const mapUrl = data
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        Number(data.longitude) - 0.05
      }%2C${Number(data.latitude) - 0.03}%2C${
        Number(data.longitude) + 0.05
      }%2C${Number(data.latitude) + 0.03}&layer=mapnik&marker=${
        data.latitude
      }%2C${data.longitude}`
    : "";

  const sharedMapUrl = shareResult
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        shareResult.longitude - 0.01
      }%2C${shareResult.latitude - 0.01}%2C${
        shareResult.longitude + 0.01
      }%2C${shareResult.latitude + 0.01}&layer=mapnik&marker=${
        shareResult.latitude
      }%2C${shareResult.longitude}`
    : "";

  if (shareToken) {
    return (
      <main className="consent-page">
        <div className="consent-orb orb-one" />
        <div className="consent-orb orb-two" />

        <section className="consent-card">
          <Brand />

          <div className="consent-hero-icon">
            <Icon name="pin" />
          </div>

          <p className="eyebrow">SECURE LOCATION REQUEST</p>
          <h1>Share your device location</h1>

          <p className="muted">
            Your location stays private unless you choose to share it.
            Review the request below before continuing.
          </p>

          <div className="privacy-note">
            <Icon name="lock" />
            <span>
              <strong>Your permission is required</strong>
              <small>
                Nothing is shared until you check the consent box and approve
                the browser's location prompt.
              </small>
            </span>
          </div>

          <label className="consent-check">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={(e) => setShareConsent(e.target.checked)}
            />
            <span>
              I agree to share this device's current coordinates with the
              person who sent me this link.
            </span>
          </label>

          <button
            className="btn btn-primary btn-full"
            type="button"
            onClick={shareMyDeviceLocation}
            disabled={!shareConsent || sharing}
          >
            {sharing
              ? "Requesting device location…"
              : "Approve & Share Location"}
            <Icon name="arrow" />
          </button>

          {shareError && (
            <p
              className={
                shareError.includes("successfully")
                  ? "inline-success"
                  : "inline-error"
              }
            >
              {shareError}
            </p>
          )}

          <p className="fine-print">
            You can decline by leaving this page. This demo's sharing link
            expires after 15 minutes.
          </p>
        </section>
      </main>
    );
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: "activity" },
    { id: "ip", label: "IP intelligence", icon: "globe" },
    { id: "phone", label: "Phone metadata", icon: "phone" },
    { id: "sharing", label: "Location sharing", icon: "pin" },
  ];

  function goTo(id) {
    setActiveNav(id);
    setMobileNav(false);

    const target = document.getElementById(
      id === "overview" ? "overview-panel" : `${id}-panel`
    );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${
                activeNav === item.id ? "active" : ""
              }`}
              onClick={() => goTo(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {activeNav === item.id && <i />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-security">
            <div className="security-icon">
              <Icon name="lock" />
            </div>
            <div>
              <strong>Privacy first</strong>
              <small>Consent-based tools</small>
            </div>
            <span className="live-dot" />
          </div>

          <div className="sidebar-version">
            PHONETRACKER <span>v1.0</span>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {navItems.find((n) => n.id === activeNav)?.label || "Overview"}
            </strong>
          </div>

          <div className="topbar-right">
            <span className="api-pill">
              <i /> API CONNECTED
            </span>
            <div className="avatar">PT</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row" id="overview-panel">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line" />
                NETWORK INTELLIGENCE PLATFORM
              </p>

              <h1>
                Good day. <span>Stay one step ahead.</span>
              </h1>

              <p className="welcome-subtitle">
                Explore network location estimates and secure, consent-based
                sharing from one workspace.
              </p>
            </div>

            <div className="date-chip">
              <span className="date-pulse" />
              SYSTEM ONLINE <span className="date-divider" /> LIVE API
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              icon="globe"
              label="IP INTELLIGENCE"
              value="IPv4 / IPv6"
              detail="Public address lookup"
            />

            <StatCard
              icon="phone"
              label="PHONE METADATA"
              value="Number insights"
              detail="Validation & region info"
            />

            <StatCard
              icon="pin"
              label="LOCATION SHARING"
              value="Consent based"
              detail="15-minute temporary link"
            />
          </section>

          <section className="panel panel-feature" id="ip-panel">
            <div className="panel-heading">
              <div className="panel-heading-icon">
                <Icon name="globe" />
              </div>

              <div>
                <p className="eyebrow">01 / NETWORK LOOKUP</p>
                <h2>IP intelligence</h2>
                <p className="panel-description">
                  Look up the approximate geographic region associated with a
                  public IP address.
                </p>
              </div>

              <span className="section-tag">IPWHO.IS</span>
            </div>

            <form
              className="lookup-form"
              onSubmit={(e) => {
                e.preventDefault();
                lookup(ip);
              }}
            >
              <label htmlFor="ip-input">PUBLIC IP ADDRESS</label>

              <div className="input-action-row">
                <div className="input-wrap">
                  <Icon name="search" />
                  <input
                    id="ip-input"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="Enter an IP address, e.g. 8.8.8.8"
                    aria-label="Public IP address"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  disabled={loading || !ip.trim()}
                >
                  {loading ? "Looking up…" : "Lookup IP"}
                  <Icon name="arrow" />
                </button>
              </div>
            </form>

            <div className="consent-strip">
              <label className="consent-check compact">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I consent to submitting my public IP for an approximate
                  location lookup.
                </span>
              </label>

              <button
                className="btn btn-outline"
                onClick={lookupVisitor}
                disabled={loading || !consent}
              >
                Find my IP <Icon name="arrow" />
              </button>
            </div>

            {loading && (
              <div className="loading-line">
                <span /> Querying geolocation service…
              </div>
            )}

            {error && <p className="inline-error">{error}</p>}

            {data && (
              <div className="lookup-results">
                <div className="result-heading">
                  <div>
                    <p className="eyebrow">LOOKUP RESULT</p>
                    <h3>
                      {data.city || "Unknown city"}
                      <span className="result-country">
                        {[data.region, data.country].filter(Boolean).join(", ")}
                      </span>
                    </h3>
                  </div>

                  <span className="result-badge">
                    <i /> RESULT READY
                  </span>
                </div>

                <div className="result-grid">
                  <div className="result-metric">
                    <small>PUBLIC IP</small>
                    <strong>{data.ip}</strong>
                  </div>

                  <div className="result-metric">
                    <small>INTERNET PROVIDER</small>
                    <strong>{data.isp || "Not available"}</strong>
                  </div>

                  <div className="result-metric">
                    <small>LATITUDE</small>
                    <strong>{data.latitude}</strong>
                  </div>

                  <div className="result-metric">
                    <small>LONGITUDE</small>
                    <strong>{data.longitude}</strong>
                  </div>
                </div>

                <div className="map-header">
                  <span><Icon name="pin" /> Approximate location map</span>
                  <span>OPENSTREETMAP</span>
                </div>

                <iframe
                  title="IP location map"
                  src={mapUrl}
                  className="map"
                  loading="lazy"
                />

                <p className="fine-print">
                  IP-based location is an estimate and is not the same as
                  exact GPS location.
                </p>
              </div>
            )}
          </section>

          <section className="panel" id="phone-panel">
            <div className="panel-heading">
              <div className="panel-heading-icon violet">
                <Icon name="phone" />
              </div>

              <div>
                <p className="eyebrow">02 / NUMBERING PLAN</p>
                <h2>Phone number metadata</h2>
                <p className="panel-description">
                  Check number format, validity, calling code and
                  numbering-region details.
                </p>
              </div>

              <span className="section-tag">METADATA ONLY</span>
            </div>

            <form className="lookup-form" onSubmit={lookupPhone}>
              <label htmlFor="phone-input">INTERNATIONAL PHONE NUMBER</label>

              <div className="input-action-row">
                <div className="input-wrap">
                  <Icon name="phone" />
                  <input
                    id="phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Example: +919876543210"
                    aria-label="Phone number"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!phone.trim()}
                >
                  Check number <Icon name="arrow" />
                </button>
              </div>
            </form>

            {phoneError && <p className="inline-error">{phoneError}</p>}

            {phoneInfo && (
              <div className="phone-results">
                <div className="phone-result-top">
                  <div>
                    <p className="eyebrow">NUMBER ANALYSIS</p>
                    <h3>{phoneInfo.international_format}</h3>
                  </div>

                  <span
                    className={`validity ${
                      phoneInfo.valid ? "is-valid" : "is-invalid"
                    }`}
                  >
                    {phoneInfo.valid ? "VALID NUMBER" : "CHECK NUMBER"}
                  </span>
                </div>

                <div className="result-grid">
                  <div className="result-metric">
                    <small>VALID NUMBER</small>
                    <strong>{phoneInfo.valid ? "Yes" : "No"}</strong>
                  </div>

                  <div className="result-metric">
                    <small>POSSIBLE LENGTH</small>
                    <strong>{phoneInfo.possible ? "Yes" : "No"}</strong>
                  </div>

                  <div className="result-metric">
                    <small>CALLING CODE</small>
                    <strong>{phoneInfo.country_calling_code}</strong>
                  </div>

                  <div className="result-metric">
                    <small>REGION CODE</small>
                    <strong>{phoneInfo.region_code}</strong>
                  </div>

                  <div className="result-metric">
                    <small>NUMBER TYPE</small>
                    <strong>{phoneInfo.number_type}</strong>
                  </div>

                  <div className="result-metric">
                    <small>REGION DESCRIPTION</small>
                    <strong>{phoneInfo.numbering_plan_description}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="notice-strip">
              <Icon name="lock" />
              <p>
                <strong>Privacy note</strong>
                <span>
                  Phone-number metadata does not reveal a person's live
                  location and this tool does not track phones.
                </span>
              </p>
            </div>
          </section>

          <section className="panel" id="sharing-panel">
            <div className="panel-heading">
              <div className="panel-heading-icon pink">
                <Icon name="pin" />
              </div>

              <div>
                <p className="eyebrow">03 / PERMISSION-BASED</p>
                <h2>Secure location sharing</h2>
                <p className="panel-description">
                  Generate a temporary request link. The device owner decides
                  whether to share.
                </p>
              </div>

              <span className="section-tag">15 MIN TTL</span>
            </div>

            <div className="sharing-steps">
              <div className="sharing-step">
                <span>01</span>
                <div>
                  <strong>Create a link</strong>
                  <small>Generate a temporary request</small>
                </div>
              </div>

              <div className="step-connector" />

              <div className="sharing-step">
                <span>02</span>
                <div>
                  <strong>Owner approves</strong>
                  <small>Consent + browser permission</small>
                </div>
              </div>

              <div className="step-connector" />

              <div className="sharing-step">
                <span>03</span>
                <div>
                  <strong>View shared result</strong>
                  <small>Only after permission</small>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="button"
              onClick={createShareLink}
            >
              <Icon name="lock" />
              Create sharing link
              <Icon name="arrow" />
            </button>

            {shareLink && (
              <div className="share-link-box">
                <div className="share-link-title">
                  <div>
                    <strong>Temporary request link ready</strong>
                    <small>
                      Send this link to the device owner. It expires after
                      15 minutes.
                    </small>
                  </div>

                  <span className="result-badge">
                    <i /> ACTIVE
                  </span>
                </div>

                <div className="share-link-input">
                  <input
                    readOnly
                    value={shareLink}
                    aria-label="Location sharing link"
                  />

                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={copyShareLink}
                  >
                    <Icon name="copy" />
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>

                <button
                  className="btn btn-outline check-location"
                  type="button"
                  onClick={checkSharedLocation}
                >
                  Check shared location <Icon name="arrow" />
                </button>
              </div>
            )}

            {shareError && (
              <p
                className={
                  shareError.includes("successfully")
                    ? "inline-success"
                    : "inline-error"
                }
              >
                {shareError}
              </p>
            )}

            {shareResult && (
              <div className="lookup-results">
                <div className="result-heading">
                  <div>
                    <p className="eyebrow">CONSENTED LOCATION</p>
                    <h3>
                      Location shared
                      <span className="result-country">
                        Device owner approved sharing
                      </span>
                    </h3>
                  </div>

                  <span className="result-badge">
                    <i /> RECEIVED
                  </span>
                </div>

                <div className="result-grid">
                  <div className="result-metric">
                    <small>LATITUDE</small>
                    <strong>{shareResult.latitude}</strong>
                  </div>

                  <div className="result-metric">
                    <small>LONGITUDE</small>
                    <strong>{shareResult.longitude}</strong>
                  </div>

                  <div className="result-metric">
                    <small>REPORTED ACCURACY</small>
                    <strong>~{Math.round(shareResult.accuracy)} metres</strong>
                  </div>

                  <div className="result-metric">
                    <small>SHARED AT</small>
                    <strong>
                      {new Date(
                        shareResult.shared_at * 1000
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="map-header">
                  <span><Icon name="pin" /> Shared device location</span>
                  <span>OPENSTREETMAP</span>
                </div>

                <iframe
                  title="Shared device location"
                  src={sharedMapUrl}
                  className="map"
                  loading="lazy"
                />

                <a
                  className="external-link"
                  href={`https://www.openstreetmap.org/?mlat=${shareResult.latitude}&mlon=${shareResult.longitude}#map=17/${shareResult.latitude}/${shareResult.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full map <Icon name="arrow" />
                </a>
              </div>
            )}

            <div className="notice-strip">
              <Icon name="lock" />
              <p>
                <strong>Consent is required</strong>
                <span>
                  The link recipient must open the link, agree, and allow
                  location access. No silent tracking is performed.
                </span>
              </p>
            </div>
          </section>

          <footer className="page-footer">
            <span>© PhoneTracker · Network intelligence demo</span>
            <span>
              <i /> API-powered workspace <b>·</b> Privacy-first by design
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}