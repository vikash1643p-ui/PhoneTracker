
import { useState } from "react";
import "./App.css";

const API = "https://phonetracker-sihn.onrender.com/api";
const shareToken = new URLSearchParams(window.location.search).get("share");

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
      if (!response.ok) throw new Error(result.error || "IP lookup failed.");

      setData(result);
      setIp(result.ip);
    } catch (err) {
      setError(err.message);
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
      if (!response.ok) throw new Error(result.error || "IP lookup failed.");

      setData(result);
      setIp(result.ip);
    } catch (err) {
      setError(err.message);
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
      if (!response.ok) throw new Error(result.error || "Phone lookup failed.");

      setPhoneInfo(result);
    } catch (err) {
      setPhoneError(err.message);
    }
  }

  async function createShareLink() {
    setShareError("");
    setShareResult(null);
    setShareLink("");

    try {
      const response = await fetch(`${API}/share/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create link.");

      const link = `${window.location.origin}/?share=${result.token}`;
      setShareLink(link);
    } catch (err) {
      setShareError(
        `${err.message}. Make sure the backend is running and API is reachable.`
      );
    }
  }

  async function checkSharedLocation() {
    setShareError("");
    setShareResult(null);

    try {
      const response = await fetch(`${API}/share/${shareToken}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Could not check link.");

      if (!result.shared) {
        setShareError("No location shared yet. Ask the phone owner to complete sharing.");
      } else {
        setShareResult(result.location);
      }
    } catch (err) {
      setShareError(err.message);
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
            `${API}/share/${shareToken}/location`,
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
          if (!response.ok) throw new Error(result.error || "Sharing failed.");

          setShareError("Location shared successfully. You can close this page.");
        } catch (err) {
          setShareError(err.message);
        } finally {
          setSharing(false);
        }
      },
      (err) => {
        setSharing(false);
        setShareError(
          err.code === 1
            ? "Permission denied. Allow location access if you want to share."
            : "Could not get location. Check device settings and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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

  // A link containing ?share=... opens the phone owner's consent screen.
  if (shareToken) {
    return (
      <main className="app">
        <header className="header">
          <div>
            <p className="eyebrow">CONSENT-BASED SHARING</p>
            <h1>Share Device Location</h1>
            <p className="subtitle">
              Your location will only be shared after you agree and grant permission.
            </p>
          </div>
        </header>

        <section className="panel">
          <label className="consent">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={(e) => setShareConsent(e.target.checked)}
            />
            I agree to share this device's current coordinates with the person
            who gave me this link.
          </label>

          <button
            type="button"
            onClick={shareMyDeviceLocation}
            disabled={!shareConsent || sharing}
          >
            {sharing ? "Getting location..." : "Share My Location"}
          </button>

          {shareError && <p>{shareError}</p>}

          <p className="note">
            You can decline by leaving this page. This demo's sharing link
            expires after 15 minutes.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">NETWORK INTELLIGENCE</p>
          <h1>IP Tracker</h1>
          <p className="subtitle">
            Public IP lookup, phone metadata and consent-based sharing
          </p>
        </div>
        <span className="status">● API Powered</span>
      </header>

      <section className="panel">
        <h2>Public IP Lookup</h2>
        <p>Enter a public IPv4 or IPv6 address.</p>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(ip);
          }}
        >
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Example: 8.8.8.8"
            aria-label="Public IP address"
          />
          <button disabled={loading || !ip.trim()}>Track IP</button>
        </form>

        <div className="visitor">
          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to submit my public IP for an approximate network-location lookup.
          </label>

          <button
            type="button"
            className="secondary"
            onClick={lookupVisitor}
            disabled={loading || !consent}
          >
            Find My Approximate IP Location
          </button>
        </div>

        {loading && <p>Looking up IP...</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {data && (
        <>
          <section className="results">
            <div className="panel">
              <p className="eyebrow">IP ADDRESS</p>
              <h2>{data.ip}</h2>
              <p>Internet Service Provider</p>
              <strong>{data.isp || "Not available"}</strong>
            </div>

            <div className="panel">
              <p className="eyebrow">ESTIMATED IP LOCATION</p>
              <h2>{data.city || "Unknown city"}</h2>
              <p>{[data.region, data.country].filter(Boolean).join(", ")}</p>
              <p>
                Latitude: {data.latitude}
                <br />
                Longitude: {data.longitude}
              </p>
            </div>
          </section>

          <section className="panel">
            <h2>IP Location Map</h2>
            <iframe title="IP location map" src={mapUrl} className="map" loading="lazy" />
            <p className="note">IP-based location is an estimate, not exact GPS.</p>
          </section>
        </>
      )}

      <section className="panel">
        <h2>Phone Number Information</h2>
        <p>
          Enter an international number such as +919876543210.
          This checks number metadata only; it does not track a phone.
        </p>

        <form className="search" onSubmit={lookupPhone}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Example: +919876543210"
            aria-label="Phone number"
          />
          <button type="submit" disabled={!phone.trim()}>Check Number</button>
        </form>

        {phoneError && <p className="error">{phoneError}</p>}

        {phoneInfo && (
          <div>
            <h3>{phoneInfo.international_format}</h3>
            <p>Valid number: {phoneInfo.valid ? "Yes" : "No"}</p>
            <p>Possible number length: {phoneInfo.possible ? "Yes" : "No"}</p>
            <p>Country calling code: {phoneInfo.country_calling_code}</p>
            <p>Region code: {phoneInfo.region_code}</p>
            <p>Number type: {phoneInfo.number_type}</p>
            <p>Numbering-plan description: {phoneInfo.numbering_plan_description}</p>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Share My Location With Consent</h2>
        <p>
          Create a temporary link and send it to the phone owner.
          They must open it and approve location sharing themselves.
        </p>

        <button type="button" onClick={createShareLink}>
          Create Location Sharing Link
        </button>

        {shareLink && (
          <div>
            <p>Send this link to the person who will choose whether to share:</p>
            <input readOnly value={shareLink} aria-label="Location sharing link" />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareLink)}
            >
              Copy Link
            </button>
            <p className="note">The link expires after 15 minutes.</p>
            <button type="button" onClick={checkSharedLocation}>
              Check Shared Location
            </button>
          </div>
        )}

        {shareError && <p className="error">{shareError}</p>}

        {shareResult && (
          <div>
            <h3>Location Shared</h3>
            <p>Latitude: {shareResult.latitude}</p>
            <p>Longitude: {shareResult.longitude}</p>
            <p>Reported accuracy: approximately {Math.round(shareResult.accuracy)} metres</p>
            <iframe title="Shared device location" src={sharedMapUrl} className="map" loading="lazy" />
            <a
              href={`https://www.openstreetmap.org/?mlat=${shareResult.latitude}&mlon=${shareResult.longitude}#map=17/${shareResult.latitude}/${shareResult.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open shared location map
            </a>
          </div>
        )}
      </section>

      <footer>
        IP Tracker · Hackathon Demo · Location sharing requires consent
      </footer>
    </main>
  );
}
