
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import ipaddress
import phonenumbers
from phonenumbers import geocoder, PhoneNumberType
import secrets
import time

app = Flask(__name__)
CORS(app)

GEO_API = "https://ipwho.is/"

# Demo storage: share sessions exist only while this server runs.
# Each session expires after 15 minutes.
share_sessions = {}
SHARE_LIFETIME = 15 * 60


def lookup_ip(ip):
    try:
        parsed = ipaddress.ip_address(ip.strip())
    except (ValueError, AttributeError):
        return None, "Enter a valid IP address."

    if not parsed.is_global:
        return None, "Enter a public IPv4 or IPv6 address."

    try:
        response = requests.get(
            GEO_API + str(parsed),
            timeout=15
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("success"):
            return None, result.get(
                "message", "Geolocation lookup failed."
            )

        latitude = result.get("latitude")
        longitude = result.get("longitude")
        connection = result.get("connection") or {}

        if latitude is None or longitude is None:
            return None, "Coordinates are unavailable for this IP."

        return {
            "ip": result.get("ip", str(parsed)),
            "country": result.get("country"),
            "region": result.get("region"),
            "city": result.get("city"),
            "latitude": latitude,
            "longitude": longitude,
            "isp": connection.get("isp"),
            "organization": connection.get("org")
        }, None

    except requests.RequestException:
        return None, "Geolocation service is temporarily unavailable."


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "IP Tracker API is running"
    })


@app.route("/api/lookup", methods=["POST"])
def public_lookup():
    body = request.get_json(silent=True) or {}
    ip = str(body.get("ip", "")).strip()

    if not ip:
        return jsonify({"error": "Enter an IP address."}), 400

    data, error = lookup_ip(ip)

    if error:
        return jsonify({"error": error}), 400

    return jsonify(data)


@app.route("/api/my-ip")
def my_ip():
    try:
        response = requests.get(
            "https://api.ipify.org?format=json",
            timeout=15
        )
        response.raise_for_status()
        ip = response.json().get("ip")

        if not ip:
            return jsonify({"error": "Public IP was not returned."}), 502

        data, error = lookup_ip(ip)

        if error:
            return jsonify({"error": error}), 502

        return jsonify(data)

    except (requests.RequestException, ValueError):
        return jsonify({
            "error": "Cannot obtain public IP. Check your internet."
        }), 502


# PHONE NUMBER VALIDATION AND METADATA
@app.route("/api/phone-info", methods=["POST"])
def phone_info():
    body = request.get_json(silent=True) or {}
    raw_number = str(body.get("phone", "")).strip()
    default_region = str(body.get("region", "IN")).upper()

    if not raw_number:
        return jsonify({"error": "Enter a phone number."}), 400

    # Use international format such as +919876543210 whenever possible.
    # The default region is used for numbers without a + country code.
    if default_region not in phonenumbers.SUPPORTED_REGIONS:
        default_region = "IN"

    try:
        number = phonenumbers.parse(raw_number, default_region)
    except phonenumbers.NumberParseException:
        return jsonify({
            "error": "Cannot parse this number. Include the country code, e.g. +91."
        }), 400

    possible = phonenumbers.is_possible_number(number)
    valid = phonenumbers.is_valid_number(number)
    region = phonenumbers.region_code_for_number(number)
    number_type = phonenumbers.number_type(number)

    type_names = {
        PhoneNumberType.MOBILE: "Mobile",
        PhoneNumberType.FIXED_LINE: "Fixed line",
        PhoneNumberType.FIXED_LINE_OR_MOBILE: "Fixed line or mobile",
        PhoneNumberType.TOLL_FREE: "Toll-free",
        PhoneNumberType.PREMIUM_RATE: "Premium rate",
        PhoneNumberType.SHARED_COST: "Shared cost",
        PhoneNumberType.VOIP: "VoIP",
        PhoneNumberType.PERSONAL_NUMBER: "Personal number",
        PhoneNumberType.PAGER: "Pager",
        PhoneNumberType.UAN: "Universal access number",
        PhoneNumberType.VOICEMAIL: "Voicemail",
        PhoneNumberType.UNKNOWN: "Unknown"
    }

    return jsonify({
        "input": raw_number,
        "international_format": phonenumbers.format_number(
            number, phonenumbers.PhoneNumberFormat.INTERNATIONAL
        ),
        "valid": valid,
        "possible": possible,
        "country_calling_code": "+" + str(number.country_code),
        "region_code": region or "Unknown",
        "number_type": type_names.get(number_type, "Unknown"),
        "numbering_plan_description": geocoder.description_for_number(
            number, "en"
        ) or "Not available"
    })


# CREATE A TEMPORARY LOCATION-SHARING SESSION
@app.route("/api/share/create", methods=["POST"])
def create_share():
    token = secrets.token_urlsafe(24)

    share_sessions[token] = {
        "expires": time.time() + SHARE_LIFETIME,
        "location": None
    }

    return jsonify({
        "token": token,
        "expires_in_seconds": SHARE_LIFETIME
    })


def get_active_session(token):
    session = share_sessions.get(token)

    if not session:
        return None

    if time.time() > session["expires"]:
        share_sessions.pop(token, None)
        return None

    return session


# CHECK WHETHER A LOCATION HAS BEEN SHARED
@app.route("/api/share/<token>", methods=["GET"])
def get_share(token):
    session = get_active_session(token)

    if not session:
        return jsonify({
            "error": "This sharing link is invalid or expired."
        }), 404

    return jsonify({
        "shared": session["location"] is not None,
        "expires_in_seconds": max(
            0, int(session["expires"] - time.time())
        ),
        "location": session["location"]
    })


# SAVE LOCATION ONLY AFTER THE PHONE OWNER CHOOSES TO SHARE IT
@app.route("/api/share/<token>/location", methods=["POST"])
def submit_shared_location(token):
    session = get_active_session(token)

    if not session:
        return jsonify({
            "error": "This sharing link is invalid or expired."
        }), 404

    body = request.get_json(silent=True) or {}

    try:
        latitude = float(body["latitude"])
        longitude = float(body["longitude"])
        accuracy = float(body["accuracy"])
    except (KeyError, TypeError, ValueError):
        return jsonify({
            "error": "Valid coordinates and accuracy are required."
        }), 400

    if (
        not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
        or not 0 <= accuracy <= 100000
    ):
        return jsonify({"error": "Coordinates are out of range."}), 400

    session["location"] = {
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "shared_at": int(time.time())
    }

    return jsonify({
        "success": True,
        "message": "Location shared successfully."
    })


if __name__ == "__main__":
    # 0.0.0.0 allows access from other devices on the same network.
    # Real phone geolocation generally requires HTTPS.
    app.run(host="0.0.0.0", port=5000, debug=True)
